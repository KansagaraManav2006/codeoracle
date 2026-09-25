import logging
import re
import uuid
import hashlib
import hmac
import secrets
import urllib.parse
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.config import settings

from app.api.auth import (
    SESSION_COOKIE_NAME,
    SESSION_DURATION_DAYS,
    create_user_session,
    delete_user_session,
    get_current_user,
    get_current_user_optional,
    get_token_from_request,
    hash_password,
    verify_password,
)
from app.database import get_db
from app.models.db import User

logger = logging.getLogger(__name__)

auth_router = APIRouter(prefix="/auth", tags=["auth"])

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
OAUTH_STATE_COOKIE_NAME = "codeoracle_oauth_state"


def _sign_oauth_state(state: str, dest: str) -> str:
    """Generate signed cookie value containing state and destination path."""
    raw = f"{state}:{dest}"
    sig = hmac.new(settings.SECRET_KEY.encode(), raw.encode(), hashlib.sha256).hexdigest()
    return f"{raw}:{sig}"


def _verify_oauth_state(cookie_val: Optional[str], state: str) -> Optional[str]:
    """Verify signed state cookie against incoming state parameter. Returns safe destination or None."""
    if not cookie_val:
        return None
    parts = cookie_val.split(":")
    if len(parts) != 3:
        return None
    c_state, dest, sig = parts
    expected_sig = hmac.new(settings.SECRET_KEY.encode(), f"{c_state}:{dest}".encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected_sig):
        return None
    if not hmac.compare_digest(state, c_state):
        return None
    # Sanitize dest to prevent open redirects
    if not dest.startswith("/") or dest.startswith("//") or "\\" in dest:
        return "/"
    return dest


class RegisterRequest(BaseModel):
    email: str = Field(..., description="Valid user email address")
    password: str = Field(..., min_length=8, description="Password (at least 8 characters)")

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        clean = v.strip().lower()
        if not EMAIL_REGEX.match(clean):
            raise ValueError("Please provide a valid email address.")
        return clean

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        return v


class LoginRequest(BaseModel):
    email: str = Field(..., description="Registered email address")
    password: str = Field(..., description="Account password")

    @field_validator("email")
    @classmethod
    def clean_email(cls, v: str) -> str:
        return v.strip().lower()


class UserResponse(BaseModel):
    id: str
    email: str
    created_at: datetime


class AuthResponse(BaseModel):
    user: UserResponse
    token: str
    message: str = "Authenticated successfully"


def _set_session_cookie(response: Response, token: str) -> None:
    """Set secure httpOnly session cookie with 30-day lifetime."""
    max_age = SESSION_DURATION_DAYS * 24 * 3600
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=max_age,
        expires=max_age,
        path="/",
        httponly=True,
        samesite="lax",
        secure=settings.is_cookie_secure,
    )


@auth_router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, response: Response, db: Session = Depends(get_db)) -> AuthResponse:
    """Register a new user account with secure password hashing and start a session."""
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists. Please sign in.",
        )

    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    hashed = hash_password(payload.password)

    user = User(
        id=user_id,
        email=payload.email,
        hashed_password=hashed,
        created_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_user_session(db, user.id)
    _set_session_cookie(response, token)

    return AuthResponse(
        user=UserResponse(id=user.id, email=user.email, created_at=user.created_at),
        token=token,
        message="Account created successfully",
    )


@auth_router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> AuthResponse:
    """Authenticate user with email and password, returning session token and setting cookie."""
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please check your credentials.",
        )

    token = create_user_session(db, user.id)
    _set_session_cookie(response, token)

    return AuthResponse(
        user=UserResponse(id=user.id, email=user.email, created_at=user.created_at),
        token=token,
        message="Signed in successfully",
    )


@auth_router.get("/me", response_model=UserResponse)
def get_current_user_profile(user: User = Depends(get_current_user)) -> UserResponse:
    """Retrieve the profile of the currently signed-in user."""
    return UserResponse(id=user.id, email=user.email, created_at=user.created_at)


@auth_router.post("/logout")
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
) -> dict:
    """Invalidate current user session and remove session cookie."""
    token = get_token_from_request(request)
    if token:
        delete_user_session(db, token)

    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/",
        httponly=True,
        samesite="lax",
        secure=settings.is_cookie_secure,
    )
    return {"status": "ok", "message": "Signed out successfully"}


@auth_router.get("/google/status")
def get_google_auth_status() -> dict:
    """Return whether Google OAuth is configured and ready."""
    return {
        "configured": settings.is_google_auth_configured,
        "message": (
            "Google Sign-In is configured."
            if settings.is_google_auth_configured
            else "Google Sign-In is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env to enable."
        ),
    }


