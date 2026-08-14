from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "CodeOracle"
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "sqlite:///./codeoracle.db"
    
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
    CLONE_TIMEOUT_SECONDS: int = 150
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

    # LLM Settings (Optional for static analysis)
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_API_BASE: str = "https://api.openai.com/v1"
    LLM_MODEL: str = "gpt-4o-mini"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
