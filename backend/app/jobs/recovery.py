import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session

from app.config import settings
from app.models.db import Job, JobState

logger = logging.getLogger(__name__)

# Permanent validation error codes that must NEVER be retried
NON_RETRYABLE_ERROR_CODES = {
    "EXCEEDED_LINE_LIMIT",
    "NO_SOURCE_FILES",
    "OVERSIZED_ZIP",
    "INVALID_ZIP",
    "EXCESSIVE_ENTRIES",
    "ENCRYPTED_ZIP",
    "FILE_TOO_LARGE",
    "SUSPICIOUS_PATH",
    "INVALID_GITHUB_URL",
    "REPO_NOT_FOUND",
    "PRIVATE_REPO",
    "PROJECT_NOT_FOUND",
    "AUTHENTICATION_REQUIRED",
    "FORBIDDEN",
}


def is_permanent_failure(error_code: Optional[str]) -> bool:
    """Returns True if the error is permanent and should never be retried."""
    if not error_code:
        return False
    return error_code.upper() in NON_RETRYABLE_ERROR_CODES


def recover_stale_jobs(
    db: Session,
    stale_timeout_seconds: Optional[int] = None,
    auto_retry: bool = False,
) -> int:
    """
    Scans for jobs left in intermediate states after an application restart or worker crash.
    Transitions stale jobs to FAILED or requeues them if auto_retry is True and retry budget remains.
    """
    timeout = stale_timeout_seconds or settings.JOB_STALE_TIMEOUT_SECONDS
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=timeout)

    stale_jobs: List[Job] = (
        db.query(Job)
        .filter(
            Job.state.in_([JobState.EXTRACTING, JobState.ANALYZING, JobState.GENERATING]),
            Job.updated_at < cutoff,
        )
        .all()
    )

    recovered_count = 0
    for job in stale_jobs:
        logger.warning(
            "Recovering stale job %s (state=%s, updated_at=%s, cutoff=%s)",
            job.id,
            job.state,
            job.updated_at,
            cutoff,
        )

        if auto_retry and job.retry_count < settings.JOB_MAX_RETRIES and not is_permanent_failure(job.error_code):
            job.retry_count += 1
            job.state = JobState.QUEUED
            job.stage = f"Requeued (retry {job.retry_count}/{settings.JOB_MAX_RETRIES})"
            job.progress_percentage = 0
            job.message = "Job automatically requeued after unexpected worker interruption."
            job.updated_at = datetime.now(timezone.utc)
        else:
            job.state = JobState.FAILED
            job.stage = "Failed"
            job.error_code = "STALE_JOB_TIMEOUT"
            job.error_message = f"Job timed out or worker process restarted without completion after {timeout}s."
            job.updated_at = datetime.now(timezone.utc)

        recovered_count += 1

    if recovered_count > 0:
        db.commit()
        logger.info("Successfully recovered %d stale/interrupted jobs.", recovered_count)

    return recovered_count
