import os
import shutil
import threading
import time
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.config import settings

# Thread-safe lock for metrics recording
_lock = threading.Lock()

# Request counters
_request_total: Dict[str, int] = defaultdict(int)
_request_errors_total: Dict[str, int] = defaultdict(int)
_request_durations_ms: List[float] = []

# Job metrics
_job_executions_total: Dict[str, int] = defaultdict(int)
_job_failures_total: Dict[str, int] = defaultdict(int)
_job_durations_seconds: Dict[str, List[float]] = defaultdict(list)
_active_jobs_count: int = 0


def _normalize_path(path: str) -> str:
    """Collapses dynamic resource IDs in URL paths for bounded metrics cardinality."""
    if not path:
        return "/"
    # Strip query parameters
    path = path.split("?")[0]
    segments = path.strip("/").split("/")
    norm_segments = []
    skip_next = False

    for i, seg in enumerate(segments):
        if skip_next:
            skip_next = False
            continue
        if seg in ("projects", "jobs", "users") and i + 1 < len(segments):
            norm_segments.append(seg)
            norm_segments.append(":id")
            skip_next = True
        elif len(seg) >= 24 or seg.isdigit() or (len(seg) == 32 and all(c in "0123456789abcdef" for c in seg.lower())):
            norm_segments.append(":id")
        else:
            norm_segments.append(seg)

    return "/" + "/".join(norm_segments)


def record_request_metric(
    method: str,
    path: str,
    status_code: int,
    duration_ms: float,
    error_category: Optional[str] = None,
) -> None:
    norm_path = _normalize_path(path)
    key = f"{method.upper()}|{norm_path}|{status_code}"

    with _lock:
        _request_total[key] += 1
        if error_category and (status_code >= 400):
            err_key = f"{method.upper()}|{norm_path}|{error_category}"
            _request_errors_total[err_key] += 1

        # Keep rolling window of last 1000 request durations
        _request_durations_ms.append(duration_ms)
        if len(_request_durations_ms) > 1000:
            _request_durations_ms.pop(0)


def record_job_start() -> None:
    global _active_jobs_count
    with _lock:
        _active_jobs_count += 1


def record_job_completion(
    job_type: str,
    outcome: str,  # 'completed', 'failed', 'cancelled'
    duration_seconds: float,
    failure_reason_category: Optional[str] = None,
) -> None:
    global _active_jobs_count
    with _lock:
        _active_jobs_count = max(0, _active_jobs_count - 1)
        exec_key = f"{job_type}|{outcome}"
        _job_executions_total[exec_key] += 1

        if outcome == "failed" and failure_reason_category:
            fail_key = f"{job_type}|{failure_reason_category}"
            _job_failures_total[fail_key] += 1

        durations = _job_durations_seconds[job_type]
        durations.append(round(duration_seconds, 2))
        if len(durations) > 200:
            durations.pop(0)


def get_disk_usage_metrics() -> Dict[str, Any]:
    """Inspects workspace and temporary storage disk consumption."""
    workspace_dir = Path(settings.WORKSPACES_DIR).resolve()
    temp_dir = Path(settings.TEMP_STORAGE_DIR).resolve()

    target_path = workspace_dir if workspace_dir.exists() else Path.cwd()
    try:
        total, used, free = shutil.disk_usage(target_path)
        pct = round((used / total) * 100, 2) if total > 0 else 0.0
    except Exception:
        total, used, free, pct = 0, 0, 0, 0.0

    # Calculate actual size of CodeOracle workspace directory
    workspace_size_bytes = 0
    if workspace_dir.exists():
        try:
            for p in workspace_dir.rglob("*"):
                if p.is_file():
                    workspace_size_bytes += p.stat().st_size
        except Exception:
            pass

    return {
        "disk_total_bytes": total,
        "disk_used_bytes": used,
        "disk_free_bytes": free,
        "disk_used_percent": pct,
        "workspace_storage_bytes": workspace_size_bytes,
        "workspace_path": str(workspace_dir),
    }


def get_database_health_metrics() -> Dict[str, Any]:
    """Pings database and measures latency."""
    from app.database import engine, get_db_diagnostics
    from sqlalchemy import text

    diagnostics = get_db_diagnostics()
    ping_start = time.perf_counter()
    ping_ok = False
    ping_latency_ms = 0.0

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            ping_ok = True
            ping_latency_ms = round((time.perf_counter() - ping_start) * 1000, 2)
    except Exception:
        ping_ok = False

    return {
        "backend": diagnostics.get("backend", "unknown"),
        "reachable": ping_ok,
        "ping_latency_ms": ping_latency_ms,
        "schema_ready": diagnostics.get("schema_ready", False),
    }


