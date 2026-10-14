import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import router as api_router
from app.api.auth_routes import auth_router
from app.api.auth import cleanup_expired_sessions
from app.config import settings
from app.database import Base, SessionLocal, engine, ensure_schema_compatibility, get_db_diagnostics
import app.models.db  # noqa: F401
from app.ingestion.service import recover_interrupted_jobs
from app.ingestion.workspace import cleanup_abandoned_jobs
from app.monitoring import (
    StructuredLoggingMiddleware,
    mark_startup_completed,
    setup_logging,
)

setup_logging(is_production=(getattr(settings, "ENVIRONMENT", "development") == "production"))
logger = logging.getLogger(__name__)


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

    # Warn if default insecure secret is used in production
    if settings.ENVIRONMENT == "production" and "dev-insecure" in settings.SECRET_KEY:
        logger.critical("SECURITY ALERT: Using default development SECRET_KEY in production! Override with a secure random secret.")

    db_info = get_db_diagnostics()
    logger.info(
        "Database initialized: backend=%s, reachable=%s, schema_ready=%s",
        db_info.get("backend"),
        db_info.get("reachable"),
        db_info.get("schema_ready"),
    )
    
    # Recover interrupted jobs and clean expired sessions/stale temporary files
    db = SessionLocal()
    try:
        recover_interrupted_jobs(db)
        cleaned_sessions = cleanup_expired_sessions(db)
        cleaned_jobs = cleanup_abandoned_jobs(db)
        logger.info("Startup maintenance: cleaned %d expired sessions and %d stale job artifacts.", cleaned_sessions, cleaned_jobs)
        mark_startup_completed()
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

# Structured logging & telemetry middleware
app.add_middleware(StructuredLoggingMiddleware)

# CORS configuration with environment-configured origins (no wildcard with credentials)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def security_headers_and_csrf_middleware(request: Request, call_next):
    # 1. CSRF Mitigation for state-changing requests authenticated via cookies
    if request.method in ("POST", "PUT", "DELETE", "PATCH"):
        session_cookie = request.cookies.get(settings.SESSION_COOKIE_NAME)
        if session_cookie:
            sec_fetch_site = request.headers.get("Sec-Fetch-Site")
            if sec_fetch_site and sec_fetch_site.lower() == "cross-site":
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={"detail": "Cross-site request blocked by CSRF policy."},
                )

            origin = request.headers.get("Origin")
            if origin:
                clean_origin = origin.rstrip("/")
                allowed = [o.rstrip("/") for o in settings.CORS_ORIGINS]
                host_url = f"{request.url.scheme}://{request.url.netloc}".rstrip("/")
                # Check origin matches allowed list or same host
                if clean_origin not in allowed and clean_origin != host_url:
                    return JSONResponse(
                        status_code=status.HTTP_403_FORBIDDEN,
                        content={"detail": "Origin validation failed for state-changing request."},
                    )

    # 2. Invoke application handler
    response = await call_next(request)

    # 3. Cache headers for static bundled assets
    if request.url.path.startswith("/assets/"):
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"

    # 4. Mandatory Defense-in-Depth Security Headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

    if settings.ENVIRONMENT == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    # Practical Content Security Policy
    csp = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; "
        "img-src 'self' data: https:; "
        "font-src 'self' data: https://fonts.gstatic.com; "
        "connect-src 'self' https: http://localhost:* http://127.0.0.1:*; "
        "frame-ancestors 'none';"
    )
    response.headers["Content-Security-Policy"] = csp

    return response

# Register API and Auth Routers
app.include_router(auth_router, prefix="/api")
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
            return FileResponse(file_path, headers={"Cache-Control": "public, max-age=31536000, immutable"} if file_path.parent.name == "assets" else {"Cache-Control": "no-cache, no-store, must-revalidate"})

        index_file = static_dir / "index.html"
        if index_file.exists():
            return FileResponse(index_file, headers={"Cache-Control": "no-cache, no-store, must-revalidate"})

        raise HTTPException(status_code=404, detail="Resource not found")
else:
    @app.get("/{full_path:path}")
    async def serve_spa_no_static(request: Request, full_path: str):
        if full_path == "api" or full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        return {"app_name": settings.APP_NAME, "version": settings.VERSION, "status": "running"}
