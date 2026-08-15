import os
from datetime import datetime, timezone
from pathlib import Path

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.analysis.models import (
    ComplexitySummary,
    ModuleAnalysis,
    ProjectAnalysis,
    generate_module_id,
)
from app.database import Base, migrate_legacy_sqlite_database, resolve_database_url
from app.migration.service import build_migration_plan
from app.models.db import Project, ProjectAnalysisRecord, ProjectFile, ProjectTestRecord
from app.testgen.models import GeneratedTestFile, ProjectTestResult, TEST_GENERATOR_VERSION


def test_resolve_database_url_unit(tmp_path):
    # 1. PostgreSQL URL unchanged
    pg_url = "postgresql://user:pass@localhost:5432/dbname"
    assert resolve_database_url(pg_url) == pg_url

    # 2. In-memory SQLite unchanged
    assert resolve_database_url("sqlite:///:memory:") == "sqlite:///:memory:"

    # 3. Custom data dir override
    custom_dir = tmp_path / "custom_data"
    res_url = resolve_database_url("sqlite:///./custom.db", data_dir_override=str(custom_dir))
    assert custom_dir.exists()
    assert "custom.db" in res_url
    assert res_url.startswith("sqlite:///")

    # 4. Default resolution
    default_url = resolve_database_url("sqlite:///./codeoracle.db")
    assert default_url.startswith("sqlite:///")
    assert "codeoracle.db" in default_url


def test_migrate_legacy_sqlite_database_without_overwriting(tmp_path):
    legacy_file = tmp_path / "legacy" / "codeoracle.db"
    legacy_file.parent.mkdir()
    legacy_engine = create_engine(f"sqlite:///{legacy_file.as_posix()}")
    with legacy_engine.begin() as connection:
        connection.execute(text("CREATE TABLE marker (value TEXT NOT NULL)"))
        connection.execute(text("INSERT INTO marker (value) VALUES ('preserved')"))
    legacy_engine.dispose()

    target_file = tmp_path / "data" / "codeoracle.db"
    target_url = f"sqlite:///{target_file.as_posix()}"
    migrated_path = migrate_legacy_sqlite_database(target_url, legacy_file)

    assert migrated_path == target_file.resolve()
    with create_engine(target_url).connect() as connection:
        assert connection.execute(text("SELECT value FROM marker")).scalar_one() == "preserved"

    target_file.write_bytes(b"do-not-overwrite")
    assert migrate_legacy_sqlite_database(target_url, legacy_file) is None
    assert target_file.read_bytes() == b"do-not-overwrite"


def test_integration_full_workflow_persistence_across_sessions_and_engine_recreation(tmp_path):
    """
    Integration test verifying Task 4 requirement:
    Workflow: Project -> ProjectFile -> ProjectAnalysisRecord -> ProjectTestRecord -> Session Close -> New Session -> Engine Recreate -> build_migration_plan.
    """
    db_file = tmp_path / "persistence_test.db"
    db_url = f"sqlite:///{db_file.as_posix()}"

    # Engine 1
    engine1 = create_engine(db_url, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine1)
    Session1 = sessionmaker(bind=engine1)

    project_id = "proj_persist_test"
    module_id = generate_module_id(project_id, "main.py")

    # Step 1-7: Store records in Session 1
    session1 = Session1()

    # Store Project
    proj = Project(
        id=project_id,
        display_name="Persistence Sample",
        source_type="zip",
        detected_languages=["python"],
        total_files=1,
        total_lines=50,
        content_hash="hash_123",
        workspace_id="ws_123",
        created_at=datetime.now(timezone.utc),
    )
    session1.add(proj)

    # Store ProjectFile
    pf = ProjectFile(
        id=f"file_{module_id}",
        project_id=project_id,
        relative_path="main.py",
        language="python",
        size_bytes=500,
        line_count=50,
        sha256_hash="hash_file",
    )
    session1.add(pf)

    # Store ProjectAnalysisRecord
    analysis = ProjectAnalysis(
        project_id=project_id,
        content_hash="hash_123",
        languages=["python"],
        total_files=1,
        total_lines=50,
        modules=[
            ModuleAnalysis(
                module_id=module_id,
                relative_path="main.py",
                language="python",
                line_count=50,
                parse_status="complete",
                is_entry_point=True,
                complexity=ComplexitySummary(cyclomatic_complexity=3, rating="low"),
            )
        ],
        parse_success_count=1,
    )
    session1.add(ProjectAnalysisRecord(
        id=f"analysis_{project_id}",
        project_id=project_id,
        analyzer_version=analysis.analyzer_version,
        content_hash="hash_123",
        analysis_data=analysis.model_dump(mode="json"),
        created_at=datetime.now(timezone.utc),
    ))

    # Store ProjectTestRecord
    test_res = ProjectTestResult(
        project_id=project_id,
        generation_version=TEST_GENERATOR_VERSION,
        generated_at=datetime.now(timezone.utc).isoformat(),
        status="completed",
        test_files=[
            GeneratedTestFile(
                test_id="t1",
                target_relative_path="main.py",
                language="python",
                framework="pytest",
                safe_test_path="tests/test_main.py",
                code="def test_main(): pass",
                generation_strategy="deterministic",
                syntax_valid=True,
            )
        ],
        target_source_files=1,
        total_generated_tests=1,
        syntax_valid_count=1,
        overall_line_coverage=None,
    )
    session1.add(ProjectTestRecord(
        id=f"rec_test_{project_id}",
        project_id=project_id,
        generator_version=TEST_GENERATOR_VERSION,
        content_hash="hash_123",
        test_data=test_res.model_dump(mode="json"),
        created_at=datetime.now(timezone.utc),
    ))

    session1.commit()
    session1.close()

    # Step 8: Open Session 2 on Engine 1
    session2 = Session1()
    test_rec_2 = session2.query(ProjectTestRecord).filter(ProjectTestRecord.project_id == project_id).first()
    assert test_rec_2 is not None
    assert test_rec_2.generator_version == TEST_GENERATOR_VERSION
    session2.close()

    # Step 9: Dispose Engine 1 and recreate Engine 2 against the exact same DB file
    engine1.dispose()

    engine2 = create_engine(db_url, connect_args={"check_same_thread": False})
    Session3 = sessionmaker(bind=engine2)
    session3 = Session3()

    # Step 10: build_migration_plan reads the record and recalculates score from persisted data
    plan = build_migration_plan(session3, project_id)
    session3.close()
    engine2.dispose()

    testability = next(c for c in plan.categories if c.key == "testability")
    assert testability.score > 35  # Recalculated from persisted record (expected 76)
    assert testability.score == 76
    assert "Syntax-based estimation" in testability.reason
