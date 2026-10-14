from typing import Optional, Dict, List
from pydantic import BaseModel, Field


class GenerateCodeRequest(BaseModel):
    prompt: str = Field(
        ...,
        min_length=1,
        description="Task description for code generation"
    )
    language: str = Field(
        ...,
        min_length=1,
        description="Programming language"
    )
    template: str = Field(
        ...,
        min_length=1,
        description="Code template or architecture pattern"
    )
    project_name: Optional[str] = Field(
        default="event-management",
        description="Root project folder name"
    )


class GenerateCodeResponse(BaseModel):
    code: str
    project_name: Optional[str] = "event-management"
    files: Optional[Dict[str, str]] = None
    provider: str = "gemini"
    fallback_used: bool = False
    message: Optional[str] = None


class RegenerateFileRequest(BaseModel):
    project_name: str = Field(default="event-management")
    file_path: str = Field(..., min_length=1)
    instruction: str = Field(..., min_length=1)
    current_code: str = Field(default="")
    project_context: Optional[str] = Field(default="")


class RegenerateFileResponse(BaseModel):
    file_path: str
    code: str
    provider: str = "gemini"
    fallback_used: bool = False
    message: Optional[str] = None


class SaveCodeRequest(BaseModel):
    filename: str = Field(..., min_length=1)
    code: str = Field(..., min_length=1)


class SaveCodeResponse(BaseModel):
    message: str
    filename: str


class SaveProjectRequest(BaseModel):
    project_name: str = Field(..., min_length=1)
    files: Dict[str, str] = Field(...)


class SaveProjectResponse(BaseModel):
    message: str
    folder: str
    file_count: int


class RunCodeRequest(BaseModel):
    filename: str = Field(..., min_length=1)


class RunCodeResponse(BaseModel):
    output: str


class VerifyCodeRequest(BaseModel):
    files: Dict[str, str] = Field(...)
    entrypoint: Optional[str] = "backend/main.py"


class VerifyCodeResponse(BaseModel):
    status: str
    syntax_valid: bool
    summary: str
    issues: List[str] = []
    file_stats: Dict[str, int] = {}


class ExplainCodeRequest(BaseModel):
    code: str = Field(..., min_length=1)
    language: str = Field(..., min_length=1)


class ExplainCodeResponse(BaseModel):
    explanation: str