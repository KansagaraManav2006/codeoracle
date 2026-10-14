import shutil
from pathlib import Path
from app.config import settings


def get_workspace_dir(workspace_id: str) -> Path:
    """Returns absolute path to workspace directory."""
    base_dir = Path(settings.WORKSPACES_DIR).resolve()
    base_dir.mkdir(parents=True, exist_ok=True)
    return base_dir / workspace_id


def cleanup_workspace(workspace_id: str) -> None:
    """Safely removes an isolated workspace folder."""
    try:
        ws_dir = get_workspace_dir(workspace_id)
        if ws_dir.exists():
            shutil.rmtree(ws_dir, ignore_errors=True)
    except Exception:
        pass


def delete_project_workspace_and_records(db, project) -> None:
    """
    Permanently deletes a project's physical workspace files and cascades
    deletion across all dependent database records.
    """
    from app.models.db import Job, ProjectAnalysisRecord, ProjectFile, ProjectRefactorRecord, ProjectTestRecord

    # 1. Safely remove physical workspace folder on disk
    cleanup_workspace(project.workspace_id)

    # 2. Clean up temporary uploaded zip file if present
    temp_dir = Path(settings.TEMP_STORAGE_DIR).resolve()
    for job in db.query(Job).filter(Job.project_id == project.id).all():
        temp_zip = temp_dir / f"{job.id}.zip"
        if temp_zip.exists():
            try:
                temp_zip.unlink(missing_ok=True)
            except Exception:
                pass

    # 3. Cascade database record deletions
    db.query(ProjectFile).filter(ProjectFile.project_id == project.id).delete(synchronize_session=False)
    db.query(ProjectAnalysisRecord).filter(ProjectAnalysisRecord.project_id == project.id).delete(synchronize_session=False)
    db.query(ProjectTestRecord).filter(ProjectTestRecord.project_id == project.id).delete(synchronize_session=False)
    db.query(ProjectRefactorRecord).filter(ProjectRefactorRecord.project_id == project.id).delete(synchronize_session=False)
    db.query(Job).filter(Job.project_id == project.id).delete(synchronize_session=False)
    db.delete(project)
    db.commit()


def cleanup_abandoned_jobs(db, max_age_hours: int = 24) -> int:
    """
    Prunes temporary ZIP files and cleans up jobs abandoned or failed older than max_age_hours.
    """
    from datetime import datetime, timedelta, timezone
    from app.models.db import Job, JobState

    cutoff = datetime.now(timezone.utc) - timedelta(hours=max_age_hours)
    stale_jobs = (
        db.query(Job)
        .filter(Job.created_at < cutoff, Job.state.in_([JobState.FAILED, JobState.COMPLETED]))
        .all()
    )

    temp_dir = Path(settings.TEMP_STORAGE_DIR).resolve()
    cleaned = 0
    for job in stale_jobs:
        temp_zip = temp_dir / f"{job.id}.zip"
        if temp_zip.exists():
            try:
                temp_zip.unlink(missing_ok=True)
                cleaned += 1
            except Exception:
                pass

    return cleaned

