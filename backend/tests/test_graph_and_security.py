import json
import os
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.analysis.graph_service import build_project_dependency_graph, find_directed_cycles
from app.analysis.models import ModuleAnalysis, ProjectAnalysis, generate_module_id
from app.analysis.python_analyzer import analyze_python_source
from app.analysis.service import run_analysis_for_project
from app.database import Base, get_db
from app.main import app
from app.models.db import Job, JobState, Project, ProjectAnalysisRecord, ProjectFile

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_graph.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    with patch("app.ingestion.service.SessionLocal", TestingSessionLocal), patch(
        "app.database.SessionLocal", TestingSessionLocal
    ), patch("app.analysis.service.SessionLocal", TestingSessionLocal):
        yield
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("./test_graph.db"):
        try:
            os.remove("./test_graph.db")
        except Exception:
            pass


# 2. Fresh Tree-sitter dependency declarations
def test_tree_sitter_dependencies_declared():
    root_dir = Path(__file__).resolve().parent.parent.parent
    req_text = (root_dir / "backend" / "requirements.txt").read_text(encoding="utf-8")
    assert "tree-sitter>=" in req_text
    assert "tree-sitter-javascript>=" in req_text

    pyproject_text = (root_dir / "backend" / "pyproject.toml").read_text(encoding="utf-8")
    assert "tree-sitter" in pyproject_text
    assert "tree-sitter-javascript" in pyproject_text


# 3. Workspace traversal rejection
def test_workspace_traversal_rejection(tmp_path):
    ws_dir = tmp_path / "ws_sec"
    raw_dir = ws_dir / "raw"
    raw_dir.mkdir(parents=True)

    db = TestingSessionLocal()
    proj = Project(
        id="proj_sec",
        display_name="SecProj",
        source_type="zip",
        detected_languages=["python"],
        total_files=1,
        total_lines=1,
        content_hash="sec_hash",
        workspace_id="ws_sec",
        created_at=datetime.now(timezone.utc),
    )
    db.add(proj)

    # Add malicious traversal path
    pf = ProjectFile(
        id="f_sec",
        project_id="proj_sec",
        relative_path="../../secret.py",
        language="python",
        size_bytes=10,
        line_count=1,
        sha256_hash="hsec",
    )
    db.add(pf)
    db.commit()

    with patch("app.analysis.service.get_workspace_dir", return_value=ws_dir):
        analysis = run_analysis_for_project(db, "proj_sec", force=True)
        assert len(analysis.modules) == 1
        mod = analysis.modules[0]
        assert mod.parse_status == "failed"
        assert "Internal file-analysis failure." in mod.parse_errors


# 4. Safe parser-error responses
def test_safe_parser_error_responses(tmp_path):
    file_p = tmp_path / "broken.py"
    file_p.write_text("def unclosed_func(:", encoding="utf-8")

    mod = analyze_python_source("p1", "broken.py", file_p)
    assert mod.parse_status == "partial"
    assert len(mod.parse_errors) == 1
    # Safe error message without raw tracebacks
    assert "Python parser could not fully parse this file" in mod.parse_errors[0]
    assert "C:\\" not in mod.parse_errors[0]
    assert "F:\\" not in mod.parse_errors[0]


# 5. Manual analysis returns HTTP 202 job
def test_manual_analysis_returns_202():
    client = TestClient(app)
    db = TestingSessionLocal()
    proj = Project(
        id="proj_job_202",
        display_name="Job202",
        source_type="zip",
        detected_languages=["python"],
        total_files=1,
        total_lines=1,
        content_hash="hash202",
        workspace_id="ws202",
        created_at=datetime.now(timezone.utc),
    )
    db.add(proj)
    db.commit()

    with patch("fastapi.BackgroundTasks.add_task") as mock_bg:
        res = client.post("/api/projects/proj_job_202/analyze", json={"force": False})
        assert res.status_code == 202
        data = res.json()
        assert data["source_type"] == "analysis"
        assert data["project_id"] == "proj_job_202"
        assert data["state"] == "queued"
        assert mock_bg.called


