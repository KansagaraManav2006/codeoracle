from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

# SQLite connection args for multithreaded environment
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def ensure_schema_compatibility() -> None:
    """Apply tiny additive SQLite migrations needed by hackathon upgrades."""
    if not settings.DATABASE_URL.startswith("sqlite"):
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


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
