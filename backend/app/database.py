import logging
import shutil
from pathlib import Path
from typing import Any, Dict, Optional

from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

logger = logging.getLogger(__name__)


def resolve_database_url(
    custom_database_url: Optional[str] = None,
    data_dir_override: Optional[str] = None,
) -> str:
    """
    Resolves the application database URL into a deterministic, absolute string.
    - PostgreSQL/MySQL URLs are returned unchanged.
    - In-memory SQLite ('sqlite:///:memory:' or 'sqlite://') is returned unchanged.
    - SQLite file URLs are resolved to an absolute path inside the resolved data directory.
    - Parent directories are created automatically.
    """
    db_url = custom_database_url or getattr(settings, "DATABASE_URL", None) or "sqlite:///./codeoracle.db"

    if not db_url.startswith("sqlite"):
        return db_url

    if db_url in ("sqlite://", "sqlite:///", "sqlite:///:memory:"):
        return "sqlite:///:memory:"

    configured_data_dir = data_dir_override or getattr(settings, "CODEORACLE_DATA_DIR", None)
    if configured_data_dir:
        resolved_data_dir = Path(configured_data_dir).resolve()
    else:
        docker_app_dir = Path("/app")
        if docker_app_dir.exists() and docker_app_dir.is_dir() and Path(__file__).resolve().as_posix().startswith("/app"):
            resolved_data_dir = (docker_app_dir / "data").resolve()
        else:
            backend_dir = Path(__file__).resolve().parent.parent
            resolved_data_dir = (backend_dir / "data").resolve()

    prefix = "sqlite:///"
    if db_url.startswith(prefix):
        raw_path_str = db_url[len(prefix):]
    elif db_url.startswith("sqlite://"):
        raw_path_str = db_url[len("sqlite://"):]
    else:
        raw_path_str = "codeoracle.db"

    p = Path(raw_path_str)
    if p.is_absolute():
        target_file_path = p.resolve()
    else:
        clean_filename = p.name if p.name and p.name not in (".", "..") else "codeoracle.db"
        target_file_path = (resolved_data_dir / clean_filename).resolve()

    target_file_path.parent.mkdir(parents=True, exist_ok=True)

    posix_path = target_file_path.as_posix()
    if not posix_path.startswith("/"):
        posix_path = f"/{posix_path}"

    return f"sqlite://{posix_path}"


def _sqlite_file_path(database_url: str) -> Optional[Path]:
    """Return a platform-correct filesystem path for a file-backed SQLite URL."""
    if not database_url.startswith("sqlite") or database_url == "sqlite:///:memory:":
        return None
    raw_path = database_url.replace("sqlite:///", "", 1).replace("sqlite://", "", 1)
    if len(raw_path) > 2 and raw_path[0] == "/" and raw_path[2] == ":":
        raw_path = raw_path[1:]
    return Path(raw_path).resolve()


def migrate_legacy_sqlite_database(
    database_url: str,
    legacy_path_override: Optional[Path] = None,
) -> Optional[Path]:
    """Move the pre-data-directory database forward without overwriting a new database."""
    target_path = _sqlite_file_path(database_url)
    if target_path is None or target_path.exists():
        return None

    backend_dir = Path(__file__).resolve().parent.parent
    legacy_path = legacy_path_override or (backend_dir / "codeoracle.db")
    if not legacy_path.is_file() or legacy_path.resolve() == target_path:
        return None

    target_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(legacy_path, target_path)
    logger.info("Migrated legacy SQLite database to %s", target_path)
    return target_path


FINAL_DATABASE_URL = resolve_database_url()
migrate_legacy_sqlite_database(FINAL_DATABASE_URL)
is_sqlite = FINAL_DATABASE_URL.startswith("sqlite")

connect_args: Dict[str, Any] = {}
if is_sqlite:
    connect_args["check_same_thread"] = False
    connect_args["timeout"] = 30

engine = create_engine(
    FINAL_DATABASE_URL,
    connect_args=connect_args,
    echo=False,
)

if is_sqlite:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        try:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            if FINAL_DATABASE_URL != "sqlite:///:memory:":
                cursor.execute("PRAGMA journal_mode=DELETE")
                cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.close()
        except Exception:
            pass

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def ensure_schema_compatibility() -> None:
    """Apply tiny additive SQLite migrations needed by upgrades."""
    if not is_sqlite or FINAL_DATABASE_URL == "sqlite:///:memory:":
        return
    with engine.begin() as connection:
        columns = {
            row[1]
            for row in connection.execute(text("PRAGMA table_info(projects)"))
        }
        if columns and "is_trusted" not in columns:
            connection.execute(
                text("ALTER TABLE projects ADD COLUMN is_trusted INTEGER NOT NULL DEFAULT 0")
            )


def get_db_diagnostics() -> dict:
    """Returns safe database diagnostic information."""
    backend = "sqlite" if is_sqlite else "postgresql"
    reachable = False
    schema_ready = False
    db_file_exists = False
    db_file_size_bytes = 0
    resolved_path_str: Optional[str] = None

    if is_sqlite and FINAL_DATABASE_URL != "sqlite:///:memory:":
        raw_path = FINAL_DATABASE_URL.replace("sqlite:///", "").replace("sqlite://", "")
        if len(raw_path) > 2 and raw_path[0] == "/" and raw_path[2] == ":":
            raw_path = raw_path[1:]
        p = Path(raw_path)
        resolved_path_str = str(p.resolve())
        db_file_exists = p.exists()
        if db_file_exists:
            db_file_size_bytes = p.stat().st_size

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            reachable = True
            table_names = set(inspect(conn).get_table_names())
            schema_ready = "projects" in table_names and "project_analyses" in table_names
    except Exception as e:
        logger.warning("Database diagnostic connectivity check failed: %s", e)

    diag: Dict[str, Any] = {
        "backend": backend,
        "reachable": reachable,
        "schema_ready": schema_ready,
    }

    if getattr(settings, "ENVIRONMENT", "production") == "development" and resolved_path_str:
        diag["path"] = resolved_path_str
        diag["file_exists"] = db_file_exists
        diag["size_bytes"] = db_file_size_bytes

    return diag


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