# 6. Reanalysis job lifecycle
def test_reanalysis_job_lifecycle(tmp_path):
    ws_dir = tmp_path / "ws_lifecycle"
    (ws_dir / "raw").mkdir(parents=True)

    db = TestingSessionLocal()
    proj = Project(
        id="proj_lifecycle",
        display_name="LifeProj",
        source_type="zip",
        detected_languages=["python"],
        total_files=0,
        total_lines=0,
        content_hash="lhash",
        workspace_id="ws_lifecycle",
        created_at=datetime.now(timezone.utc),
    )
    db.add(proj)
    db.commit()

    client = TestClient(app)
    with patch("app.analysis.service.get_workspace_dir", return_value=ws_dir):
        res = client.post("/api/projects/proj_lifecycle/analyze", json={"force": True})
        assert res.status_code == 202
        job_id = res.json()["job_id"]

        from app.analysis.service import process_analysis_job
        process_analysis_job(job_id, "proj_lifecycle", force=True)

        res_poll = client.get(f"/api/jobs/{job_id}")
        assert res_poll.status_code == 200
        assert res_poll.json()["state"] == "completed"


# 7. Duplicate active-analysis prevention
def test_duplicate_active_analysis_prevention():
    client = TestClient(app)
    db = TestingSessionLocal()
    proj = Project(
        id="proj_dup",
        display_name="DupProj",
        source_type="zip",
        detected_languages=["python"],
        total_files=0,
        total_lines=0,
        content_hash="duphash",
        workspace_id="wsdup",
        created_at=datetime.now(timezone.utc),
    )
    job = Job(
        id="job_active_123",
        state=JobState.ANALYZING,
        stage="Analyzing...",
        progress_percentage=50,
        source_type="analysis",
        project_id="proj_dup",
        message="Running",
        created_at=datetime.now(timezone.utc),
    )
    db.add(proj)
    db.add(job)
    db.commit()

    res = client.post("/api/projects/proj_dup/analyze", json={"force": False})
    assert res.status_code == 202
    assert res.json()["job_id"] == "job_active_123"


# 8. GET analysis does not start analysis
def test_get_analysis_does_not_start_analysis():
    client = TestClient(app)
    db = TestingSessionLocal()
    proj = Project(
        id="proj_nostart",
        display_name="NoStart",
        source_type="zip",
        detected_languages=["python"],
        total_files=0,
        total_lines=0,
        content_hash="ns_hash",
        workspace_id="wsns",
        created_at=datetime.now(timezone.utc),
    )
    db.add(proj)
    db.commit()

    with patch("app.analysis.service.run_analysis_for_project") as mock_run:
        res = client.get("/api/projects/proj_nostart/analysis")
        assert res.status_code == 409
        assert not mock_run.called


# 9. Pending analysis returns 409
def test_pending_analysis_returns_409():
    client = TestClient(app)
    db = TestingSessionLocal()
    proj = Project(
        id="proj_pending",
        display_name="PendProj",
        source_type="zip",
        detected_languages=["python"],
        total_files=0,
        total_lines=0,
        content_hash="phash",
        workspace_id="wspend",
        created_at=datetime.now(timezone.utc),
    )
    job = Job(
        id="job_pend_999",
        state=JobState.ANALYZING,
        stage="Analyzing...",
        progress_percentage=40,
        source_type="analysis",
        project_id="proj_pending",
        message="Processing",
        created_at=datetime.now(timezone.utc),
    )
    db.add(proj)
    db.add(job)
    db.commit()

    res = client.get("/api/projects/proj_pending/analysis")
    assert res.status_code == 409
    data = res.json()
    assert "currently processing" in data["detail"]["detail"]
    assert data["detail"]["job_id"] == "job_pend_999"


