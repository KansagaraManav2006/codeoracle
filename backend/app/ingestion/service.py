import hashlib
import logging
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from sqlalchemy.orm import Session

from app.analysis.service import run_analysis_for_project
from app.config import settings
from app.database import SessionLocal
from app.models.db import Job, JobState, Project, ProjectFile
from app.ingestion.discovery import IngestionError, discover_source_files
from app.ingestion.github_ingest import clone_github_repository, extract_repo_display_name, validate_github_url
from app.ingestion.zip_ingest import extract_zip_safely, validate_zip_stream

logger = logging.getLogger(__name__)


from app.ingestion.workspace import cleanup_workspace, get_workspace_dir


def recover_interrupted_jobs(db: Session) -> int:
    """
    Recovers jobs interrupted by a server restart during startup.
    Marks any job in QUEUED, EXTRACTING, or ANALYZING state as FAILED.
    """
    interrupted_jobs = db.query(Job).filter(Job.state.in_([JobState.QUEUED, JobState.EXTRACTING, JobState.ANALYZING])).all()
    count = len(interrupted_jobs)

    for job in interrupted_jobs:
        job.state = JobState.FAILED
        job.stage = "Failed"
        job.error_code = "INTERRUPTED"
        job.error_message = "Job execution was interrupted by a server restart."
        job.updated_at = datetime.now(timezone.utc)

    if count > 0:
        db.commit()

    return count


def process_zip_job(job_id: str, workspace_id: str, temp_zip_path: Path, display_name: str) -> None:
    """
    Background task for processing ZIP upload ingestion and deterministic analysis.
    Creates and closes its own independent database session.
    """
    db = SessionLocal()
    raw_dir = get_workspace_dir(workspace_id) / "raw"

    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return

        # Step 1: Extraction
        job.state = JobState.EXTRACTING
        job.stage = "Extracting archive..."
        job.progress_percentage = 25
        job.updated_at = datetime.now(timezone.utc)
        db.commit()

        extract_zip_safely(temp_zip_path, raw_dir)

        # Step 2: Source Discovery & Filtering
        job.stage = "Discovering source files..."
        job.progress_percentage = 50
        job.updated_at = datetime.now(timezone.utc)
        db.commit()

        discovery = discover_source_files(raw_dir)

        # Step 3: Persist Project & File Inventory
        project_id = f"proj_{uuid.uuid4().hex[:12]}"
        project = Project(
            id=project_id,
            display_name=display_name,
            source_type="zip",
            source_url=None,
            detected_languages=discovery.detected_languages,
            total_files=discovery.total_files,
            total_lines=discovery.total_lines,
            content_hash=discovery.content_hash,
            workspace_id=workspace_id,
            created_at=datetime.now(timezone.utc),
        )

        db.add(project)

        for disc_file in discovery.files:
            file_id = f"file_{hashlib.sha256(f'{project_id}:{disc_file.relative_path}'.encode('utf-8')).hexdigest()[:12]}"
            pfile = ProjectFile(
                id=file_id,
                project_id=project_id,
                relative_path=disc_file.relative_path,
                language=disc_file.language,
                size_bytes=disc_file.size_bytes,
                line_count=disc_file.line_count,
                sha256_hash=disc_file.sha256_hash,
            )
            db.add(pfile)

        db.commit()

        # Step 4: Automatic Deterministic Static Analysis
        job.state = JobState.ANALYZING
        job.stage = "Running deterministic static analysis..."
        job.progress_percentage = 75
        job.project_id = project_id
        job.updated_at = datetime.now(timezone.utc)
        db.commit()

        run_analysis_for_project(db, project_id, force=True)

        # Step 5: Completion
        job.state = JobState.COMPLETED
        job.stage = "Completed"
        job.progress_percentage = 100
        job.project_id = project_id
        job.message = "ZIP ingestion and static code analysis complete."
        job.updated_at = datetime.now(timezone.utc)

        db.commit()

    except IngestionError as ie:
        db.rollback()
        logger.warning("Ingestion error for ZIP job %s: %s [%s]", job_id, ie.message, ie.code)
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.state = JobState.FAILED
            job.stage = "Failed"
            job.error_code = ie.code
            job.error_message = ie.message
            job.updated_at = datetime.now(timezone.utc)
            db.commit()
        cleanup_workspace(workspace_id)

    except Exception as e:
        db.rollback()
        logger.exception("Unexpected error processing ZIP job %s", job_id)
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.state = JobState.FAILED
            job.stage = "Failed"
            job.error_code = "INTERNAL_ERROR"
            job.error_message = "An unexpected error occurred while processing the repository."
            job.updated_at = datetime.now(timezone.utc)
            db.commit()
        cleanup_workspace(workspace_id)

    finally:
        db.close()
        if temp_zip_path.exists():
            try:
                temp_zip_path.unlink()
            except Exception:
                pass