@auth_router.get("/google/login")
def google_login(redirect_url: Optional[str] = None) -> RedirectResponse:
    """Initiate Google OAuth2 flow with CSRF state protection."""
    if not settings.is_google_auth_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google Sign-In is not configured on this server. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env.",
        )

    safe_dest = "/"
    if redirect_url and redirect_url.startswith("/") and not redirect_url.startswith("//") and "\\" not in redirect_url:
        safe_dest = redirect_url

    state = secrets.token_urlsafe(32)
    state_cookie_val = _sign_oauth_state(state, safe_dest)

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }
    google_auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"

    redirect_resp = RedirectResponse(url=google_auth_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)
    redirect_resp.set_cookie(
        key=OAUTH_STATE_COOKIE_NAME,
        value=state_cookie_val,
        max_age=600,  # 10 minutes
        path="/",
        httponly=True,
        samesite="lax",
        secure=settings.is_cookie_secure,
    )
    return redirect_resp


@auth_router.get("/google/callback")
async def google_callback(
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: Session = Depends(get_db),
) -> RedirectResponse:
    """Handle callback from Google OAuth2, safely verify identity, and create user session."""
    frontend_base = settings.FRONTEND_URL.rstrip("/")
    error_redirect_base = f"{frontend_base}/signin"

    if error:
        logger.warning("Google OAuth error received from provider: %s", error)
        return RedirectResponse(url=f"{error_redirect_base}?error=google_{error}", status_code=status.HTTP_302_FOUND)

    if not code or not state:
        return RedirectResponse(url=f"{error_redirect_base}?error=invalid_request", status_code=status.HTTP_302_FOUND)

    cookie_state = request.cookies.get(OAUTH_STATE_COOKIE_NAME)
    safe_dest = _verify_oauth_state(cookie_state, state)
    if safe_dest is None:
        logger.warning("Google OAuth state validation failed")
        return RedirectResponse(url=f"{error_redirect_base}?error=invalid_state", status_code=status.HTTP_302_FOUND)

    if not settings.is_google_auth_configured:
        return RedirectResponse(url=f"{error_redirect_base}?error=unconfigured", status_code=status.HTTP_302_FOUND)

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            token_resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                    "grant_type": "authorization_code",
                },
            )
            if token_resp.status_code != 200:
                logger.error("Google token exchange failed: %s %s", token_resp.status_code, token_resp.text)
                return RedirectResponse(url=f"{error_redirect_base}?error=token_exchange_failed", status_code=status.HTTP_302_FOUND)

            token_data = token_resp.json()
            access_token = token_data.get("access_token")
            if not access_token:
                return RedirectResponse(url=f"{error_redirect_base}?error=missing_access_token", status_code=status.HTTP_302_FOUND)

            userinfo_resp = await client.get(
                "https://openidconnect.googleapis.com/v1/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if userinfo_resp.status_code != 200:
                logger.error("Failed to fetch Google userinfo: %s %s", userinfo_resp.status_code, userinfo_resp.text)
                return RedirectResponse(url=f"{error_redirect_base}?error=userinfo_failed", status_code=status.HTTP_302_FOUND)

            userinfo = userinfo_resp.json()
    except Exception as exc:
        logger.exception("Google OAuth communication failed: %s", exc)
        return RedirectResponse(url=f"{error_redirect_base}?error=provider_failure", status_code=status.HTTP_302_FOUND)

    email = userinfo.get("email")
    email_verified = userinfo.get("email_verified", False)
    google_sub = userinfo.get("sub")

    if not email or not google_sub:
        return RedirectResponse(url=f"{error_redirect_base}?error=invalid_profile", status_code=status.HTTP_302_FOUND)

    # Safe account linking: Do not link or create accounts on an unverified email claim
    if not email_verified:
        logger.warning("Rejecting unverified Google email claim: %s", email)
        return RedirectResponse(url=f"{error_redirect_base}?error=unverified_email", status_code=status.HTTP_302_FOUND)

    clean_email = email.strip().lower()

    # Look for existing user by google_id first, then by email
    user = db.query(User).filter(User.google_id == google_sub).first()
    if not user:
        user = db.query(User).filter(User.email == clean_email).first()
        if user:
            user.google_id = google_sub
            db.commit()
        else:
            user_id = f"usr_{uuid.uuid4().hex[:12]}"
            random_password = hash_password(secrets.token_urlsafe(32))
            user = User(
                id=user_id,
                email=clean_email,
                hashed_password=random_password,
                google_id=google_sub,
                created_at=datetime.now(timezone.utc),
            )
            db.add(user)
            db.commit()
            db.refresh(user)

    token = create_user_session(db, user.id)

    target_url = f"{frontend_base}{safe_dest}" if safe_dest.startswith("/") else frontend_base
    redirect_resp = RedirectResponse(url=target_url, status_code=status.HTTP_302_FOUND)
    _set_session_cookie(redirect_resp, token)
    redirect_resp.delete_cookie(
        key=OAUTH_STATE_COOKIE_NAME,
        path="/",
        httponly=True,
        samesite="lax",
        secure=settings.is_cookie_secure,
    )
    return redirect_resp
