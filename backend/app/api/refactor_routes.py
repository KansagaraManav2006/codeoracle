import io
import logging
import zipfile
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.auth import get_current_user_optional
from app.api.helpers import get_authorized_project
from app.api.rate_limiter import rate_limit
from app.database import get_db
from app.jobs.limits import enforce_user_concurrency_limit
from app.models.db import ProjectRefactorRecord, User
from app.refactor.models import GenerateRefactorRequest, ProjectRefactorResult
from app.refactor.service import run_refactor_for_project
from app.refactor.verification_models import RefactorVerificationResult, VerifyRefactorRequest
from app.refactor.verification_service import run_refactor_verification

logger = logging.getLogger(__name__)

router = APIRouter(tags=["refactor"])


@router.post(
    "/projects/{project_id}/refactor",
    response_model=ProjectRefactorResult,
    dependencies=[Depends(rate_limit("refactor", max_requests=15, window_seconds=60))],
)
def generate_project_refactor(
    project_id: str,
    payload: GenerateRefactorRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> ProjectRefactorResult:
    """Builds a non-destructive modernization proposal with diffs and risk warnings."""
    get_authorized_project(project_id, db, current_user)
    enforce_user_concurrency_limit(db, current_user.id if current_user else None)
    try:
        return run_refactor_for_project(db, project_id, force=payload.force)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        logger.exception("Failed to generate refactor proposal for %s: %s", project_id, exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to generate refactor proposal.")


@router.get("/projects/{project_id}/refactor", response_model=ProjectRefactorResult)
def get_project_refactor(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> ProjectRefactorResult:
    get_authorized_project(project_id, db, current_user)
    record = db.query(ProjectRefactorRecord).filter(ProjectRefactorRecord.project_id == project_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Refactor proposal unavailable. Generate it first.")
    return ProjectRefactorResult.model_validate(record.refactor_data)


@router.post(
    "/projects/{project_id}/refactor/verify",
    response_model=RefactorVerificationResult,
    dependencies=[Depends(rate_limit("verify", max_requests=15, window_seconds=60))],
)
def verify_project_refactor(
    project_id: str,
    payload: VerifyRefactorRequest = VerifyRefactorRequest(),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> RefactorVerificationResult:
    """Executes verified modernization loop in ephemeral disposable workspace (trusted demo only)."""
    get_authorized_project(project_id, db, current_user)
    try:
        return run_refactor_verification(db, project_id, force=payload.force)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        logger.exception("Refactor verification failed for project %s: %s", project_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Refactor verification failed unexpectedly.",
        )


@router.get("/projects/{project_id}/refactor/verify", response_model=RefactorVerificationResult)
def get_refactor_verification(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> RefactorVerificationResult:
    """Retrieves refactor verification result or executes baseline verification."""
    get_authorized_project(project_id, db, current_user)
    record = db.query(ProjectRefactorRecord).filter(ProjectRefactorRecord.project_id == project_id).first()
    if record and "verification" in record.refactor_data:
        try:
            return RefactorVerificationResult.model_validate(record.refactor_data["verification"])
        except Exception:
            pass
    return run_refactor_verification(db, project_id, force=False)


@router.get("/projects/{project_id}/refactor/download")
def download_project_refactor(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    get_authorized_project(project_id, db, current_user)
    record = db.query(ProjectRefactorRecord).filter(ProjectRefactorRecord.project_id == project_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Refactor proposal unavailable. Generate it first.")
    result = ProjectRefactorResult.model_validate(record.refactor_data)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as archive:
        for item in result.files:
            if item.changed and item.syntax_valid:
                archive.writestr(f"modernized/{item.relative_path}", item.refactored_code)
                archive.writestr(f"diffs/{item.relative_path}.diff", item.unified_diff)
        report = [
            "# CodeOracle Refactor Review",
            "",
            result.summary,
            "",
            "## Safety",
            "",
            "These are proposals, not automatically applied changes. Review diffs and run tests before merging.",
            "",
        ]
        for item in result.files:
            if not item.changed:
                continue
            report.extend([f"## {item.relative_path}", ""] + [f"- {change}" for change in item.changes])
            report.extend([f"- WARNING [{warning.code}]: {warning.message}" for warning in item.warnings])
            report.append("")
        archive.writestr("REVIEW.md", "\n".join(report))
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=codeoracle_refactor_{project_id}.zip"},
    )
