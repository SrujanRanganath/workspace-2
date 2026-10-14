"""
Requirement API routes — /api/v1/projects/{project_id}/requirements
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from auth.dependencies import get_current_user
from database import get_db
from models.user import User
from models.project import Project, ProjectStatus
from models.requirement import Requirement
from models.generation_run import GenerationRun, RunStatus
from services.llm import get_llm_provider
from services.pipeline import analyze_requirement_pipeline, analyze_requirement_with_meta
from api.schemas import (
    RequirementCreate,
    RequirementUpdate,
    RequirementResponse,
    RequirementAnalyzeRequest,
    RequirementAnalyzeResponse,
    StructuredRequirement,
)

router = APIRouter(prefix="/api/v1/projects/{project_id}/requirements", tags=["Requirements"])


def _get_user_project(project_id: int, user_id: int, db: Session) -> Project:
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.user_id == user_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    return project


@router.post("", response_model=RequirementResponse, status_code=status.HTTP_201_CREATED)
def create_requirement(
    project_id: int,
    request: RequirementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _get_user_project(project_id, current_user.id, db)

    req = Requirement(
        project_id=project.id,
        raw_text=request.raw_text,
        status="draft",
        version=1,
    )
    db.add(req)
    project.status = ProjectStatus.REQUIREMENTS.value
    db.commit()
    db.refresh(req)
    return req


@router.get("", response_model=List[RequirementResponse])
def list_requirements(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _get_user_project(project_id, current_user.id, db)
    return (
        db.query(Requirement)
        .filter(Requirement.project_id == project.id)
        .order_by(Requirement.created_at.desc())
        .all()
    )


@router.get("/{requirement_id}", response_model=RequirementResponse)
def get_requirement(
    project_id: int,
    requirement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _get_user_project(project_id, current_user.id, db)
    req = (
        db.query(Requirement)
        .filter(Requirement.id == requirement_id, Requirement.project_id == project.id)
        .first()
    )
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found.")
    return req


@router.post("/analyze", response_model=RequirementAnalyzeResponse)
def analyze_requirement(
    project_id: int,
    request: RequirementAnalyzeRequest = RequirementAnalyzeRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _get_user_project(project_id, current_user.id, db)

    # Fetch requirement to analyze
    if request.requirement_id:
        req = (
            db.query(Requirement)
            .filter(Requirement.id == request.requirement_id, Requirement.project_id == project.id)
            .first()
        )
    else:
        req = (
            db.query(Requirement)
            .filter(Requirement.project_id == project.id)
            .order_by(Requirement.id.desc())
            .first()
        )

    if not req:
        raise HTTPException(status_code=404, detail="No requirement found to analyze.")

    provider = get_llm_provider()
    run = GenerationRun(
        project_id=project.id,
        operation="requirement_analysis",
        status=RunStatus.RUNNING.value,
        provider=provider.provider_name(),
        model=provider.model_name(),
        input_metadata={"requirement_id": req.id, "raw_text_length": len(req.raw_text)},
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    try:
        structured, mode, llm_error = analyze_requirement_with_meta(req.raw_text)
        req.structured = structured
        req.status = "analyzed"
        project.status = ProjectStatus.SPECIFICATION.value

        run.status = RunStatus.COMPLETED.value
        run.completed_at = datetime.now(timezone.utc)
        if mode == "llm":
            run.output_metadata = {
                "mode": "llm",
                "actors_count": len(structured.get("actors", [])),
                "functional_count": len(structured.get("functional_requirements", [])),
                "entities_count": len(structured.get("entities", [])),
            }
        else:
            run.provider = "deterministic_offline_parser"
            run.model = "rule_based_extractor_v1"
            run.output_metadata = {
                "mode": "deterministic_offline_parser",
                "llm_error": llm_error,
                "actors_count": len(structured.get("actors", [])),
                "functional_count": len(structured.get("functional_requirements", [])),
                "entities_count": len(structured.get("entities", [])),
            }
        db.commit()

        return RequirementAnalyzeResponse(
            requirement_id=req.id,
            structured=StructuredRequirement(**structured),
            status=req.status,
        )
    except Exception as e:
        run.status = RunStatus.FAILED.value
        run.error = str(e)
        run.completed_at = datetime.now(timezone.utc)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Requirement analysis failed: {str(e)}")
