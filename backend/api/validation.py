"""
Validation, Testing & Repair API routes — /api/v1/projects/{project_id}/validation
Provides traceability verification, syntax compilation, defect tracking, and automated repair.
"""

import ast
import json
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, model_validator
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from database import get_db
from models.user import User
from models.project import Project, ProjectStatus
from models.requirement import Requirement
from models.artifact import Artifact, ArtifactStatus
from models.validation import ValidationRun, TestCase, TestResult, Defect, RepairAttempt
from services.pipeline import validate_artifacts_pipeline, repair_defect_pipeline
from services.test_runner import run_test_artifacts
from services.static_test_verifier import verify_test_artifact_statically
from api.schemas import (
    ValidationRunResponse,
    ValidationResult,
)

router = APIRouter(prefix="/api/v1/projects/{project_id}", tags=["Validation & Repair"])


class DefectResponse(BaseModel):
    id: int
    project_id: int
    artifact_id: Optional[int]
    severity: str
    description: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class RepairRequest(BaseModel):
    defect_id: int


class RepairResponse(BaseModel):
    defect_id: int
    status: str
    strategy: str
    patch: Optional[str]
    message: str
    validation_status: Optional[str] = "not_run"


class TestCaseCreate(BaseModel):
    name: str
    description: Optional[str] = None
    test_type: str
    artifact_id: Optional[int] = None
    requirement_id: Optional[int] = None


class TestCaseResponse(BaseModel):
    id: int
    project_id: int
    artifact_id: Optional[int]
    requirement_id: Optional[int]
    name: str
    description: Optional[str]
    test_type: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class TestResultResponse(BaseModel):
    id: int
    test_case_id: int
    status: str
    output: Optional[str] = None
    duration_ms: Optional[int] = None
    executed_at: datetime
    verification_type: Optional[str] = "Docker Runtime"
    docker_status: Optional[str] = None

    class Config:
        from_attributes = True

    @model_validator(mode="after")
    def populate_fallback_fields(self) -> "TestResultResponse":
        if not self.verification_type or self.status.upper() in ("STATIC_PASS", "STATIC_FAIL"):
            if self.status.upper() in ("STATIC_PASS", "STATIC_FAIL"):
                self.verification_type = "Static Verification"
                if not self.docker_status:
                    self.docker_status = "NOT EXECUTED"
            else:
                self.verification_type = "Docker Runtime"
        if not self.docker_status:
            if self.verification_type == "Static Verification":
                self.docker_status = "NOT EXECUTED"
            else:
                self.docker_status = self.status.upper()
        return self


class TestExecutionResponse(TestResultResponse):
    exit_code: Optional[int] = None
    stdout: str = ""
    stderr: str = ""
    message: Optional[str] = None
    checks: Optional[Dict[str, Any]] = None


def _get_user_project(project_id: int, user_id: int, db: Session) -> Project:
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.user_id == user_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    return project


