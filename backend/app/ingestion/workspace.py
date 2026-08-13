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
