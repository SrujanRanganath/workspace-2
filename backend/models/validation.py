"""
Validation, Testing, and Repair domain models.
Provides the data foundation for the full traceability pipeline:
  Requirement → Artifact → Validation → Test → Defect → Repair
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from datetime import datetime, timezone

from database import Base


class ValidationRun(Base):
    __tablename__ = "validation_runs"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    artifact_id = Column(Integer, ForeignKey("artifacts.id"), nullable=True)

    check_type = Column(String(100), nullable=False)  # e.g., "json_validity", "python_syntax"
    status = Column(String(50), nullable=False)        # "passed", "failed", "warning"
    message = Column(Text, nullable=True)
    details = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class TestCase(Base):
    __tablename__ = "test_cases"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    artifact_id = Column(Integer, ForeignKey("artifacts.id"), nullable=True)
    requirement_id = Column(Integer, ForeignKey("requirements.id"), nullable=True)

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    test_type = Column(String(50), nullable=False)  # "unit", "integration", "syntax", "api_health"
    status = Column(String(50), default="pending")   # "pending", "passed", "failed", "skipped"

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class TestResult(Base):
    __tablename__ = "test_results"

    id = Column(Integer, primary_key=True, index=True)
    test_case_id = Column(Integer, ForeignKey("test_cases.id"), nullable=False, index=True)

    status = Column(String(50), nullable=False)  # "passed", "failed", "STATIC_PASS", "STATIC_FAIL", etc.
    output = Column(Text, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    verification_type = Column(String(50), nullable=True, default="Docker Runtime")

    executed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Defect(Base):
    __tablename__ = "defects"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    artifact_id = Column(Integer, ForeignKey("artifacts.id"), nullable=True)
    validation_run_id = Column(Integer, ForeignKey("validation_runs.id"), nullable=True)
    test_result_id = Column(Integer, ForeignKey("test_results.id"), nullable=True)

    severity = Column(String(50), nullable=False)  # "critical", "major", "minor", "info"
    description = Column(Text, nullable=False)
    status = Column(String(50), default="open")     # "open", "diagnosed", "repaired", "verified", "wontfix"

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class RepairAttempt(Base):
    __tablename__ = "repair_attempts"

    id = Column(Integer, primary_key=True, index=True)
    defect_id = Column(Integer, ForeignKey("defects.id"), nullable=False, index=True)

    strategy = Column(String(100), nullable=True)  # "llm_repair", "manual", "assisted"
    patch = Column(Text, nullable=True)
    status = Column(String(50), nullable=False)     # "proposed", "applied", "verified", "rejected"
    result_message = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
