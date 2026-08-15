import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, Response, UploadFile, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.analysis.graph_models import GraphResponse
from app.analysis.graph_service import build_project_dependency_graph
from app.analysis.models import ANALYZER_VERSION, ProjectAnalysis, ProjectExplanation
from app.analysis.service import process_analysis_job, run_analysis_for_project
from app.config import settings
from app.database import get_db
from app.models.db import Job, JobState, Project, ProjectAnalysisRecord, ProjectFile, ProjectRefactorRecord
from app.migration.models import MigrationPlanResponse
from app.migration.service import build_migration_plan, migration_plan_markdown
from app.models.schema import (
    AnalyzeRequest,
    GitHubIngestRequest,
    HealthResponse,
    JobResponse,
    ProjectFileResponse,
    ProjectFilesListResponse,
    ProjectMetadataResponse,
    RecentProjectsListResponse,
)
from app.ingestion.discovery import IngestionError
from app.ingestion.github_ingest import validate_github_url
from app.ingestion.service import process_github_job, process_zip_job
from app.ingestion.workspace import get_workspace_dir
from app.ingestion.zip_ingest import validate_zip_stream

logger = logging.getLogger(__name__)

router = APIRouter()


def _download_name(value: str) -> str:
    return "".join(
        character if character.isalnum() or character in "-_" else "-"
        for character in value
    ).strip("-") or "project"


