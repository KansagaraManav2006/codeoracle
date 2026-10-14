import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.auth import can_access_project, get_current_user, get_current_user_optional
from app.api.helpers import map_http_status_for_error_code
from app.api.rate_limiter import rate_limit
from app.config import settings
from app.database import get_db
from app.ingestion.discovery import IngestionError
from app.ingestion.github_ingest import normalize_github_url, validate_github_url
from app.ingestion.service import process_github_job, process_zip_job
from app.ingestion.zip_ingest import validate_zip_stream
from app.jobs.limits import enforce_user_concurrency_limit
from app.jobs.queue import cancel_job, get_queue_health
from app.models.db import Job, JobState, Project, User
from app.models.schema import GitHubIngestRequest, JobResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["jobs"])


@router.post(
    "/jobs/upload",
    response_model=JobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(rate_limit("zip_upload", max_requests=10, window_seconds=60))],
)
def submit_zip_upload(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JobResponse:
    """Accepts legacy codebase ZIP archive upload and initializes ingestion job."""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename missing in upload request.",
        )

    enforce_user_concurrency_limit(db, current_user.id if current_user else None)

    try:
        validate_zip_stream(file.file)
    except IngestionError as ie:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=ie.message)

    workspace_id = f"ws_{uuid.uuid4().hex[:12]}"
    job_id = f"job_{uuid.uuid4().hex[:12]}"
    temp_zip_path = Path(settings.TEMP_DIR) / f"{job_id}.zip"

    try:
        temp_zip_path.parent.mkdir(parents=True, exist_ok=True)
        file.file.seek(0)
        with temp_zip_path.open("wb") as buffer:
            for chunk in iter(lambda: file.file.read(1024 * 1024), b""):
                buffer.write(chunk)
    except Exception:
        logger.exception("Failed to write temporary ZIP upload file")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to store upload archive on server.",
        )

    display_name = Path(file.filename).stem

    job = Job(
        id=job_id,
        user_id=current_user.id if current_user else None,
        state=JobState.QUEUED,
        stage="Queued",
        progress_percentage=0,
        source_type="zip",
        source_url=None,
        project_id=None,
        message="ZIP upload received and queued for extraction.",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    db.add(job)
    db.commit()

    background_tasks.add_task(process_zip_job, job_id, workspace_id, temp_zip_path, display_name)

    return JobResponse(
        job_id=job_id,
        state=JobState.QUEUED,
        stage="Queued",
        progress_percentage=0,
        source_type="zip",
        source_url=None,
        project_id=None,
        message="ZIP upload received and queued for extraction.",
        polling_url=f"/api/jobs/{job_id}",
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


@router.post(
    "/jobs/github",
    response_model=JobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(rate_limit("github_ingest", max_requests=10, window_seconds=60))],
)
def submit_github_repo(
    payload: GitHubIngestRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JobResponse:
    """Accepts public GitHub repository URL and initializes cloning and ingestion job."""
    cleaned_input = normalize_github_url(payload.repo_url)
    try:
        clean_url = validate_github_url(cleaned_input)
    except IngestionError as ie:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=ie.message)

    enforce_user_concurrency_limit(db, current_user.id if current_user else None)

    workspace_id = f"ws_{uuid.uuid4().hex[:12]}"
    job_id = f"job_{uuid.uuid4().hex[:12]}"

    job = Job(
        id=job_id,
        user_id=current_user.id if current_user else None,
        state=JobState.QUEUED,
        stage="Queued",
        progress_percentage=0,
        source_type="github",
        source_url=clean_url,
        project_id=None,
        message="GitHub repository URL received and queued for cloning.",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    db.add(job)
    db.commit()

    background_tasks.add_task(process_github_job, job_id, workspace_id, clean_url)

    return JobResponse(
        job_id=job_id,
        state=JobState.QUEUED,
        stage="Queued",
        progress_percentage=0,
        source_type="github",
        source_url=clean_url,
        project_id=None,
        message="GitHub repository URL received and queued for cloning.",
        polling_url=f"/api/jobs/{job_id}",
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


@router.get("/jobs/{job_id}", response_model=JobResponse)
def get_job_status(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> JobResponse:
    """Retrieves status and progress details for an ingestion or analysis job."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_id}' not found.",
        )
    if job.user_id is not None:
        if not current_user or current_user.id != job.user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job '{job_id}' not found.",
            )
    elif job.project_id:
        proj = db.query(Project).filter(Project.id == job.project_id).first()
        if proj and not can_access_project(proj, current_user):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job '{job_id}' not found.",
            )

    http_status = map_http_status_for_error_code(job.error_code)
    technical_message = job.message if job.state == JobState.FAILED else None

    return JobResponse(
        job_id=job.id,
        state=job.state,
        stage=job.stage,
        progress_percentage=job.progress_percentage,
        source_type=job.source_type,
        source_url=job.source_url,
        project_id=job.project_id,
        message=job.message,
        error_code=job.error_code,
        error_message=job.error_message,
        technical_message=technical_message,
        http_status=http_status,
        polling_url=f"/api/jobs/{job.id}",
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


@router.post("/jobs/{job_id}/cancel", response_model=JobResponse)
def cancel_job_endpoint(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> JobResponse:
    """Cancels an in-flight or queued background job with explicit cancellation semantics."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_id}' not found.",
        )

    if job.user_id is not None:
        if not current_user or current_user.id != job.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to cancel this job.",
            )
    elif job.project_id:
        proj = db.query(Project).filter(Project.id == job.project_id).first()
        if proj and not can_access_project(proj, current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to cancel this job.",
            )

    success, msg, updated_job = cancel_job(db, job_id, user_id=current_user.id if current_user else None)
    if not success or not updated_job:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=msg,
        )

    return JobResponse(
        job_id=updated_job.id,
        state=updated_job.state,
        stage=updated_job.stage,
        progress_percentage=updated_job.progress_percentage,
        source_type=updated_job.source_type,
        source_url=updated_job.source_url,
        project_id=updated_job.project_id,
        message=updated_job.message,
        polling_url=f"/api/jobs/{updated_job.id}",
        created_at=updated_job.created_at,
        updated_at=updated_job.updated_at,
    )


@router.get("/jobs/queue/health")
def queue_health_endpoint(db: Session = Depends(get_db)):
    """Reports health, readiness, and capacity of the durable job queue."""
    return get_queue_health(db)