def process_github_job(job_id: str, workspace_id: str, clean_url: str) -> None:
    """
    Background task for processing GitHub repository ingestion and deterministic analysis.
    Creates and closes its own independent database session.
    """
    db = SessionLocal()
    raw_dir = get_workspace_dir(workspace_id) / "raw"

    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return

        # Step 1: Clone
        job.state = JobState.EXTRACTING
        job.stage = "Cloning GitHub repository..."
        job.progress_percentage = 25
        job.updated_at = datetime.now(timezone.utc)
        db.commit()

        clone_github_repository(clean_url, raw_dir)

        # Step 2: Source Discovery
        job.stage = "Discovering source files..."
        job.progress_percentage = 50
        job.updated_at = datetime.now(timezone.utc)
        db.commit()

        discovery = discover_source_files(raw_dir)
        repo_name = extract_repo_display_name(clean_url)

        # Step 3: Persist Project
        project_id = f"proj_{uuid.uuid4().hex[:12]}"
        project = Project(
            id=project_id,
            display_name=repo_name,
            source_type="github",
            source_url=clean_url,
            detected_languages=discovery.detected_languages,
            total_files=discovery.total_files,
            total_lines=discovery.total_lines,
            content_hash=discovery.content_hash,
            workspace_id=workspace_id,
            created_at=datetime.now(timezone.utc),
        )

        db.add(project)

        for disc_file in discovery.files:
            file_id = f"file_{hashlib.sha256(f'{project_id}:{disc_file.relative_path}'.encode('utf-8')).hexdigest()[:12]}"
            pfile = ProjectFile(
                id=file_id,
                project_id=project_id,
                relative_path=disc_file.relative_path,
                language=disc_file.language,
                size_bytes=disc_file.size_bytes,
                line_count=disc_file.line_count,
                sha256_hash=disc_file.sha256_hash,
            )
            db.add(pfile)

        db.commit()

        # Step 4: Automatic Deterministic Static Analysis
        job.state = JobState.ANALYZING
        job.stage = "Running deterministic static analysis..."
        job.progress_percentage = 75
        job.project_id = project_id
        job.updated_at = datetime.now(timezone.utc)
        db.commit()

        run_analysis_for_project(db, project_id, force=True)

        # Step 5: Completion
        job.state = JobState.COMPLETED
        job.stage = "Completed"
        job.progress_percentage = 100
        job.project_id = project_id
        job.message = "GitHub ingestion and static code analysis complete."
        job.updated_at = datetime.now(timezone.utc)

        db.commit()

    except IngestionError as ie:
        db.rollback()
        logger.warning("Ingestion error for GitHub job %s: %s [%s]", job_id, ie.message, ie.code)
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.state = JobState.FAILED
            job.stage = "Failed"
            job.error_code = ie.code
            job.error_message = ie.message
            job.updated_at = datetime.now(timezone.utc)
            db.commit()
        cleanup_workspace(workspace_id)

    except Exception as e:
        db.rollback()
        logger.exception("Unexpected error processing GitHub job %s", job_id)
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.state = JobState.FAILED
            job.stage = "Failed"
            job.error_code = "INTERNAL_ERROR"
            job.error_message = "An unexpected error occurred while processing the repository."
            job.updated_at = datetime.now(timezone.utc)
            db.commit()
        cleanup_workspace(workspace_id)

    finally:
        db.close()