@router.get("/projects/{project_id}/migration-plan", response_model=MigrationPlanResponse)
def get_migration_plan(project_id: str, response: Response, db: Session = Depends(get_db)) -> MigrationPlanResponse:
    """Build an explainable modernization-readiness and change-impact plan."""
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    try:
        return build_migration_plan(db, project_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except Exception:
        logger.exception("Migration plan generation failed for project %s", project_id)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to create migration plan.")


@router.get("/projects/{project_id}/migration-plan/download", response_class=PlainTextResponse)
def download_migration_plan(project_id: str, db: Session = Depends(get_db)) -> PlainTextResponse:
    """Download the migration plan as a portable Markdown report."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    try:
        plan = build_migration_plan(db, project_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    content = migration_plan_markdown(plan, project.display_name)
    return PlainTextResponse(
        content,
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{_download_name(project.display_name)}-migration-plan.md"'},
    )


from app.database import get_db_diagnostics


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


@router.post("/jobs/upload", response_model=JobResponse, status_code=status.HTTP_202_ACCEPTED)
def submit_zip_upload(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> JobResponse:
    """Accepts legacy codebase ZIP archive upload and initializes ingestion job."""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename missing in upload request.",
        )

    try:
        validate_zip_stream(file.file, file.filename)
    except IngestionError as ie:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=ie.message)

    workspace_id = f"ws_{uuid.uuid4().hex[:12]}"
    job_id = f"job_{uuid.uuid4().hex[:12]}"
    temp_zip_path = Path(settings.TEMP_DIR) / f"{job_id}.zip"

    try:
        temp_zip_path.parent.mkdir(parents=True, exist_ok=True)
        file.file.seek(0)
        with temp_zip_path.open("wb") as buffer:
            for chunk in iter(lambda: file.file.read(1024 * 1024), b""):
                buffer.write(chunk)
    except Exception as e:
        logger.exception("Failed to write temporary ZIP upload file")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to store upload archive on server.",
        )

    display_name = Path(file.filename).stem

    job = Job(
        id=job_id,
        state=JobState.QUEUED,
        stage="Queued",
        progress_percentage=0,
        source_type="zip",
        source_url=None,
        project_id=None,
        message="ZIP upload received and queued for extraction.",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    db.add(job)
    db.commit()

    background_tasks.add_task(process_zip_job, job_id, workspace_id, temp_zip_path, display_name)

    return JobResponse(
        job_id=job_id,
        state=JobState.QUEUED,
        stage="Queued",
        progress_percentage=0,
        source_type="zip",
        source_url=None,
        project_id=None,
        message="ZIP upload received and queued for extraction.",
        polling_url=f"/api/jobs/{job_id}",
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


@router.post("/jobs/github", response_model=JobResponse, status_code=status.HTTP_202_ACCEPTED)
def submit_github_repo(
    payload: GitHubIngestRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> JobResponse:
    """Accepts public GitHub repository URL and initializes cloning and ingestion job."""
    try:
        clean_url = validate_github_url(payload.repo_url)
    except IngestionError as ie:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=ie.message)

    workspace_id = f"ws_{uuid.uuid4().hex[:12]}"
    job_id = f"job_{uuid.uuid4().hex[:12]}"

    job = Job(
        id=job_id,
        state=JobState.QUEUED,
        stage="Queued",
        progress_percentage=0,
        source_type="github",
        source_url=clean_url,
        project_id=None,
        message="GitHub repository URL received and queued for cloning.",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    db.add(job)
    db.commit()

    background_tasks.add_task(process_github_job, job_id, workspace_id, clean_url)

    return JobResponse(
        job_id=job_id,
        state=JobState.QUEUED,
        stage="Queued",
        progress_percentage=0,
        source_type="github",
        source_url=clean_url,
        project_id=None,
        message="GitHub repository URL received and queued for cloning.",
        polling_url=f"/api/jobs/{job_id}",
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


@router.get("/jobs/{job_id}", response_model=JobResponse)
def get_job_status(job_id: str, db: Session = Depends(get_db)) -> JobResponse:
    """Retrieves status and progress details for an ingestion or analysis job."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_id}' not found.",
        )

    return JobResponse(
        job_id=job.id,
        state=job.state,
        stage=job.stage,
        progress_percentage=job.progress_percentage,
        source_type=job.source_type,
        source_url=job.source_url,
        project_id=job.project_id,
        message=job.message,
        error_code=job.error_code,
        error_message=job.error_message,
        polling_url=f"/api/jobs/{job.id}",
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


@router.get("/projects", response_model=RecentProjectsListResponse)
def get_recent_projects(
    limit: int = Query(12, ge=1, le=50, description="Max number of recent projects to retrieve"),
    db: Session = Depends(get_db),
) -> RecentProjectsListResponse:
    """Lists recent stored projects from the database ordered by creation date."""
    projects = (
        db.query(Project)
        .order_by(Project.created_at.desc())
        .limit(limit)
        .all()
    )
    items = [
        ProjectMetadataResponse(
            project_id=p.id,
            display_name=p.display_name,
            source_type=p.source_type,
            source_url=p.source_url,
            detected_languages=p.detected_languages or [],
            total_files=p.total_files,
            total_lines=p.total_lines,
            content_hash=p.content_hash,
            created_at=p.created_at,
        )
        for p in projects
    ]
    return RecentProjectsListResponse(total=len(items), projects=items)


@router.get("/projects/{project_id}", response_model=ProjectMetadataResponse)
def get_project_metadata(project_id: str, db: Session = Depends(get_db)) -> ProjectMetadataResponse:
    """Retrieves metadata summary for an ingested project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project '{project_id}' not found.",
        )

    return ProjectMetadataResponse(
        project_id=project.id,
        display_name=project.display_name,
        source_type=project.source_type,
        source_url=project.source_url,
        detected_languages=project.detected_languages,
        total_files=project.total_files,
        total_lines=project.total_lines,
        content_hash=project.content_hash,
        created_at=project.created_at,
    )


@router.get("/projects/{project_id}/files", response_model=ProjectFilesListResponse)
def get_project_files(project_id: str, db: Session = Depends(get_db)) -> ProjectFilesListResponse:
    """Retrieves list of all discovered source files in a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project '{project_id}' not found.",
        )

    files = db.query(ProjectFile).filter(ProjectFile.project_id == project_id).all()

    file_responses = [
        ProjectFileResponse(
            file_id=f.id,
            relative_path=f.relative_path,
            language=f.language,
            size_bytes=f.size_bytes,
            line_count=f.line_count,
            sha256_hash=f.sha256_hash,
        )
        for f in files
    ]

    return ProjectFilesListResponse(
        project_id=project.id,
        total_files=len(file_responses),
        files=file_responses,
    )


# --- Deterministic Static Analysis & Graph Endpoints ---