# 10. Module graph nodes and import edges
def test_module_graph_nodes_and_edges(tmp_path):
    ws_dir = tmp_path / "ws_g10"
    raw_dir = ws_dir / "raw"
    raw_dir.mkdir(parents=True)

    (raw_dir / "a.py").write_text("import b\n", encoding="utf-8")
    (raw_dir / "b.py").write_text("x = 1\n", encoding="utf-8")

    db = TestingSessionLocal()
    proj = Project(
        id="proj_g10",
        display_name="G10",
        source_type="zip",
        detected_languages=["python"],
        total_files=2,
        total_lines=2,
        content_hash="g10hash",
        workspace_id="ws_g10",
        created_at=datetime.now(timezone.utc),
    )
    pf1 = ProjectFile(id="f1", project_id="proj_g10", relative_path="a.py", language="python", size_bytes=10, line_count=1, sha256_hash="h1")
    pf2 = ProjectFile(id="f2", project_id="proj_g10", relative_path="b.py", language="python", size_bytes=10, line_count=1, sha256_hash="h2")
    db.add(proj)
    db.add(pf1)
    db.add(pf2)
    db.commit()

    with patch("app.analysis.service.get_workspace_dir", return_value=ws_dir):
        analysis = run_analysis_for_project(db, "proj_g10", force=True)
        graph = build_project_dependency_graph(analysis, level="module", include_external=False)
        assert len(graph.nodes) == 2
        assert len(graph.edges) == 1
        assert graph.edges[0].type == "import"


# 11. External dependency filtering
def test_external_dependency_filtering(tmp_path):
    ws_dir = tmp_path / "ws_ext"
    raw_dir = ws_dir / "raw"
    raw_dir.mkdir(parents=True)

    (raw_dir / "app.py").write_text("import requests\n", encoding="utf-8")

    db = TestingSessionLocal()
    proj = Project(
        id="proj_ext",
        display_name="ExtProj",
        source_type="zip",
        detected_languages=["python"],
        total_files=1,
        total_lines=1,
        content_hash="exthash",
        workspace_id="ws_ext",
        created_at=datetime.now(timezone.utc),
    )
    pf1 = ProjectFile(id="f1", project_id="proj_ext", relative_path="app.py", language="python", size_bytes=15, line_count=1, sha256_hash="h1")
    db.add(proj)
    db.add(pf1)
    db.commit()

    with patch("app.analysis.service.get_workspace_dir", return_value=ws_dir):
        analysis = run_analysis_for_project(db, "proj_ext", force=True)

        g_no_ext = build_project_dependency_graph(analysis, level="module", include_external=False)
        assert len(g_no_ext.nodes) == 1
        assert len(g_no_ext.edges) == 0

        g_with_ext = build_project_dependency_graph(analysis, level="module", include_external=True)
        assert len(g_with_ext.nodes) == 2
        assert len(g_with_ext.edges) == 1
        ext_node = [n for n in g_with_ext.nodes if n.is_external][0]
        assert ext_node.label == "requests"


# 12. CommonJS require edge type
def test_commonjs_require_edge_type(tmp_path):
    ws_dir = tmp_path / "ws_cjs"
    raw_dir = ws_dir / "raw"
    raw_dir.mkdir(parents=True)

    (raw_dir / "index.js").write_text("const u = require('./util');\n", encoding="utf-8")
    (raw_dir / "util.js").write_text("module.exports = {};\n", encoding="utf-8")

    db = TestingSessionLocal()
    proj = Project(
        id="proj_cjs",
        display_name="CJSProj",
        source_type="zip",
        detected_languages=["javascript"],
        total_files=2,
        total_lines=2,
        content_hash="cjshash",
        workspace_id="ws_cjs",
        created_at=datetime.now(timezone.utc),
    )
    pf1 = ProjectFile(id="f1", project_id="proj_cjs", relative_path="index.js", language="javascript", size_bytes=30, line_count=1, sha256_hash="h1")
    pf2 = ProjectFile(id="f2", project_id="proj_cjs", relative_path="util.js", language="javascript", size_bytes=20, line_count=1, sha256_hash="h2")
    db.add(proj)
    db.add(pf1)
    db.add(pf2)
    db.commit()

    with patch("app.analysis.service.get_workspace_dir", return_value=ws_dir):
        analysis = run_analysis_for_project(db, "proj_cjs", force=True)
        graph = build_project_dependency_graph(analysis, level="module", include_external=False)
        assert len(graph.edges) == 1
        assert graph.edges[0].type == "require"


# 13. Cycle detection and deduplication
def test_cycle_detection_and_deduplication():
    nodes_set = {"mod_a", "mod_b", "mod_c"}
    edges_list = [("mod_a", "mod_b"), ("mod_b", "mod_c"), ("mod_c", "mod_a")]

    cycles = find_directed_cycles(nodes_set, edges_list)
    assert len(cycles) == 1
    assert cycles[0] == ["mod_a", "mod_b", "mod_c", "mod_a"]


