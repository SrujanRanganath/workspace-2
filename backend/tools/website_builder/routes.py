from utils.resource_ownership import check_resource_access, check_and_claim_resource
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, PlainTextResponse
from pathlib import Path
import secrets
import time
import threading

from auth.dependencies import get_current_user
from models.user import User
from utils.file_security import resolve_contained_path, safe_filename, validate_output_filename

from tools.website_builder.schemas import (
    GenerateWebsiteRequest,
    GenerateWebsiteResponse,
    ModifyWebsiteRequest,
    PublishWebsiteRequest,
    PublishWebsiteResponse,
    SaveWebsiteRequest,
    SaveWebsiteResponse,
)
from tools.website_builder.service import (
    generate_website_with_meta,
    modify_website_with_ai,
    save_generated_website,
    download_generated_website,
)

router = APIRouter(
    prefix="/website",
    tags=["Website Builder"],
)

DOWNLOAD_TOKENS_CACHE = {}
DOWNLOAD_TOKENS_LOCK = threading.Lock()
PUBLISHED_WEBSITES_DIR = Path("published_websites")

@router.post("/generate", response_model=GenerateWebsiteResponse)
def generate(
    request: GenerateWebsiteRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        result = generate_website_with_meta(
            request.prompt,
            request.framework,
            request.template,
        )
        return GenerateWebsiteResponse(
            app=result["app"],
            css=result["css"],
            js=result.get("js", ""),
            files=result.get("files"),
            provider=result["provider"],
            fallback_used=result["fallback_used"],
            message=result.get("message"),
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Website generation failed: {str(e)}",
        )


@router.post("/modify", response_model=GenerateWebsiteResponse)
def modify(
    request: ModifyWebsiteRequest,
    current_user: User = Depends(get_current_user),
):
    """
    AI-powered modification of an existing generated website.
    Takes existing HTML/CSS/JS and a natural-language modification prompt.
    Returns updated code while preserving existing structure.
    """
    try:
        result = modify_website_with_ai(
            request.modification_prompt,
            request.current_html,
            request.current_css,
            request.current_js,
            request.framework,
        )
        return GenerateWebsiteResponse(
            app=result["app"],
            css=result["css"],
            js=result.get("js", ""),
            files=result.get("files"),
            provider=result["provider"],
            fallback_used=result["fallback_used"],
            message=result.get("message"),
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Website modification failed: {str(e)}",
        )


@router.post("/save", response_model=SaveWebsiteResponse)
def save(
    request: SaveWebsiteRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        project_name = safe_filename(request.project_name)
        check_and_claim_resource("website_project", project_name, current_user)
        result = save_generated_website(
            project_name,
            request.framework,
            request.app,
            request.css,
            request.js,
        )
        return SaveWebsiteResponse(
            message=result["message"],
            folder=result["folder"],
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Saving website failed: {str(e)}",
        )


@router.get("/download/{project_name}")
def download(
    project_name: str,
    current_user: User = Depends(get_current_user),
):
    """Download the project as a ZIP archive containing all files."""
    try:
        safe_project_name = safe_filename(project_name)
        check_resource_access("website_project", safe_project_name, current_user, "download")
        zip_file = download_generated_website(safe_project_name)

        return FileResponse(
            path=zip_file,
            filename=f"{safe_project_name}.zip",
            media_type="application/zip",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=404,
            detail=f"Download failed: {str(e)}",
        )


@router.post("/generate-download-link/{project_name}")
def generate_download_link(
    project_name: str,
    current_user: User = Depends(get_current_user),
):
    """Generate a single-use, 60-second presigned download token."""
    safe_project_name = safe_filename(project_name)
    check_resource_access("website_project", safe_project_name, current_user, "download")
    token = secrets.token_urlsafe(32)
    
    with DOWNLOAD_TOKENS_LOCK:
        # Cleanup expired tokens
        expired = [k for k, v in DOWNLOAD_TOKENS_CACHE.items() if v["expires"] < time.time()]
        for k in expired:
            del DOWNLOAD_TOKENS_CACHE[k]
            
        expected_filename = f"{safe_project_name}.zip"
        DOWNLOAD_TOKENS_CACHE[token] = {
            "project_name": safe_project_name,
            "expected_filename": expected_filename,
            "user_email": current_user.email,
            "expires": time.time() + 60
        }
        
    return {"token": token, "download_url": f"/website/download-file/{token}/{expected_filename}"}


@router.get("/download-file/{token}/{filename}")
def download_file_by_token(token: str, filename: str):
    """
    Download the ZIP using a single-use bearer token.

    The token is a 60-second capability issued only after the owner authenticates.
    Possession of a valid unused token is sufficient; this endpoint does not
    re-check JWT ownership so a browser can download without sending Authorization.
    The URL filename is never used as a filesystem path.
    """
    # Validate URL filename syntax only; never use it as a filesystem path.
    safe_filename(filename)
    if not token or ".." in token or "/" in token or "\\" in token:
        raise HTTPException(status_code=404, detail="Invalid or already used download token")

    with DOWNLOAD_TOKENS_LOCK:
        if token not in DOWNLOAD_TOKENS_CACHE:
            raise HTTPException(status_code=404, detail="Invalid or already used download token")
        data = DOWNLOAD_TOKENS_CACHE.pop(token)

    if data["expires"] < time.time():
        raise HTTPException(status_code=401, detail="Download token expired")

    safe_project_name = data["project_name"]
    stored_filename = data["expected_filename"]

    try:
        zip_file = download_generated_website(safe_project_name)
        return FileResponse(
            path=zip_file,
            filename=stored_filename,
            media_type="application/zip",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Download failed: {str(e)}")

@router.get("/download-html/{project_name}")
def download_html(
    project_name: str,
    current_user: User = Depends(get_current_user),
):
    """Download just the index.html file for the project."""
    try:
        from pathlib import Path
        safe_project_name = safe_filename(project_name)
        check_resource_access("website_project", safe_project_name, current_user, "download")
        html_path = resolve_contained_path(Path("generated_websites"), f"{safe_project_name}/index.html")

        if not html_path.exists():
            raise HTTPException(status_code=404, detail=f"HTML file not found for project '{safe_project_name}'. Save the project first.")

        return FileResponse(
            path=html_path,
            filename=f"{safe_project_name}.html",
            media_type="text/html",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=404,
            detail=f"HTML download failed: {str(e)}",
        )


@router.post("/publish", response_model=PublishWebsiteResponse)
def publish(
    request: PublishWebsiteRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Publish the static website to a real served URL.
    Saves HTML, CSS, JS and static assets into published_websites/<site_id>/
    Safe: purely static file serving, never executes backend code.
    """
    try:
        import uuid
        site_id = request.site_id
        if not site_id:
            clean_proj = validate_output_filename(request.project_name.lower().replace(" ", "-"))
            site_id = f"{clean_proj}-{uuid.uuid4().hex[:6]}"
        else:
            site_id = validate_output_filename(site_id)

        publish_dir = resolve_contained_path(PUBLISHED_WEBSITES_DIR, site_id)
        if publish_dir.exists():
            check_resource_access("published_site", site_id, current_user, "publish")
        else:
            check_and_claim_resource("published_site", site_id, current_user)

        files = request.files or {}
        if not files:
            files = {
                "index.html": request.app or "<h1>Website</h1>",
                "styles.css": request.css or "/* Styles */",
                "script.js": request.js or "// JavaScript",
            }

        validated_files = []
        for rel_path, content in files.items():
            file_path = resolve_contained_path(publish_dir, rel_path)
            validated_files.append((file_path, content))

        publish_dir.mkdir(parents=True, exist_ok=True)
        published_files = []
        for file_path, content in validated_files:
            file_path.parent.mkdir(parents=True, exist_ok=True)
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)
            published_files.append(file_path.relative_to(publish_dir).as_posix())

        # Ensure index.html exists and is complete standalone HTML
        index_file = resolve_contained_path(publish_dir, "index.html")
        if index_file.exists():
            idx_content = index_file.read_text(encoding="utf-8")
            if not (idx_content.strip().startswith("<!DOCTYPE") or "<html" in idx_content):
                standalone_html = f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{request.project_name}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
{idx_content}
  <script src="script.js"></script>
</body>
</html>'''
                index_file.write_text(standalone_html, encoding="utf-8")

        # Also write styles.css if only style.css was provided
        style_file = resolve_contained_path(publish_dir, "style.css")
        styles_file = resolve_contained_path(publish_dir, "styles.css")
        if style_file.exists() and not styles_file.exists():
            styles_file.write_text(style_file.read_text(encoding="utf-8"), encoding="utf-8")
        elif styles_file.exists() and not style_file.exists():
            style_file.write_text(styles_file.read_text(encoding="utf-8"), encoding="utf-8")

        published_url = f"http://127.0.0.1:8000/published/{site_id}/"
        return PublishWebsiteResponse(
            site_id=site_id,
            published_url=published_url,
            message=f"Website successfully published at {published_url}",
            files_published=published_files,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Publishing website failed: {str(e)}",
        )
