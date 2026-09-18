import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.analysis.knowledge_graph import build_knowledge_graph
from app.models.db import Project, ProjectAnalysisRecord
from app.analysis.models import ProjectAnalysis, ModuleAnalysis, SymbolInfo, ImportInfo, ExportInfo, CallInfo, DependencyEdge


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_build_knowledge_graph_structure(db_session):
    # 1. Create a dummy project in test DB
    project_id = "test_kg_proj_001"
    proj = Project(
        id=project_id,
        display_name="KG Test Project",
        source_type="zip",
        detected_languages=["python"],
        total_files=2,
        total_lines=50,
        content_hash="hash_001",
        workspace_id="ws_001",
    )
    db_session.add(proj)

    # 2. Mock ProjectAnalysis
    mod1 = ModuleAnalysis(
        module_id="mod_001",
        relative_path="backend/app/api/routes.py",
        language="python",
        line_count=30,
        parse_status="complete",
        imports=[ImportInfo(module_name="backend/app/models/db.py", source_line=5)],
        classes=[SymbolInfo(symbol_id="sym_c1", kind="class", name="UserAPI", qualified_name="UserAPI", start_line=10, end_line=25)],
        functions=[SymbolInfo(symbol_id="sym_f1", kind="function", name="get_users", qualified_name="get_users", start_line=26, end_line=30)],
        exports=[ExportInfo(name="get_users", kind="function", source_line=26)],
        calls=[CallInfo(caller_qualified_name="get_users", target_name="query_users", source_line=28)],
    )

    mod2 = ModuleAnalysis(
        module_id="mod_002",
        relative_path="tests/test_routes.py",
        language="python",
        line_count=20,
        parse_status="complete",
        functions=[SymbolInfo(symbol_id="sym_f2", kind="function", name="test_get_users", qualified_name="test_get_users", start_line=5, end_line=15)],
    )

    dep_edge = DependencyEdge(
        edge_id="edge_001",
        source_module_id="mod_001",
        target_module_id="fastapi",
        type="import",
        source_line=1,
    )

    analysis = ProjectAnalysis(
        project_id=project_id,
        content_hash="hash_001",
        languages=["python"],
        total_files=2,
        total_lines=50,
        modules=[mod1, mod2],
        dependency_edges=[dep_edge],
    )

    record = ProjectAnalysisRecord(
        id="rec_kg_001",
        project_id=project_id,
        analyzer_version="1.0.0",
        content_hash="hash_001",
        analysis_data=analysis.model_dump(mode="json"),
    )
    db_session.add(record)
    db_session.commit()

    # 3. Execute build_knowledge_graph
    kg_res = build_knowledge_graph(db_session, project_id)

    # 4. Assertions
    assert kg_res.project_id == project_id
    assert kg_res.summary.total_nodes > 0
    assert kg_res.summary.total_edges > 0
    assert kg_res.summary.validation.status in ("valid", "warnings")

    kinds = [n.kind for n in kg_res.nodes]
    assert "project" in kinds
    assert "module" in kinds
    assert "class" in kinds
    assert "function" in kinds
    assert "test" in kinds
    assert "dependency" in kinds

    relations = [e.relation for e in kg_res.edges]
    assert "EXPOSES" in relations
    assert "CALLS" in relations
    assert "DEPENDS_ON" in relations
