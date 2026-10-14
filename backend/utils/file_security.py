import os
from pathlib import Path, PurePosixPath, PureWindowsPath

from fastapi import HTTPException


def resolve_contained_path(base_dir: str | Path, relative_path: str) -> Path:
    """Resolve a relative output path and ensure it remains under its output root."""
    if not isinstance(relative_path, str) or not relative_path or "\x00" in relative_path:
        raise ValueError("File path is required and must be valid.")

    normalized = relative_path.replace("\\", "/")
    windows_path = PureWindowsPath(relative_path)
    posix_path = PurePosixPath(normalized)
    parts = normalized.split("/")

    if (
        windows_path.drive
        or windows_path.root
        or posix_path.is_absolute()
        or any(part in ("", ".", "..") for part in parts)
    ):
        raise ValueError("File path must be a safe relative path.")

    try:
        base = Path(base_dir).resolve()
        resolved = base.joinpath(*parts).resolve()
    except (OSError, RuntimeError) as exc:
        raise ValueError("File path cannot be safely resolved.") from exc
    try:
        resolved.relative_to(base)
    except ValueError as exc:
        raise ValueError("File path resolves outside the output directory.") from exc
    return resolved


def validate_output_filename(filename: str) -> str:
    """Validate a single output filename, rejecting path and Windows drive syntax."""
    if not isinstance(filename, str) or not filename or "\x00" in filename:
        raise ValueError("Filename is required and must be valid.")
    if (
        "/" in filename
        or "\\" in filename
        or ":" in filename
        or filename in (".", "..")
        or PureWindowsPath(filename).drive
        or PureWindowsPath(filename).root
    ):
        raise ValueError("Filename must not contain a path.")
    return filename


def safe_filename(filename: str) -> str:
    if not filename or filename.strip() == "":
        raise HTTPException(status_code=400, detail="Filename is required.")

    raw = filename.strip()
    if "/" in raw or "\\" in raw or ":" in raw or "\x00" in raw:
        raise HTTPException(status_code=400, detail="Invalid filename.")

    safe_name = os.path.basename(raw)

    if safe_name in ("", ".", "..") or safe_name != raw:
        raise HTTPException(status_code=400, detail="Invalid filename.")

    if ".." in safe_name:
        raise HTTPException(status_code=400, detail="Invalid filename.")

    return safe_name


def safe_path(base_dir: str, filename: str) -> Path:
    safe_name = safe_filename(filename)
    base = Path(base_dir).resolve()
    full_path = (base / safe_name).resolve()

    try:
        full_path.relative_to(base)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid file path.")

    return full_path
