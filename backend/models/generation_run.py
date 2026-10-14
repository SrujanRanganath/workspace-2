"""
GenerationRun domain model.
Records each LLM generation operation with provider/model metadata.
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

from database import Base


class RunStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class GenerationRun(Base):
    __tablename__ = "generation_runs"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)

    operation = Column(String(100), nullable=False)  # e.g., "requirement_analysis", "code_generation"
    status = Column(String(50), default=RunStatus.PENDING.value, nullable=False)

    provider = Column(String(50), nullable=True)   # e.g., "gemini", "ollama"
    model = Column(String(100), nullable=True)      # e.g., "gemini-2.0-flash"

    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)

    error = Column(Text, nullable=True)

    # Flexible input/output metadata
    input_metadata = Column(JSON, nullable=True)
    output_metadata = Column(JSON, nullable=True)

    # Relationships
    project = relationship("Project", back_populates="generation_runs")
    artifacts = relationship("Artifact", back_populates="generation_run")
