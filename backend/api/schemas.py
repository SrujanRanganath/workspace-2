"""
Pydantic schemas for the v1 API.
Request/response models for projects, requirements, artifacts, and generation runs.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime


# --- Error Response ---
class ErrorResponse(BaseModel):
    detail: str
    code: Optional[str] = None


# --- Project Schemas ---
class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    status: Optional[str] = None


class ProjectResponse(BaseModel):
    id: int
    user_id: int
    name: str
    description: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectListResponse(BaseModel):
    projects: List[ProjectResponse]
    total: int


# --- Requirement Schemas ---
class RequirementCreate(BaseModel):
    raw_text: str = Field(..., min_length=1, description="Natural-language requirement text")


class RequirementUpdate(BaseModel):
    raw_text: Optional[str] = None
    structured: Optional[dict] = None
    status: Optional[str] = None


class StructuredRequirement(BaseModel):
    """Schema for the structured analysis result."""
    actors: List[str] = Field(default_factory=list)
    functional_requirements: List[str] = Field(default_factory=list)
    non_functional_requirements: List[str] = Field(default_factory=list)
    entities: List[str] = Field(default_factory=list)
    workflows: List[str] = Field(default_factory=list)
    api_requirements: List[str] = Field(default_factory=list)
    frontend_requirements: List[str] = Field(default_factory=list)
    data_requirements: List[str] = Field(default_factory=list)
    documentation_requirements: List[str] = Field(default_factory=list)
    acceptance_criteria: List[str] = Field(default_factory=list)


class RequirementResponse(BaseModel):
    id: int
    project_id: int
    raw_text: str
    structured: Optional[dict]
    version: int
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RequirementAnalyzeRequest(BaseModel):
    requirement_id: Optional[int] = None  # If None, analyze the latest requirement


class RequirementAnalyzeResponse(BaseModel):
    requirement_id: int
    structured: StructuredRequirement
    status: str


# --- Artifact Schemas ---
class ArtifactResponse(BaseModel):
    id: int
    project_id: int
    artifact_type: str
    name: str
    path: Optional[str]
    content: Optional[str]
    version: int
    status: str
    requirement_id: Optional[int]
    generation_run_id: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ArtifactListResponse(BaseModel):
    artifacts: List[ArtifactResponse]
    total: int


# --- Generation Run Schemas ---
class GenerationRunResponse(BaseModel):
    id: int
    project_id: int
    operation: str
    status: str
    provider: Optional[str]
    model: Optional[str]
    started_at: datetime
    completed_at: Optional[datetime]
    error: Optional[str]
    input_metadata: Optional[dict]
    output_metadata: Optional[dict]

    class Config:
        from_attributes = True


class GenerationRunListResponse(BaseModel):
    runs: List[GenerationRunResponse]
    total: int


# --- Specification Schemas ---
class SpecificationGenerateRequest(BaseModel):
    requirement_id: Optional[int] = None


class SpecificationResponse(BaseModel):
    project_id: int
    requirement_id: int
    specification: dict
    generation_run_id: int


# --- Plan Schemas ---
class PlanGenerateRequest(BaseModel):
    requirement_id: Optional[int] = None


class PlanResponse(BaseModel):
    project_id: int
    plan: dict
    generation_run_id: int


# --- Validation Schemas ---
class ValidationResult(BaseModel):
    status: str  # "passed", "failed", "warning"
    check: str
    message: str
    artifact: Optional[str] = None
    requirement: Optional[str] = None


class ValidationRunResponse(BaseModel):
    project_id: int
    results: List[ValidationResult]
    summary: dict  # {"passed": N, "failed": N, "warning": N}
