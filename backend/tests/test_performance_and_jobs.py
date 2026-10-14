import pytest
from datetime import datetime, timezone, timedelta
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.analysis.models import ANALYZER_VERSION
from app.config import settings
from app.database import Base, get_db
from app.jobs.limits import enforce_user_concurrency_limit, find_active_job_for_project
from app.jobs.queue import cancel_job, get_queue_health, is_job_cancelled
from app.jobs.recovery import is_permanent_failure, recover_stale_jobs
from app.main import app
from app.models.db import Job, JobState, Project, ProjectAnalysisRecord, User


@pytest.fixture
def test_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client(test_db):
    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# 1. Cache-Key Verification: Analyzer Version + Content Hash
def test_analysis_cache_hit_returns_completed_job_without_reanalyzing(client, test_db):
    user = User(id="usr_p5", email="p5@example.com", hashed_password="fake")
    project = Project(
        id="proj_p5_cached",
        user_id="usr_p5",
        is_public_demo=True,
        display_name="CachedProj",
        source_type="zip",
        content_hash="hash_abc123",
        workspace_id="ws_p5_cached",
        total_files=5,
        total_lines=100,
    )
    analysis_record = ProjectAnalysisRecord(
        id="analysis_proj_p5_cached",
        project_id="proj_p5_cached",
        analyzer_version=ANALYZER_VERSION,
        content_hash="hash_abc123",
        analysis_data={"project_id": "proj_p5_cached", "total_files": 5, "total_lines": 100},
    )
    test_db.add_all([user, project, analysis_record])
    test_db.commit()

    resp = client.post("/api/projects/proj_p5_cached/analyze", json={"force": False})
    assert resp.status_code == status.HTTP_200_OK or resp.status_code == status.HTTP_202_ACCEPTED
    data = resp.json()
    assert data["state"] == "completed"
    assert data["progress_percentage"] == 100
    assert "cache hit" in data["message"].lower()