@router.post("/tests", response_model=TestCaseResponse, status_code=status.HTTP_201_CREATED)
def create_test_case(
    project_id: int,
    request: TestCaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _get_user_project(project_id, current_user.id, db)

    if request.artifact_id is not None:
        artifact = (
            db.query(Artifact)
            .filter(Artifact.id == request.artifact_id, Artifact.project_id == project.id)
            .first()
        )
        if not artifact:
            raise HTTPException(status_code=404, detail="Artifact not found.")

    if request.requirement_id is not None:
        requirement = (
            db.query(Requirement)
            .filter(
                Requirement.id == request.requirement_id,
                Requirement.project_id == project.id,
            )
            .first()
        )
        if not requirement:
            raise HTTPException(status_code=404, detail="Requirement not found.")

    test_case = TestCase(
        project_id=project.id,
        artifact_id=request.artifact_id,
        requirement_id=request.requirement_id,
        name=request.name,
        description=request.description,
        test_type=request.test_type,
        status="pending",
    )
    db.add(test_case)
    db.commit()
    db.refresh(test_case)
    return test_case


@router.get("/tests", response_model=List[TestCaseResponse])
def list_test_cases(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _get_user_project(project_id, current_user.id, db)
    return (
        db.query(TestCase)
        .filter(TestCase.project_id == project.id)
        .order_by(TestCase.created_at.desc(), TestCase.id.desc())
        .all()
    )


@router.get("/tests/{test_case_id}", response_model=TestCaseResponse)
def get_test_case(
    project_id: int,
    test_case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _get_user_project(project_id, current_user.id, db)
    test_case = (
        db.query(TestCase)
        .filter(TestCase.id == test_case_id, TestCase.project_id == project.id)
        .first()
    )
    if not test_case:
        raise HTTPException(status_code=404, detail="Test case not found.")
    return test_case


@router.get(
    "/tests/{test_case_id}/results",
    response_model=List[TestResultResponse],
)
def list_test_results(
    project_id: int,
    test_case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _get_user_project(project_id, current_user.id, db)
    test_case = (
        db.query(TestCase)
        .filter(TestCase.id == test_case_id, TestCase.project_id == project.id)
        .first()
    )
    if not test_case:
        raise HTTPException(status_code=404, detail="Test case not found.")

    return (
        db.query(TestResult)
        .filter(TestResult.test_case_id == test_case.id)
        .order_by(TestResult.executed_at.desc(), TestResult.id.desc())
        .all()
    )


@router.post(
    "/tests/{test_case_id}/run",
    response_model=TestExecutionResponse,
)
def run_registered_test_case(
    project_id: int,
    test_case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _get_user_project(project_id, current_user.id, db)
    test_case = (
        db.query(TestCase)
        .filter(TestCase.id == test_case_id, TestCase.project_id == project.id)
        .first()
    )
    if not test_case:
        raise HTTPException(status_code=404, detail="Test case not found.")

    test_artifact = (
        db.query(Artifact)
        .filter(
            Artifact.id == test_case.artifact_id,
            Artifact.project_id == project.id,
            Artifact.artifact_type == "tests",
        )
        .first()
    )
    if not test_artifact:
        raise HTTPException(status_code=404, detail="Test artifact not found.")

    source_artifacts = (
        db.query(Artifact)
        .filter(
            Artifact.project_id == project.id,
            Artifact.artifact_type.in_(["backend", "database"]),
        )
        .all()
    )
    execution = run_test_artifacts(
        {
            "artifact_type": test_artifact.artifact_type,
            "path": test_artifact.path,
            "content": test_artifact.content,
        },
        [
            {
                "artifact_type": artifact.artifact_type,
                "path": artifact.path,
                "content": artifact.content,
            }
            for artifact in source_artifacts
        ],
    )

    if execution.status == "runner_unavailable":
        # Docker is unavailable: automatically execute safe deterministic Static Test Verification
        spec_artifact = (
            db.query(Artifact)
            .filter(
                Artifact.project_id == project.id,
                Artifact.name == "specification.json",
            )
            .order_by(Artifact.id.desc())
            .first()
        )
        specification_data = None
        if spec_artifact and spec_artifact.content:
            try:
                specification_data = json.loads(spec_artifact.content)
            except Exception:
                specification_data = None

        req = (
            db.query(Requirement)
            .filter(Requirement.project_id == project.id)
            .order_by(Requirement.id.desc())
            .first()
        )

        static_result = verify_test_artifact_statically(
            test_artifact=test_artifact,
            project=project,
            specification=specification_data,
            spec_artifact=spec_artifact,
            requirement=req,
        )

        stdout_text = "\n".join(static_result.details)
        stderr_text = "\n".join(static_result.errors) if static_result.errors else ""
        output_data = {
            "verification_type": "Static Verification",
            "docker_status": "NOT EXECUTED",
            "docker_message": execution.message or "Docker is unavailable; generated tests were not executed.",
            "status": static_result.status,
            "message": static_result.message,
            "checks": static_result.checks,
            "details": static_result.details,
            "errors": static_result.errors,
            "stdout": stdout_text,
            "stderr": stderr_text,
            "exit_code": None,
        }
        output = json.dumps(output_data, ensure_ascii=False)

        result = TestResult(
            test_case_id=test_case.id,
            status=static_result.status,
            output=output,
            duration_ms=static_result.duration_ms,
            verification_type="Static Verification",
        )
        test_case.status = static_result.status.lower()
        db.add(result)
        db.commit()
        db.refresh(result)

        return TestExecutionResponse(
            id=result.id,
            test_case_id=result.test_case_id,
            status=result.status,
            output=result.output,
            duration_ms=result.duration_ms,
            executed_at=result.executed_at,
            exit_code=None,
            stdout=stdout_text,
            stderr=stderr_text,
            message=static_result.message,
            verification_type="Static Verification",
            docker_status="NOT EXECUTED",
            checks=static_result.checks,
        )

    output = json.dumps(
        {
            "verification_type": "Docker Runtime",
            "docker_status": execution.status.upper(),
            "stdout": execution.stdout,
            "stderr": execution.stderr,
            "exit_code": execution.exit_code,
            "message": execution.message,
        },
        ensure_ascii=False,
    )
    result = TestResult(
        test_case_id=test_case.id,
        status=execution.status,
        output=output,
        duration_ms=execution.duration_ms,
        verification_type="Docker Runtime",
    )
    test_case.status = {
        "passed": "passed",
        "failed": "failed",
        "timed_out": "failed",
        "runner_unavailable": "skipped",
        "execution_error": "failed",
    }.get(execution.status, execution.status)
    db.add(result)
    db.commit()
    db.refresh(result)

    return TestExecutionResponse(
        id=result.id,
        test_case_id=result.test_case_id,
        status=result.status,
        output=result.output,
        duration_ms=result.duration_ms,
        executed_at=result.executed_at,
        exit_code=execution.exit_code,
        stdout=execution.stdout,
        stderr=execution.stderr,
        message=execution.message,
        verification_type="Docker Runtime",
        docker_status=execution.status.upper(),
    )


@router.get("/test-results", response_model=List[TestResultResponse])
def list_project_test_results(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _get_user_project(project_id, current_user.id, db)
    return (
        db.query(TestResult)
        .join(TestCase, TestResult.test_case_id == TestCase.id)
        .filter(TestCase.project_id == project.id)
        .order_by(TestResult.executed_at.desc(), TestResult.id.desc())
        .all()
    )


@router.post("/validate", response_model=ValidationRunResponse)
def run_project_validation(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _get_user_project(project_id, current_user.id, db)

    artifacts = (
        db.query(Artifact)
        .filter(Artifact.project_id == project.id)
        .order_by(Artifact.id.asc())
        .all()
    )
    if not artifacts:
        raise HTTPException(status_code=400, detail="No artifacts exist to validate. Generate artifacts first.")

    req = db.query(Requirement).filter(Requirement.project_id == project.id).order_by(Requirement.id.desc()).first()
    structured = req.structured if (req and req.structured) else {}

    artifacts_data = [
        {"name": a.name, "content": a.content or "", "artifact_type": a.artifact_type, "id": a.id}
        for a in artifacts
    ]

    report = validate_artifacts_pipeline(artifacts_data, structured)

    artifacts_by_name = {artifact.name: artifact for artifact in artifacts}
    validation_records = []
    for res in report["results"]:
        result_artifact = artifacts_by_name.get(res.get("artifact"))
        v_run = ValidationRun(
            project_id=project.id,
            artifact_id=result_artifact.id if result_artifact else None,
            check_type=res["check"],
            status=res["status"],
            message=res["message"],
            details={"artifact": res.get("artifact"), "requirement": res.get("requirement")},
        )
        db.add(v_run)
        db.flush()
        validation_records.append((v_run, result_artifact))

    # Persist detected Defects
    for defect_item in report.get("defects", []):
        matched_art = artifacts_by_name.get(defect_item.get("artifact_name"))
        matching_validation = next(
            (
                validation_run
                for validation_run, validated_artifact in validation_records
                if matched_art
                and validated_artifact
                and validated_artifact.id == matched_art.id
                and validation_run.status == "failed"
            ),
            None,
        )
        defect = Defect(
            project_id=project.id,
            artifact_id=matched_art.id if matched_art else None,
            validation_run_id=matching_validation.id if matching_validation else None,
            severity=defect_item.get("severity", "major"),
            description=defect_item.get("description", "Validation failure"),
            status="open",
        )
        db.add(defect)

    # Update project status based on results
    if report["summary"]["failed"] == 0:
        project.status = ProjectStatus.COMPLETE.value
    else:
        project.status = ProjectStatus.FAILED.value

    db.commit()

    return ValidationRunResponse(
        project_id=project.id,
        results=[ValidationResult(**r) for r in report["results"]],
        summary=report["summary"],
    )


@router.get("/defects", response_model=List[DefectResponse])
def list_defects(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _get_user_project(project_id, current_user.id, db)
    return (
        db.query(Defect)
        .filter(Defect.project_id == project.id)
        .order_by(Defect.created_at.desc())
        .all()
    )


@router.post("/repair", response_model=RepairResponse)
def repair_defect(
    project_id: int,
    request: RepairRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _get_user_project(project_id, current_user.id, db)

    defect = (
        db.query(Defect)
        .filter(Defect.id == request.defect_id, Defect.project_id == project.id)
        .first()
    )
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found.")

    artifact = None
    if defect.artifact_id:
        # Enforce project boundary isolation: ensure artifact belongs to this user project
        artifact = (
            db.query(Artifact)
            .filter(Artifact.id == defect.artifact_id, Artifact.project_id == project.id)
            .first()
        )

    original_content = artifact.content if (artifact and artifact.content) else "# Defective Code"
    artifact_name = artifact.name if artifact else "unknown_file.py"

    repair_result = repair_defect_pipeline(defect.description, artifact_name, original_content)

    # Integrity verification: Revalidate patch before reporting success
    patch_content = repair_result.get("patch")
    is_valid = False
    validation_status = "not_run"
    validation_message = ""

    if patch_content and patch_content.strip():
        if artifact_name.endswith(".py"):
            try:
                ast.parse(patch_content)
                is_valid = True
                validation_status = "passed"
                validation_message = "Python AST syntax verification passed."
            except SyntaxError as syn_err:
                is_valid = False
                validation_status = "failed"
                validation_message = f"Syntax error in synthesized patch: {syn_err.msg} at line {syn_err.lineno}"
        elif artifact_name.endswith(".json"):
            try:
                json.loads(patch_content)
                is_valid = True
                validation_status = "passed"
                validation_message = "JSON syntax verification passed."
            except Exception as json_err:
                is_valid = False
                validation_status = "failed"
                validation_message = f"Invalid JSON in synthesized patch: {json_err}"
        else:
            is_valid = False
            validation_status = "failed"
            validation_message = (
                "No post-repair validator is available for this artifact type; "
                "the patch was not applied."
            )
    else:
        is_valid = False
        validation_status = "failed"
        validation_message = "No patch content was generated."

    if is_valid and artifact:
        artifact.content = patch_content
        artifact.version += 1
        artifact.status = ArtifactStatus.REPAIRED.value
        defect.status = "repaired"
        attempt_status = "applied"
    else:
        defect.status = "repair_failed"
        attempt_status = "failed"

    # Persist repair attempt with actual validation result
    attempt = RepairAttempt(
        defect_id=defect.id,
        strategy=repair_result.get("strategy", "llm_repair"),
        patch=patch_content,
        status=attempt_status,
        result_message=f"{repair_result.get('message', '')} Validation: {validation_status} ({validation_message})",
    )
    db.add(attempt)
    db.commit()

    return RepairResponse(
        defect_id=defect.id,
        status=defect.status,
        strategy=repair_result.get("strategy", "llm_repair"),
        patch=patch_content,
        message=f"{repair_result.get('message', 'Repair evaluated.')} Validation: {validation_status}",
        validation_status=validation_status,
    )