@router.post("/projects/{project_id}/analyze", response_model=JobResponse, status_code=status.HTTP_202_ACCEPTED)
def trigger_project_analysis(
    project_id: str,
    background_tasks: BackgroundTasks,
    request: Optional[AnalyzeRequest] = None,
    db: Session = Depends(get_db),
) -> JobResponse:
    """Triggers static analysis for a project as an asynchronous background job."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

    force_flag = request.force if request else False

    # Check for active analysis job for this project
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

    job_id = f"job_analysis_{uuid.uuid4().hex[:12]}"
    job = Job(
        id=job_id,
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
def get_project_analysis(project_id: str, db: Session = Depends(get_db)) -> ProjectAnalysis:
    """Retrieves deterministic static analysis results for a project if available."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

    rec = (
        db.query(ProjectAnalysisRecord)
        .filter(ProjectAnalysisRecord.project_id == project_id)
        .first()
    )

    if rec:
        try:
            return ProjectAnalysis.model_validate(rec.analysis_data)
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
def get_project_explanation(project_id: str, db: Session = Depends(get_db)) -> ProjectExplanation:
    """Retrieves deterministic explanation synthesis for a project if available."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

    rec = (
        db.query(ProjectAnalysisRecord)
        .filter(ProjectAnalysisRecord.project_id == project_id)
        .first()
    )

    if rec:
        try:
            analysis = ProjectAnalysis.model_validate(rec.analysis_data)
            if analysis.explanation:
                return analysis.explanation
        except Exception:
            logger.exception("Failed to deserialize analysis data for %s", project_id)

    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Explanation unavailable. Run project analysis first.",
    )


@router.get("/projects/{project_id}/analysis/download", response_class=PlainTextResponse)
def download_project_analysis(project_id: str, db: Session = Depends(get_db)) -> PlainTextResponse:
    """Download a portable Markdown codebase explanation."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    record = db.query(ProjectAnalysisRecord).filter(ProjectAnalysisRecord.project_id == project_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Analysis is not available.")

    analysis = ProjectAnalysis.model_validate(record.analysis_data)
    explanation = analysis.explanation
    lines = [
        f"# {project.display_name} Codebase Explanation", "",
        f"- **Languages:** {', '.join(analysis.languages) or 'Unknown'}",
        f"- **Source files:** {analysis.total_files}",
        f"- **Source lines:** {analysis.total_lines}",
        f"- **Entry points:** {len(analysis.entry_points)}",
        f"- **Dependency connections:** {len(analysis.dependency_edges)}", "",
    ]
    if explanation:
        lines.extend([
            "## In simple words", "", explanation.languages_summary, "",
            "## How it starts", "", explanation.entry_points_summary, "",
            "## Important modules", "", explanation.major_modules_summary, "",
            "## Architecture observations", "",
        ])
        lines.extend(f"- {item}" for item in explanation.architectural_observations)
    lines.extend(["", "## Module inventory", ""])
    for module in analysis.modules:
        responsibility = module.explanation.responsibility if module.explanation else "Static analysis completed."
        lines.append(f"- **{module.relative_path}** ({module.language}, {module.line_count} lines): {responsibility}")
    lines.extend(["", "---", "Generated by CodeOracle. Verify findings before changing production code.", ""])
    return PlainTextResponse(
        "\n".join(lines),
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{_download_name(project.display_name)}-explanation.md"'},
    )