# 2. Idempotent Job Submission
def test_idempotent_job_submission_returns_existing_active_job(client, test_db):
    project = Project(
        id="proj_p5_active",
        is_public_demo=True,
        display_name="ActiveJobProj",
        source_type="zip",
        content_hash="hash_active",
        workspace_id="ws_active",
        total_files=2,
        total_lines=50,
    )
    existing_job = Job(
        id="job_active_existing",
        state=JobState.ANALYZING,
        stage="Analyzing dependencies...",
        progress_percentage=45,
        source_type="analysis",
        project_id="proj_p5_active",
        message="Active analysis",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    test_db.add_all([project, existing_job])
    test_db.commit()

    # Trigger analyze again while previous job is still running
    resp = client.post("/api/projects/proj_p5_active/analyze", json={"force": True})
    assert resp.status_code in (status.HTTP_200_OK, status.HTTP_202_ACCEPTED)
    data = resp.json()
    assert data["job_id"] == "job_active_existing"
    assert data["state"] == "analyzing"
    assert "already in progress" in data["message"].lower()

    # Verify no second job was created
    all_jobs = test_db.query(Job).filter(Job.project_id == "proj_p5_active").all()
    assert len(all_jobs) == 1


# 3. Explicit Job Cancellation Semantics
def test_job_cancellation_semantics(client, test_db):
    job = Job(
        id="job_to_cancel",
        state=JobState.QUEUED,
        stage="Queued",
        progress_percentage=0,
        source_type="zip",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    test_db.add(job)
    test_db.commit()

    resp = client.post("/api/jobs/job_to_cancel/cancel")
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    assert data["state"] == "cancelled"
    assert data["stage"] == "Cancelled"

    # Verify in DB
    refreshed = test_db.query(Job).filter(Job.id == "job_to_cancel").first()
    assert refreshed.state == JobState.CANCELLED
    assert is_job_cancelled(test_db, "job_to_cancel") is True


# 4. Job Cancellation Rejection for Terminal States
def test_job_cancellation_rejected_for_completed_or_failed_job(client, test_db):
    completed_job = Job(
        id="job_already_done",
        state=JobState.COMPLETED,
        stage="Completed",
        progress_percentage=100,
        source_type="zip",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    test_db.add(completed_job)
    test_db.commit()

    resp = client.post("/api/jobs/job_already_done/cancel")
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert "already in terminal state" in resp.json()["detail"]


# 5. Stale-Job Recovery & Restart Durability
def test_stale_job_recovery_marks_expired_jobs_failed(test_db):
    stale_time = datetime.now(timezone.utc) - timedelta(seconds=700)
    job_stale = Job(
        id="job_stuck_midflight",
        state=JobState.ANALYZING,
        stage="Analyzing...",
        progress_percentage=50,
        source_type="analysis",
        retry_count=settings.JOB_MAX_RETRIES,  # Exhausted retries
        created_at=stale_time,
        updated_at=stale_time,
    )
    test_db.add(job_stale)
    test_db.commit()

    recovered = recover_stale_jobs(test_db, stale_timeout_seconds=600, auto_retry=True)
    assert recovered == 1

    test_db.refresh(job_stale)
    assert job_stale.state == JobState.FAILED
    assert job_stale.error_code == "STALE_JOB_TIMEOUT"


# 6. Auto-Retry Policy for Transient Interrupted Jobs
def test_transient_interrupted_jobs_requeued_if_budget_remains(test_db):
    stale_time = datetime.now(timezone.utc) - timedelta(seconds=700)
    job_transient = Job(
        id="job_transient_crash",
        state=JobState.EXTRACTING,
        stage="Extracting...",
        progress_percentage=25,
        source_type="zip",
        retry_count=0,  # Has retry budget remaining
        created_at=stale_time,
        updated_at=stale_time,
    )
    test_db.add(job_transient)
    test_db.commit()

    recovered = recover_stale_jobs(test_db, stale_timeout_seconds=600, auto_retry=True)
    assert recovered == 1

    test_db.refresh(job_transient)
    assert job_transient.state == JobState.QUEUED
    assert job_transient.retry_count == 1
    assert "requeued" in job_transient.stage.lower()


# 7. Permanent Failure Filter (Do Not Retry Validation Errors)
def test_permanent_failures_never_retried(test_db):
    assert is_permanent_failure("EXCESSIVE_ENTRIES") is True
    assert is_permanent_failure("OVERSIZED_ZIP") is True
    assert is_permanent_failure("NO_SOURCE_FILES") is True
    assert is_permanent_failure("REPO_NOT_FOUND") is True
    assert is_permanent_failure("DATABASE_DISCONNECTED") is False

    stale_time = datetime.now(timezone.utc) - timedelta(seconds=700)
    perm_job = Job(
        id="job_perm_fail",
        state=JobState.EXTRACTING,
        stage="Extracting...",
        source_type="zip",
        error_code="OVERSIZED_ZIP",
        retry_count=0,
        created_at=stale_time,
        updated_at=stale_time,
    )
    test_db.add(perm_job)
    test_db.commit()

    recover_stale_jobs(test_db, stale_timeout_seconds=600, auto_retry=True)
    test_db.refresh(perm_job)
    assert perm_job.state == JobState.FAILED
    assert perm_job.retry_count == 0  # Was not retried


# 8. Per-User Concurrency Limits (HTTP 429)
def test_per_user_concurrency_limit_enforced(test_db):
    user_id = "usr_limit_test"
    # Create maximum active jobs for this user
    for i in range(settings.MAX_CONCURRENT_JOBS_PER_USER):
        job = Job(
            id=f"job_limit_{i}",
            user_id=user_id,
            state=JobState.ANALYZING,
            stage="Working...",
            source_type="analysis",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        test_db.add(job)
    test_db.commit()

    # Attempting to start another should raise 429
    with pytest.raises(Exception) as exc_info:
        enforce_user_concurrency_limit(test_db, user_id=user_id)
    assert "429" in str(exc_info.value) or "Maximum concurrent" in str(exc_info.value)


# 9. Queue Health & Capacity Endpoint
def test_queue_health_endpoint(client, test_db):
    resp = client.get("/api/jobs/queue/health")
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    assert data["status"] in ("healthy", "degraded")
    assert "queued_jobs" in data
    assert "active_jobs" in data
    assert data["max_worker_concurrency"] == settings.MAX_CONCURRENT_WORKERS
    assert data["database_connected"] is True
