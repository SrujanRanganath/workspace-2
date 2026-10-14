from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from auth.dependencies import get_current_user
from models.user import User
from utils.file_security import safe_filename, safe_path, resolve_contained_path
from utils.resource_ownership import check_resource_access, check_and_claim_resource

from tools.code_tool.schemas import (
    GenerateCodeRequest,
    GenerateCodeResponse,
    RegenerateFileRequest,
    RegenerateFileResponse,
    SaveCodeRequest,
    SaveCodeResponse,
    SaveProjectRequest,
    SaveProjectResponse,
    RunCodeRequest,
    RunCodeResponse,
    VerifyCodeRequest,
    VerifyCodeResponse,
    ExplainCodeRequest,
    ExplainCodeResponse,
)
from tools.code_tool.service import (
    generate_code_with_meta,
    regenerate_file_with_meta,
    save_code_project,
    create_code_project_zip,
    verify_code_project,
    save_generated_code,
    run_generated_code,
    explain_code_with_meta,
)

router = APIRouter(
    prefix="/code",
    tags=["Code Tool"],
)


@router.post("/generate", response_model=GenerateCodeResponse)
def generate(
    request: GenerateCodeRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        project_name = getattr(request, "project_name", "event-management") or "event-management"
        result = generate_code_with_meta(
            request.prompt,
            request.language,
            request.template,
            project_name=project_name,
        )
        return GenerateCodeResponse(
            code=result["code"],
            project_name=result.get("project_name", project_name),
            files=result.get("files"),
            provider=result["provider"],
            fallback_used=result["fallback_used"],
            message=result.get("message"),
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Code generation failed: {str(e)}",
        )


@router.post("/regenerate-file", response_model=RegenerateFileResponse)
def regenerate_file(
    request: RegenerateFileRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        result = regenerate_file_with_meta(
            file_path=request.file_path,
            instruction=request.instruction,
            current_code=request.current_code,
            project_name=request.project_name,
            project_context=request.project_context or "",
        )
        return RegenerateFileResponse(
            file_path=result["file_path"],
            code=result["code"],
            provider=result["provider"],
            fallback_used=result["fallback_used"],
            message=result.get("message"),
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"File regeneration failed: {str(e)}",
        )


@router.post("/save-project", response_model=SaveProjectResponse)
def save_project(
    request: SaveProjectRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        safe_name = safe_filename(request.project_name)
        check_and_claim_resource("code_project", safe_name, current_user)
        result = save_code_project(safe_name, request.files)
        # Also create zip so download is ready
        create_code_project_zip(safe_name, request.files)
        return SaveProjectResponse(
            message=result["message"],
            folder=result["folder"],
            file_count=result["file_count"],
        )
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save project: {str(e)}")


@router.get("/download-zip/{project_name}")
def download_project_zip(
    project_name: str,
    current_user: User = Depends(get_current_user),
):
    safe_name = safe_filename(project_name)
    check_resource_access("code_project", safe_name, current_user, "download")
    try:
        zip_path = resolve_contained_path(Path("generated_projects"), f"{safe_name}.zip")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not zip_path.is_file():
        raise HTTPException(status_code=404, detail="Generated project zip not found.")

    return FileResponse(
        path=str(zip_path),
        filename=f"{safe_name}.zip",
        media_type="application/zip",
    )


@router.post("/verify", response_model=VerifyCodeResponse)
def verify_project(
    request: VerifyCodeRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        result = verify_code_project(request.files, entrypoint=request.entrypoint or "backend/main.py")
        return VerifyCodeResponse(
            status=result["status"],
            syntax_valid=result["syntax_valid"],
            summary=result["summary"],
            issues=result["issues"],
            file_stats=result["file_stats"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Code verification failed: {str(e)}")


@router.post("/save", response_model=SaveCodeResponse)
def save(
    request: SaveCodeRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        filename = safe_filename(request.filename)
        check_and_claim_resource("code_file", filename, current_user)
        result = save_generated_code(filename, request.code)
        return SaveCodeResponse(
            message=result["message"],
            filename=result["filename"],
        )
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/run", response_model=RunCodeResponse)
def run(
    request: RunCodeRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        filename = safe_filename(request.filename)
        check_resource_access("code_file", filename, current_user, "run")
        result = run_generated_code(filename)
        return RunCodeResponse(output=result["output"])
    except HTTPException:
        raise
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/download/{filename}")
def download_generated_code(
    filename: str,
    current_user: User = Depends(get_current_user),
):
    safe_name = safe_filename(filename)
    check_resource_access("code_file", safe_name, current_user, "download")
    filepath = safe_path("generated", safe_name)

    if not filepath.exists():
        raise HTTPException(
            status_code=404,
            detail="Generated code file not found.",
        )

    return FileResponse(
        path=str(filepath),
        filename=filepath.name,
        media_type="text/plain",
    )


@router.post("/explain", response_model=ExplainCodeResponse)
def explain(
    request: ExplainCodeRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        result = explain_code_with_meta(
            request.code,
            request.language,
        )
        return ExplainCodeResponse(
            explanation=result["explanation"],
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Code explanation failed: {str(e)}",
        )