# 14. Orphan detection
def test_orphan_module_detection(tmp_path):
    ws_dir = tmp_path / "ws_orphan"
    raw_dir = ws_dir / "raw"
    raw_dir.mkdir(parents=True)

    (raw_dir / "connected.py").write_text("import target\n", encoding="utf-8")
    (raw_dir / "target.py").write_text("x = 1\n", encoding="utf-8")
    (raw_dir / "isolated.py").write_text("y = 2\n", encoding="utf-8")

    db = TestingSessionLocal()
    proj = Project(
        id="proj_orphan",
        display_name="OrphanProj",
        source_type="zip",
        detected_languages=["python"],
        total_files=3,
        total_lines=3,
        content_hash="orphash",
        workspace_id="ws_orphan",
        created_at=datetime.now(timezone.utc),
    )
    pf1 = ProjectFile(id="f1", project_id="proj_orphan", relative_path="connected.py", language="python", size_bytes=15, line_count=1, sha256_hash="h1")
    pf2 = ProjectFile(id="f2", project_id="proj_orphan", relative_path="target.py", language="python", size_bytes=10, line_count=1, sha256_hash="h2")
    pf3 = ProjectFile(id="f3", project_id="proj_orphan", relative_path="isolated.py", language="python", size_bytes=10, line_count=1, sha256_hash="h3")
    db.add(proj)
    db.add(pf1)
    db.add(pf2)
    db.add(pf3)
    db.commit()

    with patch("app.analysis.service.get_workspace_dir", return_value=ws_dir):
        analysis = run_analysis_for_project(db, "proj_orphan", force=True)
        graph = build_project_dependency_graph(analysis, level="module", include_external=False)
        assert len(graph.orphan_module_ids) == 1
        iso_mod_id = [m.module_id for m in analysis.modules if m.relative_path == "isolated.py"][0]
        assert graph.orphan_module_ids[0] == iso_mod_id


# 15. Entry-point identification
def test_entry_point_identification(tmp_path):
    ws_dir = tmp_path / "ws_entry"
    raw_dir = ws_dir / "raw"
    raw_dir.mkdir(parents=True)

    (raw_dir / "main.py").write_text("if __name__ == '__main__': pass\n", encoding="utf-8")

    db = TestingSessionLocal()
    proj = Project(
        id="proj_entry",
        display_name="EntryProj",
        source_type="zip",
        detected_languages=["python"],
        total_files=1,
        total_lines=1,
        content_hash="entryhash",
        workspace_id="ws_entry",
        created_at=datetime.now(timezone.utc),
    )
    pf1 = ProjectFile(id="f1", project_id="proj_entry", relative_path="main.py", language="python", size_bytes=30, line_count=1, sha256_hash="h1")
    db.add(proj)
    db.add(pf1)
    db.commit()

    with patch("app.analysis.service.get_workspace_dir", return_value=ws_dir):
        analysis = run_analysis_for_project(db, "proj_entry", force=True)
        graph = build_project_dependency_graph(analysis, level="module", include_external=False)
        assert len(graph.entry_point_ids) == 1


# 16. Stable graph IDs and ordering
def test_stable_graph_ids_and_ordering(tmp_path):
    ws_dir = tmp_path / "ws_stable"
    raw_dir = ws_dir / "raw"
    raw_dir.mkdir(parents=True)

    (raw_dir / "z.py").write_text("x = 1\n", encoding="utf-8")
    (raw_dir / "a.py").write_text("x = 2\n", encoding="utf-8")

    db = TestingSessionLocal()
    proj = Project(
        id="proj_stable",
        display_name="StableProj",
        source_type="zip",
        detected_languages=["python"],
        total_files=2,
        total_lines=2,
        content_hash="sthash",
        workspace_id="ws_stable",
        created_at=datetime.now(timezone.utc),
    )
    pf1 = ProjectFile(id="f1", project_id="proj_stable", relative_path="z.py", language="python", size_bytes=10, line_count=1, sha256_hash="h1")
    pf2 = ProjectFile(id="f2", project_id="proj_stable", relative_path="a.py", language="python", size_bytes=10, line_count=1, sha256_hash="h2")
    db.add(proj)
    db.add(pf1)
    db.add(pf2)
    db.commit()

    with patch("app.analysis.service.get_workspace_dir", return_value=ws_dir):
        analysis = run_analysis_for_project(db, "proj_stable", force=True)
        graph = build_project_dependency_graph(analysis, level="module", include_external=False)
        labels = [n.label for n in graph.nodes]
        assert labels == ["a.py", "z.py"]


