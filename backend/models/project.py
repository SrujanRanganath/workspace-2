"""
Project domain model.
Central entity for the project-oriented workflow.
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

from database import Base


class ProjectStatus(str, enum.Enum):
    DRAFT = "draft"
    REQUIREMENTS = "requirements"
    SPECIFICATION = "specification"
    PLANNING = "planning"
    BUILDING = "building"
    VALIDATING = "validating"
    TESTING = "testing"
    COMPLETE = "complete"
    FAILED = "failed"


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default=ProjectStatus.DRAFT.value, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    requirements = relationship("Requirement", back_populates="project", cascade="all, delete-orphan")
    artifacts = relationship("Artifact", back_populates="project", cascade="all, delete-orphan")
    generation_runs = relationship("GenerationRun", back_populates="project", cascade="all, delete-orphan")
