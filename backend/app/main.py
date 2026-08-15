import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import router as api_router
from app.config import settings
from app.database import Base, SessionLocal, engine, ensure_schema_compatibility
from app.ingestion.service import recover_interrupted_jobs


def get_static_dir() -> Path | None:
    """Resolves static assets directory reliably across local dev and Docker deployment environments."""
    if settings.STATIC_DIR:
        custom_path = Path(settings.STATIC_DIR).resolve()
        if custom_path.exists():
            return custom_path

    # Docker container path
    docker_static = Path("/app/static").resolve()
    if docker_static.exists():
        return docker_static

    # Local development paths relative to file location
    backend_app_dir = Path(__file__).resolve().parent  # app/
    backend_dir = backend_app_dir.parent               # backend/
    project_root = backend_dir.parent                  # GDC/

    candidates = [
        backend_dir / "static",
        project_root / "frontend" / "dist",
        project_root / "static",
    ]

    for cand in candidates:
        cand_resolved = cand.resolve()
        if cand_resolved.exists():
            return cand_resolved

    return None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup
    Base.metadata.create_all(bind=engine)
    ensure_schema_compatibility()

    db_info = get_db_diagnostics()
    logger.info(
        "Database initialized: backend=%s, reachable=%s, schema_ready=%s",
        db_info.get("backend"),
        db_info.get("reachable"),
        db_info.get("schema_ready"),
    )
    
    # Recover jobs interrupted by server restart
    db = SessionLocal()
    try:
        recover_interrupted_jobs(db)
    finally:
        db.close()
        
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS configuration with environment-configured origins (no wildcard with credentials)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Router first so /api/* routes take precedence
app.include_router(api_router, prefix="/api")

# Determine static asset directory
static_dir = get_static_dir()

if static_dir and static_dir.exists():
    assets_dir = static_dir / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="static_assets")

    # SPA Fallback for non-API GET requests
    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        # Strict API 404 check: never handle any route starting with /api or /api/
        if full_path == "api" or full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")

        file_path = (static_dir / full_path).resolve()
        
        # Path containment check using Path.is_relative_to()
        try:
            is_inside = file_path.is_relative_to(static_dir.resolve())
        except AttributeError:
            is_inside = str(file_path).startswith(str(static_dir.resolve()))

        if is_inside and file_path.exists() and file_path.is_file():
            return FileResponse(file_path)

        index_file = static_dir / "index.html"
        if index_file.exists():
            return FileResponse(index_file)

        raise HTTPException(status_code=404, detail="Resource not found")
else:
    @app.get("/{full_path:path}")
    async def serve_spa_no_static(request: Request, full_path: str):
        if full_path == "api" or full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        return {"app_name": settings.APP_NAME, "version": settings.VERSION, "status": "running"}
