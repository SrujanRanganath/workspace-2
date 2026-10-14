"""
Requirement domain model.
Stores both raw natural-language requirements and structured analysis results.
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from database import Base


class Requirement(Base):
    __tablename__ = "requirements"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)

    # Raw input
    raw_text = Column(Text, nullable=False)

    # Structured analysis result (JSON)
    structured = Column(JSON, nullable=True)

    version = Column(Integer, default=1, nullable=False)
    status = Column(String(50), default="draft", nullable=False)  # draft, analyzed, approved, rejected

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    project = relationship("Project", back_populates="requirements")
