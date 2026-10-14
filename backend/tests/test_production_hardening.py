import logging
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.main import app
from app.monitoring import (
    SanitizingFilter,
    get_all_metrics,
    get_liveness_status,
    get_readiness_status,
    get_startup_status,
    to_prometheus_format,
)
from app.models.db import Job, JobState
from app.database import SessionLocal


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_liveness_probe(client):
    """Liveness probe must return 200 OK with live=True and positive uptime."""
    resp = client.get("/api/health/liveness")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["live"] is True
    assert data["uptime_seconds"] >= 0

    # Also verify alias /api/liveness
    resp_alias = client.get("/api/liveness")
    assert resp_alias.status_code == 200


def test_readiness_probe_healthy(client):
    """Readiness probe must return 200 OK when DB is connected and storage is writable."""
    resp = client.get("/api/health/readiness")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ready"
    assert data["ready"] is True
    assert data["checks"]["database_reachable"] is True
    assert data["checks"]["database_schema_ready"] is True
    assert data["checks"]["workspace_storage_writable"] is True

    # Also verify alias /api/readiness
    resp_alias = client.get("/api/readiness")
    assert resp_alias.status_code == 200


def test_readiness_probe_database_failure():
    """Readiness probe must return 503 Service Unavailable when DB is unreachable."""
    with patch("app.monitoring.health.get_db_diagnostics", return_value={"reachable": False, "schema_ready": False}):
        code, body = get_readiness_status()
        assert code == 503
        assert body["ready"] is False
        assert body["status"] == "unready"
        assert body["checks"]["database_reachable"] is False


def test_startup_probe(client):
    """Startup probe must return 200 OK with initialized=True once lifespan executes."""
    resp = client.get("/api/health/startup")
    assert resp.status_code == 200
    data = resp.json()
    assert data["initialized"] is True


def test_request_id_injected_in_headers(client):
    """Every request must be assigned an X-Request-ID header in the response."""
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert "X-Request-ID" in resp.headers
    assert resp.headers["X-Request-ID"].startswith("req_")


def test_custom_request_id_propagated(client):
    """A client-supplied X-Request-ID should be preserved for distributed tracing."""
    custom_id = "trace-client-12345"
    resp = client.get("/api/health", headers={"X-Request-ID": custom_id})
    assert resp.status_code == 200
    assert resp.headers["X-Request-ID"] == custom_id


def test_sensitive_data_sanitizing_filter():
    """SanitizingFilter must redact credentials, tokens, cookies, and raw source code."""
    filter_instance = SanitizingFilter()

    # 1. Redact passwords and tokens
    record1 = logging.LogRecord(
        name="test",
        level=logging.INFO,
        pathname="test.py",
        lineno=10,
        msg="Login failed for user with password='SuperSecretPassword123' and token=eyJhbGciOi",
        args=(),
        exc_info=None,
    )
    filter_instance.filter(record1)
    assert "SuperSecretPassword123" not in record1.msg
    assert "[REDACTED]" in record1.msg

    # 2. Redact Bearer tokens
    record2 = logging.LogRecord(
        name="test",
        level=logging.INFO,
        pathname="test.py",
        lineno=11,
        msg="Authorization header: Bearer abc123xyz789SECRET",
        args=(),
        exc_info=None,
    )
    filter_instance.filter(record2)
    assert "abc123xyz789SECRET" not in record2.msg
    assert "Bearer [REDACTED]" in record2.msg

    # 3. Redact large source code dumps
    code_blob = "def secret_business_logic():\n    return 42\n" * 20
    record3 = logging.LogRecord(
        name="test",
        level=logging.INFO,
        pathname="test.py",
        lineno=12,
        msg=f"Dumped code: {code_blob}",
        args=(),
        exc_info=None,
    )
    filter_instance.filter(record3)
    assert "secret_business_logic" not in record3.msg
    assert "[REDACTED_SOURCE_CODE_BLOB]" in record3.msg


def test_prometheus_metrics_endpoint(client):
    """GET /api/metrics must return valid Prometheus text exposition."""
    resp = client.get("/api/metrics")
    assert resp.status_code == 200
    assert "text/plain" in resp.headers["content-type"]
    body = resp.text
    assert "codeoracle_requests_total" in body
    assert "codeoracle_database_up" in body
    assert "codeoracle_disk_used_percent" in body


def test_json_metrics_endpoint(client):
    """GET /api/health/metrics must return structured telemetry object."""
    resp = client.get("/api/health/metrics")
    assert resp.status_code == 200
    data = resp.json()
    assert "requests" in data
    assert "jobs" in data
    assert "queue" in data
    assert "database" in data
    assert "disk" in data
    assert data["database"]["reachable"] is True
    assert data["disk"]["disk_total_bytes"] > 0


def test_cold_start_recovery_of_interrupted_jobs():
    """Interrupted jobs from a server restart must be transitioned to FAILED."""
    from app.ingestion.service import recover_interrupted_jobs

    db = SessionLocal()
    try:
        # Create an artificial running job
        test_job = Job(
            id="job_restart_test",
            state=JobState.ANALYZING,
            stage="Running static analysis...",
            progress_percentage=60,
            source_type="zip",
        )
        db.add(test_job)
        db.commit()

        # Simulate restart recovery
        recovered_count = recover_interrupted_jobs(db)
        assert recovered_count >= 1

        db.refresh(test_job)
        assert test_job.state == JobState.FAILED
        assert test_job.error_code == "INTERRUPTED"
    finally:
        # Cleanup
        db.delete(test_job)
        db.commit()
        db.close()
