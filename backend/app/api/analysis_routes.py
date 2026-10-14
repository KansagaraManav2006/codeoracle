import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.analysis.architecture_models import ArchitectureOverview
from app.analysis.architecture_service import build_architecture_overview
from app.analysis.graph_models import GraphResponse
from app.analysis.graph_service import build_project_dependency_graph
from app.analysis.models import ANALYZER_VERSION, ProjectAnalysis, ProjectExplanation
from app.analysis.service import analysis_languages_are_current, process_analysis_job, run_analysis_for_project
from app.api.auth import get_current_user_optional
from app.api.helpers import get_authorized_project
from app.api.rate_limiter import rate_limit
from app.database import get_db
from app.hotspots.models import HotspotsResponse
from app.hotspots.service import compute_project_hotspots
from app.jobs.limits import enforce_user_concurrency_limit, find_active_job_for_project
from app.models.db import Job, JobState, ProjectAnalysisRecord, ProjectFile, User
from app.models.schema import AnalyzeRequest, JobResponse
from app.pulse.models import SystemPulseResponse
from app.pulse.service import build_system_pulse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["analysis"])


@router.post(
    "/projects/{project_id}/analyze",
    response_model=JobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(rate_limit("analyze", max_requests=15, window_seconds=60))],
)
def trigger_project_analysis(
    project_id: str,
    background_tasks: BackgroundTasks,
    request: Optional[AnalyzeRequest] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> JobResponse:
    """Triggers static analysis for a project as an asynchronous background job."""
    project = get_authorized_project(project_id, db, current_user)

    force_flag = request.force if request else False

    # 1. Check for active analysis job for this project
    active_job = find_active_job_for_project(db, project_id, "analysis")
    if active_job:
        return JobResponse(
            job_id=active_job.id,
            state=active_job.state,
            stage=active_job.stage,
            progress_percentage=active_job.progress_percentage,
            source_type=active_job.source_type,
            source_url=active_job.source_url,
            project_id=active_job.project_id,
            message="Analysis job already in progress.",
            polling_url=f"/api/jobs/{active_job.id}",
            created_at=active_job.created_at,
            updated_at=active_job.updated_at,
        )

    # 2. Check cache key based on analyzer version and content hash
    if not force_flag:
        cached_rec = (
            db.query(ProjectAnalysisRecord)
            .filter(
                ProjectAnalysisRecord.project_id == project_id,
                ProjectAnalysisRecord.analyzer_version == ANALYZER_VERSION,
                ProjectAnalysisRecord.content_hash == project.content_hash,
            )
            .first()
        )
        if cached_rec:
            return JobResponse(
                job_id=f"cached_{project_id}",
                state=JobState.COMPLETED,
                stage="Completed",
                progress_percentage=100,
                source_type="analysis",
                source_url=None,
                project_id=project_id,
                message="Analysis up to date (cache hit).",
                polling_url=f"/api/projects/{project_id}/analysis",
                created_at=cached_rec.created_at,
                updated_at=cached_rec.created_at,
            )

    # 3. Enforce per-user concurrency limit
    enforce_user_concurrency_limit(db, current_user.id if current_user else None)

    job_id = f"job_analysis_{uuid.uuid4().hex[:12]}"
    job = Job(
        id=job_id,
        user_id=current_user.id if current_user else None,
        state=JobState.QUEUED,
        stage="Queued for Static Analysis",
        progress_percentage=0,
        source_type="analysis",
        source_url=None,
        project_id=project_id,
        message="Static analysis job queued",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    db.add(job)
    db.commit()

    background_tasks.add_task(process_analysis_job, job_id, project_id, force_flag)

    return JobResponse(
        job_id=job_id,
        state=JobState.QUEUED,
        stage="Queued for Static Analysis",
        progress_percentage=0,
        source_type="analysis",
        source_url=None,
        project_id=project_id,
        message="Static analysis job queued",
        polling_url=f"/api/jobs/{job_id}",
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


@router.get("/projects/{project_id}/analysis", response_model=ProjectAnalysis)
def get_project_analysis(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> ProjectAnalysis:
    """Retrieves deterministic static analysis results for a project if available."""
    get_authorized_project(project_id, db, current_user)

    rec = (
        db.query(ProjectAnalysisRecord)
        .filter(ProjectAnalysisRecord.project_id == project_id)
        .first()
    )

    if rec:
        try:
            analysis = ProjectAnalysis.model_validate(rec.analysis_data)
            project_files = db.query(ProjectFile).filter(ProjectFile.project_id == project_id).all()
            if analysis_languages_are_current(analysis, project_files):
                return analysis
            return run_analysis_for_project(db, project_id, force=True)
        except Exception:
            logger.exception("Failed to deserialize analysis data for %s", project_id)

    # Check if analysis job is running
    active_job = (
        db.query(Job)
        .filter(
            Job.project_id == project_id,
            Job.source_type == "analysis",
            Job.state.in_([JobState.QUEUED, JobState.ANALYZING]),
        )
        .first()
    )

    if active_job:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"detail": "Analysis is currently processing.", "job_id": active_job.id},
        )

    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Analysis not available for this project. Trigger analysis first.",
    )


@router.get("/projects/{project_id}/explanation", response_model=ProjectExplanation)
def get_project_explanation(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> ProjectExplanation:
    """Retrieves deterministic explanation synthesis for a project if available."""
    get_authorized_project(project_id, db, current_user)

    rec = (
        db.query(ProjectAnalysisRecord)
        .filter(ProjectAnalysisRecord.project_id == project_id)
        .first()
    )

    if rec:
        try:
            analysis = ProjectAnalysis.model_validate(rec.analysis_data)
            project_files = db.query(ProjectFile).filter(ProjectFile.project_id == project_id).all()
            if not analysis_languages_are_current(analysis, project_files):
                analysis = run_analysis_for_project(db, project_id, force=True)
            if analysis.explanation:
                return analysis.explanation
        except Exception:
            logger.exception("Failed to deserialize analysis data for %s", project_id)

    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Explanation unavailable. Run project analysis first.",
    )


@router.get("/projects/{project_id}/architecture", response_model=ArchitectureOverview)
def get_project_architecture(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> ArchitectureOverview:
    """Retrieves canonical architecture overview, confidence metrics, and structural diagnostics."""
    get_authorized_project(project_id, db, current_user)

    rec = (
        db.query(ProjectAnalysisRecord)
        .filter(ProjectAnalysisRecord.project_id == project_id)
        .first()
    )

    if rec:
        try:
            analysis = ProjectAnalysis.model_validate(rec.analysis_data)
            project_files = db.query(ProjectFile).filter(ProjectFile.project_id == project_id).all()
            if not analysis_languages_are_current(analysis, project_files):
                analysis = run_analysis_for_project(db, project_id, force=True)
            return build_architecture_overview(db, project_id, analysis)
        except Exception:
            logger.exception("Failed to build architecture overview for %s", project_id)

    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Architecture analysis unavailable. Run project analysis first.",
    )


@router.get("/projects/{project_id}/graph", response_model=GraphResponse)
def get_project_dependency_graph(
    project_id: str,
    level: str = Query("module", pattern="^(module|symbol)$"),
    module_id: Optional[str] = Query(None),
    edge_types: Optional[str] = Query(None),
    include_external: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> GraphResponse:
    """Retrieves module or symbol-level dependency graph representation for React Flow."""
    get_authorized_project(project_id, db, current_user)

    rec = (
        db.query(ProjectAnalysisRecord)
        .filter(ProjectAnalysisRecord.project_id == project_id)
        .first()
    )

    if not rec:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Analysis not available for this project. Trigger analysis first.",
        )

    try:
        analysis = ProjectAnalysis.model_validate(rec.analysis_data)
        project_files = db.query(ProjectFile).filter(ProjectFile.project_id == project_id).all()
        if not analysis_languages_are_current(analysis, project_files):
            analysis = run_analysis_for_project(db, project_id, force=True)
        edge_types_list = [et.strip() for et in edge_types.split(",") if et.strip()] if edge_types else None

        return build_project_dependency_graph(
            analysis=analysis,
            level=level,
            module_id=module_id,
            edge_types_filter=edge_types_list,
            include_external=include_external,
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception:
        logger.exception("Error generating dependency graph for project %s", project_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal file-analysis failure.",
        )


@router.get("/projects/{project_id}/hotspots", response_model=HotspotsResponse)
def get_project_hotspots(
    project_id: str,
    response: Response,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> HotspotsResponse:
    """Computes explainable, deterministic static hotspots ranking for refactoring prioritization."""
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    get_authorized_project(project_id, db, current_user)
    try:
        return compute_project_hotspots(db, project_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except Exception:
        logger.exception("Hotspots calculation failed for project %s", project_id)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to calculate project hotspots.")


@router.get("/projects/{project_id}/system-pulse", response_model=SystemPulseResponse)
def get_system_pulse(
    project_id: str,
    response: Response,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> SystemPulseResponse:
    """Retrieve comprehensive System Pulse (Repository Health Observatory) for the project."""
    get_authorized_project(project_id, db, current_user)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    try:
        return build_system_pulse(db, project_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except Exception:
        logger.exception("System Pulse generation failed for project %s", project_id)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to create System Pulse.")
