"""
Artifact domain model.
Represents any generated file/asset within a project.
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

from database import Base


class ArtifactType(str, enum.Enum):
    BACKEND = "backend"
    FRONTEND = "frontend"
    DATABASE = "database"
    DATA = "data"
    DOCUMENTATION = "documentation"
    TESTS = "tests"
    CONFIGURATION = "configuration"
    OTHER = "other"


class ArtifactStatus(str, enum.Enum):
    GENERATED = "generated"
    VALIDATED = "validated"
    FAILED = "failed"
    REPAIRED = "repaired"


class Artifact(Base):
    __tablename__ = "artifacts"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    generation_run_id = Column(Integer, ForeignKey("generation_runs.id"), nullable=True)

    artifact_type = Column(String(50), nullable=False)
    name = Column(String(255), nullable=False)
    path = Column(String(500), nullable=True)
    content = Column(Text, nullable=True)

    version = Column(Integer, default=1, nullable=False)
    status = Column(String(50), default=ArtifactStatus.GENERATED.value, nullable=False)

    # Requirement traceability
    requirement_id = Column(Integer, ForeignKey("requirements.id"), nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    project = relationship("Project", back_populates="artifacts")
    generation_run = relationship("GenerationRun", back_populates="artifacts")

    def __init__(self, **kwargs):
        now = datetime.now(timezone.utc)
        if "created_at" not in kwargs or kwargs["created_at"] is None:
            kwargs["created_at"] = now
        if "updated_at" not in kwargs or kwargs["updated_at"] is None:
            kwargs["updated_at"] = now
        super().__init__(**kwargs)


from sqlalchemy import event


@event.listens_for(Artifact, "load")
def receive_artifact_load(target, context):
    """Guarantees loaded Artifact models always present valid datetimes to callers and serializers."""
    now = datetime.now(timezone.utc)
    if target.created_at is None:
        target.created_at = target.updated_at or now
    if target.updated_at is None:
        target.updated_at = target.created_at or now

