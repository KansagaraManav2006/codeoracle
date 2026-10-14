import os
import time
from pathlib import Path
from typing import Any, Dict, Tuple

from app.config import settings
from app.database import engine, get_db_diagnostics
from sqlalchemy import inspect, text

_startup_time = time.time()
_startup_completed = False


def mark_startup_completed() -> None:
    global _startup_completed
    _startup_completed = True


def get_liveness_status() -> Dict[str, Any]:
    """Liveness probe: verifies process is alive and responding."""
    uptime = round(time.time() - _startup_time, 2)
    return {
        "status": "ok",
        "live": True,
        "uptime_seconds": uptime,
        "environment": settings.ENVIRONMENT,
        "version": settings.VERSION,
    }


def get_readiness_status() -> Tuple[int, Dict[str, Any]]:
    """
    Readiness probe: verifies database connectivity, schema tables,
    and workspace filesystem writability.
    Returns (status_code, response_dict).
    """
    db_diag = get_db_diagnostics()
    db_ok = bool(db_diag.get("reachable", False))
    schema_ok = bool(db_diag.get("schema_ready", False))

    # Check workspace storage writability
    storage_path = Path(settings.WORKSPACES_DIR).resolve()
    storage_ok = False
    storage_error = None

    try:
        storage_path.mkdir(parents=True, exist_ok=True)
        probe_file = storage_path / ".probe_write_test"
        probe_file.write_text("probe", encoding="utf-8")
        probe_file.unlink()
        storage_ok = True
    except Exception as e:
        storage_ok = False
        storage_error = str(e)

    is_ready = db_ok and schema_ok and storage_ok
    status_code = 200 if is_ready else 503

    return status_code, {
        "status": "ready" if is_ready else "unready",
        "ready": is_ready,
        "checks": {
            "database_reachable": db_ok,
            "database_schema_ready": schema_ok,
            "workspace_storage_writable": storage_ok,
        },
        "database": db_diag,
        "storage": {
            "path": str(storage_path),
            "writable": storage_ok,
            "error": storage_error,
        },
    }


def get_startup_status() -> Tuple[int, Dict[str, Any]]:
    """
    Startup probe: verifies that background migrations, schema setup,
    and startup recovery tasks have fully executed.
    """
    db_diag = get_db_diagnostics()
    initialized = _startup_completed and bool(db_diag.get("schema_ready", False))
    status_code = 200 if initialized else 503

    return status_code, {
        "status": "started" if initialized else "initializing",
        "initialized": initialized,
        "schema_ready": db_diag.get("schema_ready", False),
        "startup_completed": _startup_completed,
    }
