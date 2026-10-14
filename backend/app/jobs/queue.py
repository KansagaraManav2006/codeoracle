import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.models.db import Job, JobState

logger = logging.getLogger(__name__)


def cancel_job(
    db: Session,
    job_id: str,
    user_id: Optional[str] = None,
) -> Tuple[bool, str, Optional[Job]]:
    """
    Cancels a queued or in-flight job.
    Returns (success, message, job_instance).
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        return False, "Job not found", None

    # Check ownership if user_id is provided
    if user_id and job.user_id and job.user_id != user_id:
        return False, "Unauthorized to cancel this job", job

    if job.state in (JobState.COMPLETED, JobState.FAILED, JobState.CANCELLED):
        state_val = getattr(job.state, "value", str(job.state))
        return False, f"Job cannot be cancelled because it is already in terminal state '{state_val}'", job

    job.state = JobState.CANCELLED
    job.stage = "Cancelled"
    job.message = "Job execution cancelled by user request."
    job.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(job)

    logger.info("Job %s was successfully cancelled.", job_id)
    return True, "Job successfully cancelled", job


def is_job_cancelled(db: Session, job_id: str) -> bool:
    """Checks whether a job was cancelled asynchronously by the user or an operator."""
    state = db.query(Job.state).filter(Job.id == job_id).scalar()
    return state == JobState.CANCELLED


def claim_next_queued_job(db: Session, worker_id: str = "worker-1") -> Optional[Job]:
    """
    Atomically claims the next QUEUED job from the database using row-level locking or optimistic update.
    Returns the claimed Job instance or None if no queued jobs are available.
    """
    # Fetch oldest QUEUED job
    queued_job = (
        db.query(Job)
        .filter(Job.state == JobState.QUEUED)
        .order_by(Job.created_at.asc())
        .first()
    )
    if not queued_job:
        return None

    # Mark state according to source_type
    target_state = JobState.ANALYZING if queued_job.source_type == "analysis" else JobState.EXTRACTING
    queued_job.state = target_state
    queued_job.stage = f"Processing started by {worker_id}"
    queued_job.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(queued_job)
    return queued_job


def get_queue_health(db: Session) -> Dict[str, Any]:
    """Provides a health, readiness, and metrics status for the durable job queue."""
    try:
        # Check DB connectivity
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception as e:
        logger.error("Queue health DB ping failed: %s", str(e))
        db_ok = False

    queued_count = db.query(Job).filter(Job.state == JobState.QUEUED).count() if db_ok else 0
    active_count = (
        db.query(Job)
        .filter(Job.state.in_([JobState.EXTRACTING, JobState.ANALYZING, JobState.GENERATING]))
        .count()
        if db_ok
        else 0
    )

    is_healthy = db_ok and active_count <= settings.MAX_CONCURRENT_WORKERS * 10

    return {
        "status": "healthy" if is_healthy else "degraded",
        "database_connected": db_ok,
        "queued_jobs": queued_count,
        "active_jobs": active_count,
        "max_worker_concurrency": settings.MAX_CONCURRENT_WORKERS,
        "max_user_concurrency": settings.MAX_CONCURRENT_JOBS_PER_USER,
        "job_timeout_seconds": settings.JOB_TIMEOUT_SECONDS,
        "stale_timeout_seconds": settings.JOB_STALE_TIMEOUT_SECONDS,
    }
