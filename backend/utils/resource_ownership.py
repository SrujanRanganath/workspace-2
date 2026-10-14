"""
Resource ownership tracking and cross-user authorization.

Ownership is kept in memory and persisted under the application-owned
resource_owners/ directory so checks survive process restarts. User A cannot
read, modify, delete, download, or trigger actions on User B's tool resources.
"""
from __future__ import annotations

import os
import threading
from pathlib import Path
from typing import Any, Optional

from fastapi import HTTPException

from utils.file_security import resolve_contained_path, safe_filename

_LOCK = threading.RLock()
_OWNERSHIP_MAP: dict[tuple[str, str], str] = {}
_BACKEND_ROOT = Path(__file__).resolve().parent.parent
_STORE_DIR = _BACKEND_ROOT / "resource_owners"

_CLAIM_DENIED = "Access denied: A {resource_type} with this name belongs to another user."
_ACCESS_DENIED = "Access denied: You do not have permission to {action} this {resource_type}."
_PERSIST_FAILED = "Unable to persist resource ownership."


def get_user_identifier(user: Any) -> str:
    """Extract a consistent identifier from a User or user-like object."""
    if user is None:
        return "anonymous"
    user_id = getattr(user, "id", None)
    if user_id is not None:
        return f"user_{user_id}"
    email = getattr(user, "email", None)
    if email:
        return f"email_{email}"
    return "anonymous"


def _canonical_resource_id(resource_id: str) -> str:
    """Normalize IDs so case variants cannot split ownership on Windows."""
    return str(resource_id).strip().casefold()


def _normalized_key(resource_type: str, resource_id: str) -> tuple[str, str]:
    return (str(resource_type).strip(), _canonical_resource_id(resource_id))


def _owner_file(resource_type: str, resource_id: str) -> Path:
    type_name = safe_filename(resource_type)
    id_name = safe_filename(_canonical_resource_id(resource_id))
    type_dir = resolve_contained_path(_STORE_DIR, type_name)
    type_dir.mkdir(parents=True, exist_ok=True)
    return resolve_contained_path(type_dir, f"{id_name}.owner")


def _read_owner_file(owner_path: Path) -> Optional[str]:
    if not owner_path.is_file():
        return None
    owner = owner_path.read_text(encoding="utf-8").strip()
    return owner or None


def _write_new_owner_file(owner_path: Path, owner: str) -> None:
    flags = os.O_CREAT | os.O_EXCL | os.O_WRONLY
    if hasattr(os, "O_BINARY"):
        flags |= os.O_BINARY
    fd = os.open(str(owner_path), flags)
    try:
        os.write(fd, owner.encode("utf-8"))
    except Exception:
        try:
            os.close(fd)
        except OSError:
            pass
        try:
            owner_path.unlink()
        except OSError:
            pass
        raise
    os.close(fd)


def _load_owner(resource_type: str, resource_id: str) -> Optional[str]:
    key = _normalized_key(resource_type, resource_id)
    with _LOCK:
        cached = _OWNERSHIP_MAP.get(key)
        if cached is not None:
            return cached
    try:
        owner_path = _owner_file(resource_type, resource_id)
        owner = _read_owner_file(owner_path)
        if owner:
            with _LOCK:
                _OWNERSHIP_MAP[key] = owner
            return owner
    except (OSError, ValueError, HTTPException):
        return None
    return None


def _persist_new_owner(resource_type: str, resource_id: str, owner: str) -> None:
    try:
        owner_path = _owner_file(resource_type, resource_id)
        _write_new_owner_file(owner_path, owner)
    except FileExistsError as exc:
        raise FileExistsError from exc
    except (OSError, ValueError) as exc:
        raise HTTPException(status_code=500, detail=_PERSIST_FAILED) from exc


def register_resource_owner(resource_type: str, resource_id: str, user: Any) -> None:
    """Register the owner of a newly generated or saved resource."""
    check_and_claim_resource(resource_type, resource_id, user)


def check_resource_access(resource_type: str, resource_id: str, user: Any, action: str = "access") -> None:
    """
    Verify that the current user owns the requested resource.
    Raises HTTP 403 if another user owns it or the resource is unclaimed.
    Unclaimed existing files are denied so leftover shared-directory objects
    cannot be read after a restart.
    """
    current = get_user_identifier(user)
    owner = _load_owner(resource_type, resource_id)
    if owner is None or owner != current:
        raise HTTPException(
            status_code=403,
            detail=_ACCESS_DENIED.format(action=action, resource_type=resource_type),
        )


def check_and_claim_resource(resource_type: str, resource_id: str, user: Any) -> None:
    """
    Atomically verify write permission and assign ownership.

    Prevents overwriting another user's existing resource. Durable registration
    must succeed before the in-memory map is updated.
    """
    current = get_user_identifier(user)
    key = _normalized_key(resource_type, resource_id)

    with _LOCK:
        owner = _OWNERSHIP_MAP.get(key)
        if owner is None:
            try:
                owner = _read_owner_file(_owner_file(resource_type, resource_id))
            except (OSError, ValueError) as exc:
                raise HTTPException(status_code=500, detail=_PERSIST_FAILED) from exc

        if owner is not None and owner != current:
            raise HTTPException(
                status_code=403,
                detail=_CLAIM_DENIED.format(resource_type=resource_type),
            )

        if owner == current:
            _OWNERSHIP_MAP[key] = current
            return

        try:
            _persist_new_owner(resource_type, resource_id, current)
        except FileExistsError:
            try:
                existing = _read_owner_file(_owner_file(resource_type, resource_id))
            except (OSError, ValueError) as exc:
                raise HTTPException(status_code=500, detail=_PERSIST_FAILED) from exc
            if existing != current:
                raise HTTPException(
                    status_code=403,
                    detail=_CLAIM_DENIED.format(resource_type=resource_type),
                )
            _OWNERSHIP_MAP[key] = current
            return

        _OWNERSHIP_MAP[key] = current


def clear_ownership_for_testing() -> None:
    """Reset the in-memory ownership registry for test isolation."""
    with _LOCK:
        _OWNERSHIP_MAP.clear()
