"""
Artifact API routes — /api/v1/projects/{project_id}/artifacts
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel

from auth.dependencies import get_current_user
from database import get_db
from models.user import User
from models.project import Project
from models.requirement import Requirement
from models.artifact import Artifact, ArtifactStatus
from api.schemas import (
    ArtifactResponse,
    ArtifactListResponse,
)

router = APIRouter(prefix="/api/v1/projects/{project_id}/artifacts", tags=["Artifacts"])


class ArtifactCreateManual(BaseModel):
    artifact_type: str
    name: str
    path: Optional[str] = None
    content: Optional[str] = None
    requirement_id: Optional[int] = None


class ArtifactUpdateManual(BaseModel):
    content: Optional[str] = None
    status: Optional[str] = None


def _get_user_project(project_id: int, user_id: int, db: Session) -> Project:
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.user_id == user_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    return project


@router.get("", response_model=ArtifactListResponse)
def list_artifacts(
    project_id: int,
    artifact_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _get_user_project(project_id, current_user.id, db)
    query = db.query(Artifact).filter(Artifact.project_id == project.id)
    if artifact_type:
        query = query.filter(Artifact.artifact_type == artifact_type)
    artifacts = query.order_by(Artifact.id.asc()).all()
    # Deduplicate by artifact name, keeping the latest version
    latest_by_name = {}
    for art in artifacts:
        latest_by_name[art.name] = art
    unique_artifacts = list(latest_by_name.values())
    return ArtifactListResponse(artifacts=unique_artifacts, total=len(unique_artifacts))


@router.get("/{artifact_id}", response_model=ArtifactResponse)
def get_artifact(
    project_id: int,
    artifact_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _get_user_project(project_id, current_user.id, db)
    art = (
        db.query(Artifact)
        .filter(Artifact.id == artifact_id, Artifact.project_id == project.id)
        .first()
    )
    if not art:
        raise HTTPException(status_code=404, detail="Artifact not found.")
    return art


@router.post("", response_model=ArtifactResponse, status_code=status.HTTP_201_CREATED)
def create_artifact(
    project_id: int,
    request: ArtifactCreateManual,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _get_user_project(project_id, current_user.id, db)
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
    now = datetime.now(timezone.utc)
    art = Artifact(
        project_id=project.id,
        artifact_type=request.artifact_type,
        name=request.name,
        path=request.path,
        content=request.content,
        requirement_id=request.requirement_id,
        status=ArtifactStatus.GENERATED.value,
        version=1,
        created_at=now,
        updated_at=now,
    )
    db.add(art)
    db.commit()
    db.refresh(art)
    if art.created_at is None:
        art.created_at = art.updated_at or now
    return art


@router.put("/{artifact_id}", response_model=ArtifactResponse)
def update_artifact(
    project_id: int,
    artifact_id: int,
    request: ArtifactUpdateManual,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _get_user_project(project_id, current_user.id, db)
    art = (
        db.query(Artifact)
        .filter(Artifact.id == artifact_id, Artifact.project_id == project.id)
        .first()
    )
    if not art:
        raise HTTPException(status_code=404, detail="Artifact not found.")

    now = datetime.now(timezone.utc)
    if request.content is not None:
        art.content = request.content
        art.version += 1
    if request.status is not None:
        art.status = request.status
    if not art.created_at:
        art.created_at = now
    art.updated_at = now

    db.commit()
    db.refresh(art)
    if art.created_at is None:
        art.created_at = art.updated_at or now
    return art
