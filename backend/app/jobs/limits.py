import logging
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.models.db import Job, JobState

logger = logging.getLogger(__name__)

ACTIVE_JOB_STATES = [
    JobState.QUEUED,
    JobState.EXTRACTING,
    JobState.ANALYZING,
    JobState.GENERATING,
]


def enforce_user_concurrency_limit(
    db: Session,
    user_id: Optional[str] = None,
    max_concurrent: Optional[int] = None,
) -> None:
    """
    Enforces per-user concurrency limits for background jobs.
    Rejects with 429 Too Many Requests if the user already has too many active jobs.
    """
    limit = max_concurrent or settings.MAX_CONCURRENT_JOBS_PER_USER
    if not user_id:
        # Guests are allowed up to the same limit across non-authenticated sessions
        active_count = (
            db.query(Job)
            .filter(
                Job.user_id.is_(None),
                Job.state.in_(ACTIVE_JOB_STATES),
            )
            .count()
        )
        if active_count >= limit * 2:  # pool for all concurrent guests
            logger.warning("Guest concurrency limit reached: %d active jobs", active_count)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many concurrent operations in progress. Please wait for running jobs to finish.",
            )
        return

    active_count = (
        db.query(Job)
        .filter(
            Job.user_id == user_id,
            Job.state.in_(ACTIVE_JOB_STATES),
        )
        .count()
    )

    if active_count >= limit:
        logger.warning("User %s exceeded concurrency limit (%d >= %d)", user_id, active_count, limit)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Maximum concurrent active jobs ({limit}) exceeded. Please wait for running jobs to complete.",
        )


def find_active_job_for_project(
    db: Session,
    project_id: str,
    source_type: Optional[str] = None,
) -> Optional[Job]:
    """
    Finds any in-flight active job for a project to support idempotent job submissions.
    """
    query = db.query(Job).filter(
        Job.project_id == project_id,
        Job.state.in_(ACTIVE_JOB_STATES),
    )
    if source_type:
        query = query.filter(Job.source_type == source_type)
    return query.order_by(Job.created_at.desc()).first()