def get_queue_depth_metrics() -> Dict[str, Any]:
    """Calculates active, queued, and completed jobs from database."""
    from app.database import SessionLocal
    from app.models.db import Job, JobState

    stats = {"active": _active_jobs_count, "queued": 0, "failed": 0, "completed": 0}
    db = SessionLocal()
    try:
        queued_count = db.query(Job).filter(
            Job.state == JobState.QUEUED
        ).count()
        running_count = db.query(Job).filter(
            Job.state.in_([JobState.RUNNING, JobState.CLONING, JobState.PARSING, JobState.RESOLVING, JobState.ANALYZING])
        ).count()
        stats["queued"] = queued_count
        stats["active"] = max(_active_jobs_count, running_count)
    except Exception:
        pass
    finally:
        db.close()

    return stats


def get_all_metrics() -> Dict[str, Any]:
    """Returns comprehensive JSON telemetry snapshot."""
    with _lock:
        durations = list(_request_durations_ms)
        p50 = round(sorted(durations)[len(durations) // 2], 2) if durations else 0.0
        p95 = round(sorted(durations)[int(len(durations) * 0.95)], 2) if durations else 0.0
        avg_dur = round(sum(durations) / len(durations), 2) if durations else 0.0

        req_summary = {
            "total": sum(_request_total.values()),
            "errors": sum(_request_errors_total.values()),
            "avg_duration_ms": avg_dur,
            "p50_duration_ms": p50,
            "p95_duration_ms": p95,
            "breakdown": dict(_request_total),
            "errors_breakdown": dict(_request_errors_total),
        }

        job_summary = {
            "active_now": _active_jobs_count,
            "executions": dict(_job_executions_total),
            "failures": dict(_job_failures_total),
        }

    return {
        "requests": req_summary,
        "jobs": job_summary,
        "queue": get_queue_depth_metrics(),
        "database": get_database_health_metrics(),
        "disk": get_disk_usage_metrics(),
    }


def to_prometheus_format() -> str:
    """Renders metrics in Prometheus text exposition format."""
    metrics = get_all_metrics()
    lines = [
        "# HELP codeoracle_requests_total Total HTTP requests processed by endpoint and status",
        "# TYPE codeoracle_requests_total counter",
    ]

    for key, count in metrics["requests"]["breakdown"].items():
        parts = key.split("|")
        if len(parts) == 3:
            method, path, status = parts
            lines.append(f'codeoracle_requests_total{{method="{method}",path="{path}",status="{status}"}} {count}')

    lines.extend([
        "# HELP codeoracle_request_errors_total Total HTTP request errors by category",
        "# TYPE codeoracle_request_errors_total counter",
    ])
    for key, count in metrics["requests"]["errors_breakdown"].items():
        parts = key.split("|")
        if len(parts) == 3:
            method, path, category = parts
            lines.append(f'codeoracle_request_errors_total{{method="{method}",path="{path}",category="{category}"}} {count}')

    lines.extend([
        "# HELP codeoracle_request_duration_ms_avg Average request duration in milliseconds",
        "# TYPE codeoracle_request_duration_ms_avg gauge",
        f'codeoracle_request_duration_ms_avg {metrics["requests"]["avg_duration_ms"]}',
        "# HELP codeoracle_jobs_active Current number of active in-flight analysis jobs",
        "# TYPE codeoracle_jobs_active gauge",
        f'codeoracle_jobs_active {metrics["jobs"]["active_now"]}',
        "# HELP codeoracle_database_up Database reachability flag (1 for reachable, 0 for unreachable)",
        "# TYPE codeoracle_database_up gauge",
        f'codeoracle_database_up {1 if metrics["database"]["reachable"] else 0}',
        "# HELP codeoracle_disk_used_percent Workspace filesystem utilization percentage",
        "# TYPE codeoracle_disk_used_percent gauge",
        f'codeoracle_disk_used_percent {metrics["disk"]["disk_used_percent"]}',
        "# HELP codeoracle_workspace_storage_bytes Total disk space occupied by project workspaces",
        "# TYPE codeoracle_workspace_storage_bytes gauge",
        f'codeoracle_workspace_storage_bytes {metrics["disk"]["workspace_storage_bytes"]}',
    ])

    return "\n".join(lines) + "\n"
