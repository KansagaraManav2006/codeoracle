import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.api.auth import get_current_user_optional
from app.api.helpers import get_authorized_project
from app.database import get_db
from app.migration.models import ChangeImpact, MigrationPlanResponse
from app.migration.service import build_migration_plan, get_module_change_impact
from app.models.db import User

logger = logging.getLogger(__name__)

router = APIRouter(tags=["migration"])


@router.get("/projects/{project_id}/migration-plan", response_model=MigrationPlanResponse)
def get_migration_plan(
    project_id: str,
    response: Response,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> MigrationPlanResponse:
    """Build an explainable modernization-readiness and change-impact plan."""
    get_authorized_project(project_id, db, current_user)
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


@router.get("/projects/{project_id}/impact", response_model=ChangeImpact)
def get_project_change_impact(
    project_id: str,
    target: str = Query(..., description="Relative path or module ID of target file"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> ChangeImpact:
    """Retrieve detailed 'What breaks if I change this?' change impact for a specific file or module."""
    get_authorized_project(project_id, db, current_user)
    try:
        return get_module_change_impact(db, project_id, target)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except Exception:
        logger.exception("Change impact calculation failed for project %s target %s", project_id, target)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to calculate change impact.")
