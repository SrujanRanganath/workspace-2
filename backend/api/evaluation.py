"""Read-only research evaluation report for persisted project records."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from database import get_db
from models.artifact import Artifact
from models.generation_run import GenerationRun
from models.project import Project
from models.requirement import Requirement
from models.user import User
from models.validation import (
    Defect,
    RepairAttempt,
    TestCase,
    TestResult,
    ValidationRun,
)
from services.research_evaluation import build_project_evaluation

router = APIRouter(prefix="/api/v1/projects/{project_id}/evaluation", tags=["Evaluation"])


@router.get("")
def get_project_evaluation(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.user_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    requirements = db.query(Requirement).filter(Requirement.project_id == project.id).all()
    artifacts = db.query(Artifact).filter(Artifact.project_id == project.id).all()
    generation_runs = (
        db.query(GenerationRun).filter(GenerationRun.project_id == project.id).all()
    )
    validation_runs = (
        db.query(ValidationRun).filter(ValidationRun.project_id == project.id).all()
    )
    defects = db.query(Defect).filter(Defect.project_id == project.id).all()
    repair_attempts = (
        db.query(RepairAttempt)
        .join(Defect, RepairAttempt.defect_id == Defect.id)
        .filter(Defect.project_id == project.id)
        .all()
    )
    test_cases = db.query(TestCase).filter(TestCase.project_id == project.id).all()
    test_case_ids = [test_case.id for test_case in test_cases]
    test_results = (
        db.query(TestResult).filter(TestResult.test_case_id.in_(test_case_ids)).all()
        if test_case_ids
        else []
    )

    return build_project_evaluation(
        project.id,
        requirements,
        artifacts,
        generation_runs,
        validation_runs,
        defects,
        repair_attempts,
        test_cases,
        test_results,
    )
