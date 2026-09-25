import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.db import Project, User, UserSession

logger = logging.getLogger(__name__)

SESSION_COOKIE_NAME = "codeoracle_session"
SESSION_DURATION_DAYS = 30


def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    """Verify password against bcrypt hash or legacy salt:hash."""
    try:
        if hashed.startswith("$2"):
            return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
        if ":" in hashed:
            import hashlib
            import hmac
            salt, stored_hash = hashed.split(":", 1)
            # Try PBKDF2 sha256
            cand_pbkdf2 = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), 100000).hex()
            if hmac.compare_digest(cand_pbkdf2, stored_hash):
                return True
            # Try plain salt + password sha256
            cand_sha256 = hashlib.sha256((salt + password).encode("utf-8")).hexdigest()
            if hmac.compare_digest(cand_sha256, stored_hash):
                return True
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_user_session(db: Session, user_id: str) -> str:
    """Generate cryptographically secure session token and persist to database."""
    session_id = f"sess_{secrets.token_hex(12)}"
    token = f"co_{secrets.token_urlsafe(32)}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=SESSION_DURATION_DAYS)

    session = UserSession(
        id=session_id,
        user_id=user_id,
        token=token,
        created_at=datetime.now(timezone.utc),
        expires_at=expires_at,
    )
    db.add(session)
    db.commit()
    return token


def delete_user_session(db: Session, token: str) -> None:
    """Invalidate session in database."""
    session = (
        db.query(UserSession)
        .filter((UserSession.token == token) | (UserSession.id == token))
        .first()
    )
    if session:
        db.delete(session)
        db.commit()


def get_token_from_request(request: Request) -> Optional[str]:
    """Extract session token from cookie, Authorization Bearer header, or X-Session-Token."""
    cookie_token = request.cookies.get(SESSION_COOKIE_NAME)
    if cookie_token:
        return cookie_token

    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
        if token:
            return token

    x_token = request.headers.get("X-Session-Token")
    if x_token:
        return x_token.strip()

    return None


def get_current_user_optional(
    request: Request, db: Session = Depends(get_db)
) -> Optional[User]:
    """Retrieve current authenticated user if valid session exists."""
    token = get_token_from_request(request)
    if not token:
        return None

    session = (
        db.query(UserSession)
        .filter((UserSession.token == token) | (UserSession.id == token))
        .first()
    )
    if not session:
        return None

    now = datetime.now(timezone.utc)
    # Handle timezone-aware vs naive in sqlite
    session_exp = session.expires_at
    if session_exp.tzinfo is None:
        session_exp = session_exp.replace(tzinfo=timezone.utc)

    if session_exp < now:
        db.delete(session)
        db.commit()
        return None

    return session.user


def get_current_user(
    user: Optional[User] = Depends(get_current_user_optional),
) -> User:
    """Require valid authenticated user; raise 401 if missing."""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def can_access_project(project: Project, user: Optional[User]) -> bool:
    """
    Check if user is authorized to access project:
    - Explicit public demos (is_public_demo == 1) are accessible by anyone (guests and signed-in users).
    - Private user projects are accessible ONLY by their owner (user.id == project.user_id).
    - Legacy unowned projects (user_id is None, is_public_demo == 0) are preserved in database
      but NOT exposed to unauthenticated guests.
    """
    if getattr(project, "is_public_demo", 0) == 1 or getattr(project, "is_public_demo", False) is True:
        return True
    if user is not None and project.user_id == user.id:
        return True
    return False