@router.get("/projects/{project_id}/graph", response_model=GraphResponse)
def get_project_dependency_graph(
    project_id: str,
    level: str = Query("module", pattern="^(module|symbol)$"),
    module_id: Optional[str] = Query(None),
    edge_types: Optional[str] = Query(None),
    include_external: bool = Query(False),
    db: Session = Depends(get_db),
) -> GraphResponse:
    """Retrieves module or symbol-level dependency graph representation for React Flow."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

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
        edge_types_list = [et.strip() for et in edge_types.split(",") if et.strip()] if edge_types else None

        graph = build_project_dependency_graph(
            analysis=analysis,
            level=level,
            module_id=module_id,
            edge_types_filter=edge_types_list,
            include_external=include_external,
        )
        return graph
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        logger.exception("Error generating dependency graph for project %s", project_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal file-analysis failure.",
        )


@router.get("/projects/{project_id}/graph/download", response_class=PlainTextResponse)
def download_project_dependency_graph(project_id: str, db: Session = Depends(get_db)) -> PlainTextResponse:
    """Download the internal module graph as Mermaid Markdown."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    record = db.query(ProjectAnalysisRecord).filter(ProjectAnalysisRecord.project_id == project_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Analysis is not available.")

    analysis = ProjectAnalysis.model_validate(record.analysis_data)
    graph = build_project_dependency_graph(analysis=analysis, include_external=False)
    node_keys = {node.id: f"N{index}" for index, node in enumerate(graph.nodes)}
    lines = [f"# {project.display_name} Dependency Graph", "", "```mermaid", "flowchart LR"]
    for node in graph.nodes:
        label = node.label.replace('"', "'")
        lines.append(f'    {node_keys[node.id]}["{label}"]')
    for edge in graph.edges:
        if edge.source in node_keys and edge.target in node_keys:
            lines.append(f"    {node_keys[edge.source]} -->|{edge.type}| {node_keys[edge.target]}")
    lines.extend([
        "```", "",
        f"Connections: {graph.summary.total_edges} | Dependency loops: {graph.summary.cycle_count}", "",
    ])
    return PlainTextResponse(
        "\n".join(lines),
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{_download_name(project.display_name)}-dependency-graph.md"'},
    )


# --- Checkpoint 5: Test Generation Endpoints ---

from app.testgen.models import GenerateTestsRequest, ProjectTestResult, TEST_GENERATOR_VERSION
from app.testgen.service import process_test_generation_job, run_test_generation_for_project
from app.models.db import ProjectTestRecord
from fastapi.responses import StreamingResponse
import io
import zipfile


@router.post("/projects/{project_id}/tests/generate", response_model=JobResponse, status_code=status.HTTP_202_ACCEPTED)
def generate_project_tests(
    project_id: str,
    payload: GenerateTestsRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> JobResponse:
    """Triggers deterministic unit-test generation for a project with optional subprocess execution."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

    if payload.execute and not settings.TEST_EXECUTION_ENABLED and not bool(project.is_trusted):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Test execution is disabled for uploaded repositories. Generate syntax-checked tests without execution.",
        )

    # Check for existing active testgen job
    active_job = (
        db.query(Job)
        .filter(
            Job.project_id == project_id,
            Job.source_type == "test_generation",
            Job.state.in_([JobState.QUEUED, JobState.GENERATING]),
        )
        .first()
    )
    if active_job:
        return JobResponse(
            job_id=active_job.id,
            state=active_job.state,
            stage=active_job.stage,
            progress_percentage=active_job.progress_percentage,
            source_type=active_job.source_type,
            project_id=project_id,
            message="Test generation already in progress.",
            polling_url=f"/api/jobs/{active_job.id}",
            created_at=active_job.created_at,
            updated_at=active_job.updated_at,
        )

    job_id = f"job_tg_{uuid.uuid4().hex[:12]}"
    new_job = Job(
        id=job_id,
        state=JobState.QUEUED,
        stage="Queued",
        progress_percentage=0,
        source_type="test_generation",
        project_id=project_id,
        message="Test generation queued.",
        created_at=datetime.now(timezone.utc),
    )
    db.add(new_job)
    db.commit()

    background_tasks.add_task(
        process_test_generation_job,
        job_id,
        project_id,
        execute=payload.execute,
        force=payload.force,
    )

    return JobResponse(
        job_id=job_id,
        state=JobState.QUEUED,
        stage="Queued",
        progress_percentage=0,
        source_type="test_generation",
        project_id=project_id,
        message="Test generation job enqueued successfully.",
        polling_url=f"/api/jobs/{job_id}",
        created_at=new_job.created_at,
        updated_at=new_job.updated_at,
    )


@router.get("/projects/{project_id}/tests", response_model=ProjectTestResult)
def get_project_tests(
    project_id: str,
    db: Session = Depends(get_db),
) -> ProjectTestResult:
    """Retrieves generated unit test results for a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

    rec = (
        db.query(ProjectTestRecord)
        .filter(ProjectTestRecord.project_id == project_id)
        .first()
    )

    if not rec:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Generated tests unavailable. Trigger test generation first.",
        )

    try:
        return ProjectTestResult.model_validate(rec.test_data)
    except Exception:
        logger.exception("Failed to deserialize test data for project %s", project_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to read test generation results.",
        )


