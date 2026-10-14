from pydantic import BaseModel, Field
from typing import Optional


class GenerateWebsiteRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    framework: str = Field(..., min_length=1)
    template: str = Field(..., min_length=1)


class ModifyWebsiteRequest(BaseModel):
    modification_prompt: str = Field(..., min_length=1)
    current_html: str = Field(..., min_length=1)
    current_css: str = Field(default="")
    current_js: str = Field(default="")
    framework: str = Field(default="HTML/CSS")


class GenerateWebsiteResponse(BaseModel):
    app: str
    css: str
    js: str = ""
    files: Optional[dict[str, str]] = None
    provider: str = "gemini"
    fallback_used: bool = False
    message: Optional[str] = None


class SaveWebsiteRequest(BaseModel):
    project_name: str = Field(..., min_length=1)
    framework: str = Field(..., min_length=1)
    app: str = Field(..., min_length=1)
    css: str = Field(default="")
    js: str = Field(default="")


class SaveWebsiteResponse(BaseModel):
    message: str
    folder: str


class PublishWebsiteRequest(BaseModel):
    project_name: str = Field(default="smart-college-events")
    site_id: Optional[str] = None
    files: Optional[dict[str, str]] = None
    app: Optional[str] = None
    css: Optional[str] = None
    js: Optional[str] = None


class PublishWebsiteResponse(BaseModel):
    site_id: str
    published_url: str
    message: str
    files_published: list[str] = []