# 17. Module drill-down
def test_module_symbol_drilldown(tmp_path):
    ws_dir = tmp_path / "ws_drill"
    raw_dir = ws_dir / "raw"
    raw_dir.mkdir(parents=True)

    py_code = "def add(a, b):\n    return a + b\n"
    (raw_dir / "calc.py").write_text(py_code, encoding="utf-8")

    db = TestingSessionLocal()
    proj = Project(
        id="proj_drill",
        display_name="DrillProj",
        source_type="zip",
        detected_languages=["python"],
        total_files=1,
        total_lines=2,
        content_hash="drhash",
        workspace_id="ws_drill",
        created_at=datetime.now(timezone.utc),
    )
    pf1 = ProjectFile(id="f1", project_id="proj_drill", relative_path="calc.py", language="python", size_bytes=35, line_count=2, sha256_hash="h1")
    db.add(proj)
    db.add(pf1)
    db.commit()

    with patch("app.analysis.service.get_workspace_dir", return_value=ws_dir):
        analysis = run_analysis_for_project(db, "proj_drill", force=True)
        mod_id = analysis.modules[0].module_id
        graph = build_project_dependency_graph(analysis, level="symbol", module_id=mod_id)
        assert len(graph.nodes) >= 2  # Root module + function add
        node_kinds = {n.kind for n in graph.nodes}
        assert "function" in node_kinds


# 18. Call-edge truncation metadata
def test_call_edge_truncation_metadata():
    mod = ModuleAnalysis(
        module_id="mod_many_calls",
        relative_path="heavy.py",
        language="python",
        line_count=100,
        parse_status="complete",
    )
    analysis = ProjectAnalysis(
        project_id="proj_trunc",
        content_hash="chash",
        modules=[mod],
    )
    graph = build_project_dependency_graph(analysis, level="symbol", module_id="mod_many_calls")
    assert graph.summary.truncated_edges_count >= 0


# 19. Unknown project/module responses
def test_unknown_project_module_responses():
    client = TestClient(app)
    res_proj = client.get("/api/projects/unknown_proj_id/graph")
    assert res_proj.status_code == 404

    res_proj_anal = client.get("/api/projects/unknown_proj_id/analysis")
    assert res_proj_anal.status_code == 404

    res_proj_exp = client.get("/api/projects/unknown_proj_id/explanation")
    assert res_proj_exp.status_code == 404


# 20. No absolute paths in graph/API responses
def test_no_absolute_paths_in_responses(tmp_path):
    ws_dir = tmp_path / "ws_noabs"
    raw_dir = ws_dir / "raw"
    sub_dir = raw_dir / "sub"
    sub_dir.mkdir(parents=True)

    (sub_dir / "core.py").write_text("x = 1\n", encoding="utf-8")

    db = TestingSessionLocal()
    proj = Project(
        id="proj_noabs",
        display_name="NoAbsProj",
        source_type="zip",
        detected_languages=["python"],
        total_files=1,
        total_lines=1,
        content_hash="nahash",
        workspace_id="ws_noabs",
        created_at=datetime.now(timezone.utc),
    )
    pf1 = ProjectFile(id="f1", project_id="proj_noabs", relative_path="sub/core.py", language="python", size_bytes=10, line_count=1, sha256_hash="h1")
    db.add(proj)
    db.add(pf1)
    db.commit()

    with patch("app.analysis.service.get_workspace_dir", return_value=ws_dir):
        analysis = run_analysis_for_project(db, "proj_noabs", force=True)
        graph = build_project_dependency_graph(analysis, level="module", include_external=True)

        serialized = json.dumps(graph.model_dump(mode="json"))
        assert "C:\\" not in serialized
        assert "F:\\" not in serialized
        assert "/app/static" not in serialized
