from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.api.auth import can_access_project
from app.models.db import Project, User


def download_name(value: str) -> str:
    """Sanitizes project name for Content-Disposition download headers."""
    return "".join(
        character if character.isalnum() or character in "-_" else "-"
        for character in value
    ).strip("-") or "project"


def get_authorized_project(project_id: str, db: Session, user: Optional[User]) -> Project:
    """Retrieves project and enforces project access authorization."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project or not can_access_project(project, user):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project '{project_id}' not found.",
        )
    return project


def map_http_status_for_error_code(code: Optional[str]) -> Optional[int]:
    """Maps internal error codes to HTTP status codes for job error reporting."""
    if not code:
        return None
    code_upper = code.upper()
    if "404" in code_upper or code_upper in ("REPO_NOT_FOUND", "NOT_FOUND"):
        return 404
    if "403" in code_upper or code_upper in ("PRIVATE_REPO", "FORBIDDEN", "AUTH_FAILED"):
        return 403
    if "429" in code_upper or code_upper == "RATE_LIMITED":
        return 429
    if "408" in code_upper or code_upper in ("TIMEOUT", "CLONE_TIMEOUT"):
        return 408
    if "413" in code_upper or code_upper in ("REPO_TOO_LARGE", "CLONE_SIZE_EXCEEDED"):
        return 413
    if code_upper in ("INVALID_URL", "INVALID_GITHUB_URL"):
        return 400
    if code_upper in ("CLONE_FAILED", "GITHUB_CLONE_FAILED"):
        return 500
    return None