@router.get("/projects/{project_id}/tests/download")
def download_project_tests(
    project_id: str,
    db: Session = Depends(get_db),
):
    """Downloads a ZIP archive containing all syntax-valid generated unit test files and README."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

    rec = (
        db.query(ProjectTestRecord)
        .filter(ProjectTestRecord.project_id == project_id)
        .first()
    )
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Test generation results unavailable. Run test generation first.",
        )

    test_result = ProjectTestResult.model_validate(rec.test_data)

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for tf in test_result.test_files:
            if tf.syntax_valid and tf.download_eligible:
                zf.writestr(tf.safe_test_path, tf.code)

        # Write README.md
        readme_text = f"""# CodeOracle Auto-Generated Test Suite

Project ID: {project_id}
Generated At: {test_result.generated_at}
Frameworks: {', '.join(test_result.frameworks)}
Total Tests: {test_result.total_generated_tests}
Overall Line Coverage: {test_result.overall_line_coverage if test_result.overall_line_coverage is not None else 'Not measured'}%

## How to Run Tests Locally

### Python (pytest):
1. Install requirements: `pip install pytest pytest-cov`
2. Run test suite: `pytest tests/`
3. Run with coverage: `pytest --cov=. tests/`

### JavaScript (Vitest):
1. Install Vitest: `npm install -D vitest`
2. Run test suite: `npx vitest run`

