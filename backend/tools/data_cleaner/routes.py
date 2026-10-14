import os

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from auth.dependencies import get_current_user
from models.user import User
from utils.file_security import safe_path, safe_filename, validate_output_filename
from utils.resource_ownership import check_resource_access, check_and_claim_resource

from tools.data_cleaner.schemas import DataCleanerResponse
from tools.data_cleaner.service import clean_data

router = APIRouter(
    prefix="/data-cleaner",
    tags=["Data Cleaner"],
)


@router.post("/clean", response_model=DataCleanerResponse)
def clean_uploaded_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected.")

    try:
        original_name = validate_output_filename(file.filename)
        lower_name = original_name.lower()
        if lower_name.endswith(".csv"):
            extension = ".csv"
        elif lower_name.endswith(".xlsx"):
            extension = ".xlsx"
        else:
            extension = None
        if extension:
            cleaned_name = os.path.splitext(original_name)[0] + "_cleaned" + extension
            check_and_claim_resource("cleaned_file", cleaned_name, current_user)
        result = clean_data(file)
        return DataCleanerResponse(**result)
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Internal server error while processing the file.",
        )


@router.get("/download/{filename}")
def download_cleaned_file(
    filename: str,
    current_user: User = Depends(get_current_user),
):
    safe_name = safe_filename(filename)
    check_resource_access("cleaned_file", safe_name, current_user, "download")
    filepath = safe_path("cleaned_files", safe_name)

    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Cleaned file not found.")

    return FileResponse(
        path=str(filepath),
        filename=filepath.name,
    )
