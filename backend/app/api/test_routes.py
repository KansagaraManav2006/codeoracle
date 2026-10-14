import io
import json
import logging
import uuid
import zipfile
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.auth import get_current_user_optional
from app.api.helpers import get_authorized_project
from app.api.rate_limiter import rate_limit
from app.config import settings
from app.database import get_db
from app.jobs.limits import enforce_user_concurrency_limit
from app.models.db import Job, ProjectTestRecord, User
from app.models.schema import JobResponse, JobState
from app.testgen.models import GenerateTestsRequest, ProjectTestResult
from app.testgen.service import process_test_generation_job

logger = logging.getLogger(__name__)

router = APIRouter(tags=["tests"])


@router.post(
    "/projects/{project_id}/tests/generate",
    response_model=JobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(rate_limit("testgen", max_requests=15, window_seconds=60))],
)
def generate_project_tests(
    project_id: str,
    payload: GenerateTestsRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> JobResponse:
    """Triggers deterministic unit-test generation for a project with optional subprocess execution."""
    project = get_authorized_project(project_id, db, current_user)

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

    enforce_user_concurrency_limit(db, current_user.id if current_user else None)

    job_id = f"job_tg_{uuid.uuid4().hex[:12]}"
    new_job = Job(
        id=job_id,
        user_id=current_user.id if current_user else None,
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
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> ProjectTestResult:
    """Retrieves generated unit test results for a project."""
    get_authorized_project(project_id, db, current_user)

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
    scope: str = Query(default="all"),
    test_id: Optional[str] = Query(default=None),
    target_path: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Downloads a ZIP archive containing generated unit test files, manifest.json, and README.
    
    Supports scopes: 'all', 'protected' (only contract tests), and 'selected'.
    """
    get_authorized_project(project_id, db, current_user)

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

    # Filter files based on requested scope
    if scope == "protected":
        files_to_pack = [
            tf for tf in test_result.test_files
            if tf.syntax_valid and tf.download_eligible and not tf.is_import_only
        ]
    elif scope == "selected" and (test_id or target_path):
        norm_target = (target_path or "").replace("\\", "/").lower()
        files_to_pack = [
            tf for tf in test_result.test_files
            if tf.syntax_valid and tf.download_eligible and (
                (test_id and tf.test_id == test_id)
                or (norm_target and tf.target_relative_path.replace("\\", "/").lower() == norm_target)
                or (norm_target and tf.safe_test_path.replace("\\", "/").lower().endswith(norm_target))
            )
        ]
        if not files_to_pack:
            # Fallback to active target
            files_to_pack = [tf for tf in test_result.test_files if tf.syntax_valid and tf.download_eligible][:1]
    else:
        files_to_pack = [tf for tf in test_result.test_files if tf.syntax_valid and tf.download_eligible]

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for tf in files_to_pack:
            zf.writestr(tf.safe_test_path, tf.code)

        # Write manifest.json
        manifest_data = dict(test_result.manifest) if test_result.manifest else {}
        manifest_data.update({
            "generated": len(files_to_pack),
            "sourceProtected": len(test_result.protected_files),
            "unprotected": len(test_result.unprotected_files),
            "totalSourceFiles": test_result.target_source_files,
            "runtimeExecuted": bool(test_result.is_measured or any(t.execution_status == "passed" for t in test_result.test_files)),
            "frameworks": test_result.frameworks,
            "downloadScope": scope,
        })
        zf.writestr("manifest.json", json.dumps(manifest_data, indent=2))

        # Write README.md
        readme_text = f"""# CodeOracle Auto-Generated Test Suite

Project ID: {project_id}
Generated At: {test_result.generated_at}
Download Scope: {scope.upper()} ({len(files_to_pack)} files)
Frameworks: {', '.join(test_result.frameworks)}
Total Tests: {test_result.total_generated_tests}
Source Modules Protected: {len(test_result.protected_files)} / {test_result.target_source_files}
Overall Line Coverage: {test_result.overall_line_coverage if test_result.overall_line_coverage is not None else 'Not measured (safety locked)'}%

## How to Run Tests Locally

### Python (pytest):
1. Install requirements: `pip install pytest pytest-cov`
2. Run test suite: `pytest tests/`
3. Run with coverage: `pytest --cov=. tests/`

### JavaScript (Vitest):
1. Install Vitest: `npm install -D vitest`
2. Run test suite: `npx vitest run`

## Security & Safety Notice
{test_result.execution_warning or 'Subprocess isolation reduces risk but is not a complete hostile-code sandbox. Runtime execution was locked during generation.'}
"""
        zf.writestr("README.md", readme_text)

    buf.seek(0)
    filename = f"codeoracle_tests_{project_id}_{scope}.zip"
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