## Security & Safety Notice
{test_result.execution_warning or 'Subprocess isolation reduces risk but is not a complete hostile-code sandbox.'}
"""
        zf.writestr("README.md", readme_text)

    buf.seek(0)
    filename = f"codeoracle_tests_{project_id}.zip"
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# --- Trusted Benchmark Ingestion Route ---

from app.refactor.models import GenerateRefactorRequest, ProjectRefactorResult
from app.refactor.service import run_refactor_for_project


@router.post("/projects/{project_id}/refactor", response_model=ProjectRefactorResult)
def generate_project_refactor(
    project_id: str,
    payload: GenerateRefactorRequest,
    db: Session = Depends(get_db),
) -> ProjectRefactorResult:
    """Builds a non-destructive modernization proposal with diffs and risk warnings."""
    try:
        return run_refactor_for_project(db, project_id, force=payload.force)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception:
        logger.exception("Refactor generation failed for project %s", project_id)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to generate refactor proposal.")


@router.get("/projects/{project_id}/refactor", response_model=ProjectRefactorResult)
def get_project_refactor(project_id: str, db: Session = Depends(get_db)) -> ProjectRefactorResult:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    record = db.query(ProjectRefactorRecord).filter(ProjectRefactorRecord.project_id == project_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Refactor proposal unavailable. Generate it first.")
    return ProjectRefactorResult.model_validate(record.refactor_data)


@router.get("/projects/{project_id}/refactor/download")
def download_project_refactor(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    record = db.query(ProjectRefactorRecord).filter(ProjectRefactorRecord.project_id == project_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Refactor proposal unavailable. Generate it first.")
    result = ProjectRefactorResult.model_validate(record.refactor_data)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as archive:
        for item in result.files:
            if item.changed and item.syntax_valid:
                archive.writestr(f"modernized/{item.relative_path}", item.refactored_code)
                archive.writestr(f"diffs/{item.relative_path}.diff", item.unified_diff)
        report = ["# CodeOracle Refactor Review", "", result.summary, "", "## Safety", "", "These are proposals, not automatically applied changes. Review diffs and run tests before merging.", ""]
        for item in result.files:
            if not item.changed:
                continue
            report.extend([f"## {item.relative_path}", ""] + [f"- {change}" for change in item.changes])
            report.extend([f"- WARNING [{warning.code}]: {warning.message}" for warning in item.warnings])
            report.append("")
        archive.writestr("REVIEW.md", "\n".join(report))
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/zip", headers={"Content-Disposition": f"attachment; filename=codeoracle_refactor_{project_id}.zip"})


# --- Trusted Benchmark Ingestion Route ---

@router.post("/demo/benchmarks/{benchmark_name}", response_model=ProjectMetadataResponse, status_code=status.HTTP_201_CREATED)
def load_demo_benchmark(
    benchmark_name: str,
    db: Session = Depends(get_db),
) -> ProjectMetadataResponse:
    """Ingest a bundled trusted Python, JavaScript, or full legacy-retail benchmark."""
    route_path = Path(__file__).resolve()
    demo_roots = [route_path.parents[2], route_path.parents[3]]
    bench_dir = next(
        (root / "demo" / "benchmarks" / benchmark_name for root in demo_roots if (root / "demo" / "benchmarks" / benchmark_name).is_dir()),
        demo_roots[0] / "demo" / "benchmarks" / benchmark_name,
    )
    if not bench_dir.exists() or not bench_dir.is_dir():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Benchmark '{benchmark_name}' not found.")

    project_id = f"proj_bench_{benchmark_name}"
    workspace_id = f"ws_bench_{benchmark_name}"
    ws_dir = get_workspace_dir(workspace_id)
    raw_ws_dir = ws_dir / "raw"
    raw_ws_dir.mkdir(parents=True, exist_ok=True)

    # Clean existing project if reloading
    existing_proj = db.query(Project).filter(Project.id == project_id).first()
    if existing_proj:
        db.query(ProjectTestRecord).filter(ProjectTestRecord.project_id == project_id).delete()
        db.query(ProjectRefactorRecord).filter(ProjectRefactorRecord.project_id == project_id).delete()
        db.query(ProjectAnalysisRecord).filter(ProjectAnalysisRecord.project_id == project_id).delete()
        db.query(ProjectFile).filter(ProjectFile.project_id == project_id).delete()
        db.query(Job).filter(Job.project_id == project_id).delete()
        db.delete(existing_proj)
        db.commit()

    import hashlib
    content_hasher = hashlib.sha256()
    total_files = 0
    total_lines = 0
    languages = set()
    project_files = []

    for file_path in bench_dir.glob("**/*"):
        if file_path.is_file():
            rel_path = file_path.relative_to(bench_dir).as_posix()
            ext = file_path.suffix.lower()
            lang = "python" if ext == ".py" else ("javascript" if ext in (".js", ".jsx") else "other")
            if lang != "other":
                languages.add(lang)
            
            content_bytes = file_path.read_bytes()
            content_hasher.update(content_bytes)
            file_hash = hashlib.sha256(content_bytes).hexdigest()
            line_count = len(content_bytes.decode("utf-8", errors="ignore").splitlines())

            # Copy file to workspace
            target_p = raw_ws_dir / rel_path
            target_p.parent.mkdir(parents=True, exist_ok=True)
            target_p.write_bytes(content_bytes)

            pf = ProjectFile(
                id=f"pf_bench_{uuid.uuid4().hex[:8]}",
                project_id=project_id,
                relative_path=rel_path,
                language=lang,
                size_bytes=len(content_bytes),
                line_count=line_count,
                sha256_hash=file_hash,
            )
            project_files.append(pf)
            total_files += 1
            total_lines += line_count

    proj = Project(
        id=project_id,
        display_name=f"Demo Benchmark: {benchmark_name.replace('_', ' ').title()}",
        source_type="demo_benchmark",
        source_url=f"demo/benchmarks/{benchmark_name}",
        detected_languages=sorted(list(languages)),
        total_files=total_files,
        total_lines=total_lines,
        content_hash=content_hasher.hexdigest(),
        workspace_id=workspace_id,
        is_trusted=1,
        created_at=datetime.now(timezone.utc),
    )
    db.add(proj)
    for pf in project_files:
        db.add(pf)
    db.commit()

    # Automatically run analysis
    run_analysis_for_project(db, project_id, force=True)

    return ProjectMetadataResponse(
        project_id=project_id,
        display_name=proj.display_name,
        source_type=proj.source_type,
        source_url=proj.source_url,
        detected_languages=proj.detected_languages,
        total_files=total_files,
        total_lines=total_lines,
        content_hash=proj.content_hash,
        created_at=proj.created_at,
    )
