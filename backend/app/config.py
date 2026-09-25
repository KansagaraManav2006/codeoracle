from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    APP_NAME: str = "CodeOracle"
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "sqlite:///./codeoracle.db"
    CODEORACLE_DATA_DIR: Optional[str] = None
    
    # CORS Settings
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]
    
    # Static Files Directory Override
    STATIC_DIR: Optional[str] = None
    
    # Ingestion & Security Thresholds
    MAX_ZIP_COMPRESSED_BYTES: int = 200 * 1024 * 1024  # 200MB
    MAX_ZIP_UNCOMPRESSED_BYTES: int = 500 * 1024 * 1024  # 500MB
    MAX_FILE_BYTES: int = 50 * 1024 * 1024  # 50MB
    MAX_ZIP_ENTRIES: int = 10000
    MAX_COMPRESSION_RATIO: float = 100.0
    MAX_RELEVANT_LINES: int = 100000
    CLONE_TIMEOUT_SECONDS: int = 300
    MAX_CLONE_SIZE_BYTES: int = 500 * 1024 * 1024  # 500MB

    # Generated-test execution is opt-in. Uploaded code is untrusted.
    TEST_EXECUTION_ENABLED: bool = False
    TEST_EXECUTION_ALLOW_UNTRUSTED: bool = False
    TEST_EXECUTION_TIMEOUT_SECONDS: int = 20
    TEST_EXECUTION_MAX_OUTPUT_BYTES: int = 65536
    TEST_EXECUTION_MAX_ITERATIONS: int = 2
    
    # Workspaces
    WORKSPACES_DIR: str = "workspaces"
    TEMP_STORAGE_DIR: str = "temp_storage"

    @property
    def TEMP_DIR(self) -> str:
        return self.TEMP_STORAGE_DIR

    # Session & Security Settings
    SECRET_KEY: str = "codeoracle-dev-insecure-secret-key-change-in-production"
    SESSION_COOKIE_NAME: str = "codeoracle_session"
    SESSION_DURATION_DAYS: int = 30
    SESSION_COOKIE_SECURE: Optional[bool] = None

    @property
    def is_cookie_secure(self) -> bool:
        """
        Determines whether session and OAuth state cookies must have the Secure flag.
        If SESSION_COOKIE_SECURE is explicitly set, respect it.
        Otherwise, default to True if ENVIRONMENT is 'production' or FRONTEND_URL uses https://,
        and False for local development over http://.
        """
        if self.SESSION_COOKIE_SECURE is not None:
            return bool(self.SESSION_COOKIE_SECURE)
        env = (self.ENVIRONMENT or "").strip().lower()
        frontend = (self.FRONTEND_URL or "").strip().lower()
        return env == "production" or frontend.startswith("https://")

    # Google OAuth (Server-side only)
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/auth/google/callback"
    FRONTEND_URL: str = "http://localhost:5173"

    @property
    def is_google_auth_configured(self) -> bool:
        """Verify whether real, non-placeholder Google OAuth credentials are provided."""
        if not self.GOOGLE_CLIENT_ID or not self.GOOGLE_CLIENT_SECRET:
            return False
        cid = self.GOOGLE_CLIENT_ID.strip()
        sec = self.GOOGLE_CLIENT_SECRET.strip()
        if not cid or not sec:
            return False
        if cid.startswith("your_") or sec.startswith("your_") or "placeholder" in cid.lower() or "placeholder" in sec.lower():
            return False
        return True

    # LLM Settings (Optional for static analysis)
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_API_BASE: str = "https://api.openai.com/v1"
    LLM_MODEL: str = "gpt-4o-mini"

    # Multi-tier env loading: ROOT_DIR/.env is overridden by BACKEND_DIR/.env,
    # and both are overridden by active process environment variables.
    model_config = SettingsConfigDict(
        env_file=(
            str(ROOT_DIR / ".env"),
            str(BACKEND_DIR / ".env"),
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
