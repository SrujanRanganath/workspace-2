"""
Generation API routes — /api/v1/projects/{project_id}/generation
Handles Specification, Planning, Code Generation, and Run History.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import json

from auth.dependencies import get_current_user
from database import get_db
from models.user import User
from models.project import Project, ProjectStatus
from models.requirement import Requirement
from models.artifact import Artifact, ArtifactStatus, ArtifactType
from models.generation_run import GenerationRun, RunStatus
from services.llm import get_llm_provider
from services.pipeline import (
    generate_specification_pipeline,
    generate_specification_with_meta,
    generate_plan_pipeline,
    generate_artifacts_pipeline,
)
from api.schemas import (
    SpecificationGenerateRequest,
    SpecificationResponse,
    PlanGenerateRequest,
    PlanResponse,
    GenerationRunResponse,
    GenerationRunListResponse,
    ArtifactResponse,
)

router = APIRouter(prefix="/api/v1/projects/{project_id}", tags=["Generation"])


def _get_user_project(project_id: int, user_id: int, db: Session) -> Project:
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.user_id == user_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    return project


@router.post("/specification", response_model=SpecificationResponse)
def generate_specification(
    project_id: int,
    request: SpecificationGenerateRequest = SpecificationGenerateRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _get_user_project(project_id, current_user.id, db)

    # Get target requirement
    if request.requirement_id:
        req = db.query(Requirement).filter(Requirement.id == request.requirement_id, Requirement.project_id == project.id).first()
    else:
        req = db.query(Requirement).filter(Requirement.project_id == project.id).order_by(Requirement.id.desc()).first()

    if not req:
        raise HTTPException(status_code=400, detail="A requirement must be submitted before generating specification.")

    structured_data = req.structured or {"functional_requirements": [req.raw_text]}

    provider = get_llm_provider()
    run = GenerationRun(
        project_id=project.id,
        operation="specification_generation",
        status=RunStatus.RUNNING.value,
        provider=provider.provider_name(),
        model=provider.model_name(),
        input_metadata={"requirement_id": req.id},
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    try:
        spec, mode, llm_error = generate_specification_with_meta(project.name, structured_data)

        if mode == "deterministic_offline_synthesizer":
            run.provider = "deterministic_offline_synthesizer"
            run.model = "rule_based_domain_synthesizer"

        # Persist as artifact (update existing or create new)
        now = datetime.now(timezone.utc)
        existing_spec = (
            db.query(Artifact)
            .filter(Artifact.project_id == project.id, Artifact.name == "specification.json")
            .order_by(Artifact.id.desc())
            .first()
        )
        if existing_spec:
            existing_spec.content = json.dumps(spec, indent=2)
            existing_spec.generation_run_id = run.id
            existing_spec.requirement_id = req.id
            existing_spec.version += 1
            existing_spec.status = ArtifactStatus.GENERATED.value
            if not existing_spec.created_at:
                existing_spec.created_at = now
            existing_spec.updated_at = now
            # Clean up any older stale duplicates
            for stale in db.query(Artifact).filter(
                Artifact.project_id == project.id,
                Artifact.name == "specification.json",
                Artifact.id != existing_spec.id
            ).all():
                db.delete(stale)
        else:
            artifact = Artifact(
                project_id=project.id,
                generation_run_id=run.id,
                requirement_id=req.id,
                artifact_type=ArtifactType.DOCUMENTATION.value,
                name="specification.json",
                path="docs/SPECIFICATION.json",
                content=json.dumps(spec, indent=2),
                status=ArtifactStatus.GENERATED.value,
                version=1,
                created_at=now,
                updated_at=now,
            )
            db.add(artifact)
        project.status = ProjectStatus.PLANNING.value

        run.status = RunStatus.COMPLETED.value
        run.completed_at = datetime.now(timezone.utc)
        run.output_metadata = {
            "mode": mode,
            "llm_error": llm_error,
            "schema_tables": len(spec.get("database_schema", [])),
            "api_endpoints": len(spec.get("api_contract", [])),
        }
        db.commit()

        return SpecificationResponse(
            project_id=project.id,
            requirement_id=req.id,
            specification=spec,
            generation_run_id=run.id,
        )
    except Exception as e:
        run.status = RunStatus.FAILED.value
        run.error = str(e)
        run.completed_at = datetime.now(timezone.utc)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Specification generation failed: {str(e)}")


@router.get("/specification")
def get_specification(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _get_user_project(project_id, current_user.id, db)
    art = (
        db.query(Artifact)
        .filter(Artifact.project_id == project.id, Artifact.name == "specification.json")
        .order_by(Artifact.id.desc())
        .first()
    )
    if not art or not art.content:
        raise HTTPException(status_code=404, detail="No specification found for this project.")
    return json.loads(art.content)


@router.post("/plan", response_model=PlanResponse)
def generate_plan(
    project_id: int,
    request: PlanGenerateRequest = PlanGenerateRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _get_user_project(project_id, current_user.id, db)

    # Fetch latest specification artifact
    art = (
        db.query(Artifact)
        .filter(Artifact.project_id == project.id, Artifact.name == "specification.json")
        .order_by(Artifact.id.desc())
        .first()
    )
    spec = json.loads(art.content) if (art and art.content) else {"project_name": project.name}

    provider = get_llm_provider()
    run = GenerationRun(
        project_id=project.id,
        operation="implementation_planning",
        status=RunStatus.RUNNING.value,
        provider=provider.provider_name(),
        model=provider.model_name(),
        input_metadata={"has_spec": bool(art)},
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    try:
        plan = generate_plan_pipeline(project.name, spec)

        now = datetime.now(timezone.utc)
        existing_plan = (
            db.query(Artifact)
            .filter(Artifact.project_id == project.id, Artifact.name == "implementation_plan.json")
            .order_by(Artifact.id.desc())
            .first()
        )
        if existing_plan:
            existing_plan.content = json.dumps(plan, indent=2)
            existing_plan.generation_run_id = run.id
            existing_plan.requirement_id = art.requirement_id if art else None
            existing_plan.version += 1
            existing_plan.status = ArtifactStatus.GENERATED.value
            if not existing_plan.created_at:
                existing_plan.created_at = now
            existing_plan.updated_at = now
            for stale in db.query(Artifact).filter(
                Artifact.project_id == project.id,
                Artifact.name == "implementation_plan.json",
                Artifact.id != existing_plan.id
            ).all():
                db.delete(stale)
        else:
            plan_artifact = Artifact(
                project_id=project.id,
                generation_run_id=run.id,
                artifact_type=ArtifactType.DOCUMENTATION.value,
                name="implementation_plan.json",
                path="docs/IMPLEMENTATION_PLAN.json",
                content=json.dumps(plan, indent=2),
                requirement_id=art.requirement_id if art else None,
                status=ArtifactStatus.GENERATED.value,
                version=1,
                created_at=now,
                updated_at=now,
            )
            db.add(plan_artifact)
        project.status = ProjectStatus.BUILDING.value

        run.status = RunStatus.COMPLETED.value
        run.completed_at = datetime.now(timezone.utc)
        run.output_metadata = {"phases": len(plan.get("phases", []))}
        db.commit()

        return PlanResponse(
            project_id=project.id,
            plan=plan,
            generation_run_id=run.id,
        )
    except Exception as e:
        run.status = RunStatus.FAILED.value
        run.error = str(e)
        run.completed_at = datetime.now(timezone.utc)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Planning generation failed: {str(e)}")


@router.get("/plan")
def get_plan(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _get_user_project(project_id, current_user.id, db)
    art = (
        db.query(Artifact)
        .filter(Artifact.project_id == project.id, Artifact.name == "implementation_plan.json")
        .order_by(Artifact.id.desc())
        .first()
    )
    if not art or not art.content:
        raise HTTPException(status_code=404, detail="No implementation plan found for this project.")
    return json.loads(art.content)


@router.post("/generate", response_model=List[ArtifactResponse])
def generate_all_artifacts(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Triggers multi-artifact generation across all 5 tiers:
    Database, Backend, Frontend, Tests, Documentation.
    """
    project = _get_user_project(project_id, current_user.id, db)

    # Load requirement and specification
    req = db.query(Requirement).filter(Requirement.project_id == project.id).order_by(Requirement.id.desc()).first()
    spec_art = db.query(Artifact).filter(Artifact.project_id == project.id, Artifact.name == "specification.json").order_by(Artifact.id.desc()).first()

    structured = req.structured if (req and req.structured) else {"actors": ["User"], "functional_requirements": [project.name]}
    spec = json.loads(spec_art.content) if (spec_art and spec_art.content) else {"project_name": project.name}

    try:
        provider = get_llm_provider()
        prov_name = provider.provider_name()
        mod_name = provider.model_name()
    except Exception:
        prov_name = "offline_pipeline"
        mod_name = "deterministic_synthesizer"

    run = GenerationRun(
        project_id=project.id,
        operation="multi_artifact_generation",
        status=RunStatus.RUNNING.value,
        provider=prov_name,
        model=mod_name,
        input_metadata={"requirement_id": req.id if req else None},
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    try:
        generated_manifest = generate_artifacts_pipeline(project.name, structured, spec)
        created_artifacts = []
        now = datetime.now(timezone.utc)

        for item in generated_manifest:
            # Check if artifact with same name exists, update version or create
            existing = (
                db.query(Artifact)
                .filter(Artifact.project_id == project.id, Artifact.name == item["name"])
                .order_by(Artifact.id.desc())
                .first()
            )
            if existing:
                existing.content = item["content"]
                existing.version += 1
                existing.generation_run_id = run.id
                existing.status = ArtifactStatus.GENERATED.value
                if not existing.created_at:
                    existing.created_at = now
                existing.updated_at = now
                created_artifacts.append(existing)
                # Clean up any duplicate rows with same name
                for dupe in db.query(Artifact).filter(
                    Artifact.project_id == project.id,
                    Artifact.name == item["name"],
                    Artifact.id != existing.id
                ).all():
                    db.delete(dupe)
            else:
                art = Artifact(
                    project_id=project.id,
                    generation_run_id=run.id,
                    requirement_id=req.id if req else None,
                    artifact_type=item["artifact_type"],
                    name=item["name"],
                    path=item["path"],
                    content=item["content"],
                    status=ArtifactStatus.GENERATED.value,
                    version=1,
                    created_at=now,
                    updated_at=now,
                )
                db.add(art)
                created_artifacts.append(art)

        project.status = ProjectStatus.VALIDATING.value
        run.status = RunStatus.COMPLETED.value
        run.completed_at = datetime.now(timezone.utc)
        run.output_metadata = {"generated_artifacts_count": len(created_artifacts)}
        db.commit()

        for a in created_artifacts:
            db.refresh(a)
            if a.created_at is None:
                a.created_at = a.updated_at or datetime.now(timezone.utc)
            if a.updated_at is None:
                a.updated_at = a.created_at or datetime.now(timezone.utc)

        return created_artifacts
    except Exception as e:
        run.status = RunStatus.FAILED.value
        run.error = str(e)
        run.completed_at = datetime.now(timezone.utc)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Artifact generation failed: {str(e)}")


@router.get("/runs", response_model=GenerationRunListResponse)
def list_generation_runs(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _get_user_project(project_id, current_user.id, db)
    runs = (
        db.query(GenerationRun)
        .filter(GenerationRun.project_id == project.id)
        .order_by(GenerationRun.started_at.desc())
        .all()
    )
    return GenerationRunListResponse(runs=runs, total=len(runs))
