"""CodeOracle API Routes Aggregator.

Aggregates modular domain routers:
- job_routes: Ingestion and async jobs (ZIP, GitHub, cancellation, queue health)
- project_routes: Project metadata, demo benchmarks, file exploration, deletion
- analysis_routes: Static analysis, explanation, architecture, graph, hotspots, pulse
- migration_routes: Modernization readiness and change-impact analysis
- test_routes: Deterministic test generation, retrieval, and packaging
- refactor_routes: AST-based modernization proposals, verification, and diffs
- download_routes: Exportable markdown reports and Mermaid graphs
"""

from fastapi import APIRouter

from app.api.analysis_routes import router as analysis_router
from app.api.download_routes import router as download_router
from app.api.helpers import download_name, get_authorized_project
from app.api.job_routes import router as job_router
from app.api.migration_routes import router as migration_router
from app.api.project_routes import router as project_router
from app.api.refactor_routes import router as refactor_router
from app.api.test_routes import router as test_router
from app.config import settings
from app.database import get_db_diagnostics
from app.models.schema import HealthResponse

router = APIRouter()

# Health check
@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Returns application health status, name, version, and database diagnostics."""
    return HealthResponse(
        status="ok",
        app_name=settings.APP_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        database=get_db_diagnostics(),
    )


# Mount domain sub-routers
router.include_router(job_router)
router.include_router(project_router)
router.include_router(analysis_router)
router.include_router(migration_router)
router.include_router(test_router)
router.include_router(refactor_router)
router.include_router(download_router)

# Backward-compatibility alias
_get_authorized_project = get_authorized_project
_download_name = download_name

__all__ = ["router", "get_authorized_project", "_get_authorized_project"]
