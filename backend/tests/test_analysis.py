import io
import os
import shutil
import time
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.analysis.complexity import calculate_python_ast_complexity, get_complexity_rating
from app.analysis.dependency_resolver import resolve_project_dependencies
from app.analysis.javascript_analyzer import analyze_javascript_source
from app.analysis.models import (
    ANALYZER_VERSION,
    ImportInfo,
    ProjectAnalysis,
    generate_edge_id,
    generate_module_id,
    generate_symbol_id,
)
from app.analysis.python_analyzer import analyze_python_source, fallback_python_tokenize_analysis
from app.analysis.service import run_analysis_for_project
from app.config import settings
from app.database import Base, get_db
from app.main import app
from app.models.db import Job, JobState, Project, ProjectAnalysisRecord, ProjectFile

# Test Database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_analysis.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


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
    if os.path.exists("./test_analysis.db"):
        try:
            os.remove("./test_analysis.db")
        except Exception:
            pass
    if os.path.exists("./test_analysis.db"):
        try:
            os.remove("./test_analysis.db")
        except Exception:
            pass


client = TestClient(app)


# --- 1. Python AST Analyzer Tests ---
def test_01_python_ast_extraction(tmp_path):
    py_code = '''"""Module docstring."""
import os
from math import sqrt as square_root

@decorator_one
async def compute_val(x: int, y: int = 10, *args, **kwargs) -> float:
    """Function docstring."""
    if x > 0 and y > 0:
        return sqrt(x)
    return 0.0

class Calculator:
    def add(self, a, b):
        return a + b
'''
    file_p = tmp_path / "app.py"
    file_p.write_text(py_code, encoding="utf-8")

    mod = analyze_python_source("proj_test", "app.py", file_p)

    assert mod.parse_status == "complete"
    assert len(mod.imports) == 2
    assert len(mod.functions) == 1
    assert mod.functions[0].name == "compute_val"
    assert mod.functions[0].is_async is True
    assert mod.functions[0].return_annotation == "float"
    assert len(mod.classes) == 1
    assert mod.classes[0].name == "Calculator"


# --- 2. Python Entry Point Detection ---
def test_02_python_entry_point(tmp_path):
    py_code = 'if __name__ == "__main__":\n    print("start")\n'
    file_p = tmp_path / "main.py"
    file_p.write_text(py_code, encoding="utf-8")

    mod = analyze_python_source("proj_test", "main.py", file_p)
    assert mod.is_entry_point is True


# --- 3. Python Cyclomatic Complexity ---
def test_03_python_complexity(tmp_path):
    py_code = """
def complex_fn(a, b, c):
    if a > 0:
        if b > 0 and c > 0:
            for i in range(10):
                while a < 100:
                    a += 1
    try:
        pass
    except ValueError:
        pass
"""
    file_p = tmp_path / "comp.py"
    file_p.write_text(py_code, encoding="utf-8")

    mod = analyze_python_source("proj_test", "comp.py", file_p)
    assert mod.functions[0].complexity > 5


# --- 4. Python Legacy & Risk Warnings ---
def test_04_python_legacy_warnings(tmp_path):
    py_code = """import imp

def bad_func(x=[]):
    try:
        eval("1 + 1")
    except:
        pass
"""
    file_p = tmp_path / "legacy.py"
    file_p.write_text(py_code, encoding="utf-8")

    mod = analyze_python_source("proj_test", "legacy.py", file_p)
    codes = [w.code for w in mod.legacy_warnings]
    assert "DEPRECATED_MODULE" in codes
    assert "MUTABLE_DEFAULT_ARG" in codes
    assert "EVAL_EXEC_USAGE" in codes
    assert "BARE_EXCEPT" in codes


# --- 5. Python Tokenizer Fallback on SyntaxError ---
def test_05_python_syntax_error_fallback(tmp_path):
    py_code = 'print "Python 2 print statement"\nclass OldClass:\n    def old_fn(): pass\n'
    file_p = tmp_path / "py2.py"
    file_p.write_text(py_code, encoding="utf-8")

    mod = analyze_python_source("proj_test", "py2.py", file_p)
    assert mod.parse_status == "partial"
    assert len(mod.classes) == 1
    assert mod.classes[0].name == "OldClass"
    codes = [w.code for w in mod.legacy_warnings]
    assert "SYNTAX_ERROR" in codes


# --- 6. JavaScript Tree-Sitter Analyzer Tests ---
def test_06_javascript_analysis(tmp_path):
    js_code = """import { render } from './view';
const express = require('express');

export const title = 'App';

export default class Server {
  constructor(port) {
    this.port = port;
  }
  async listen() {
    if (this.port == 8080) {
      eval('console.log(1)');
    }
  }
}
"""
    file_p = tmp_path / "server.js"
    file_p.write_text(js_code, encoding="utf-8")

    mod = analyze_javascript_source("proj_test", "server.js", file_p)

    assert mod.parse_status == "complete"
    assert len(mod.imports) == 2
    assert len(mod.classes) == 1
    assert mod.classes[0].name == "Server"
    assert mod.is_entry_point is True
    codes = [w.code for w in mod.legacy_warnings]
    assert "LOOSE_EQUALITY" in codes
    assert "EVAL_EXEC_USAGE" in codes


# --- 7. JavaScript Var and Callback Warnings ---
def test_07_js_legacy_warnings(tmp_path):
    js_code = "var legacy = 10;\nfunction fetchData(cb) { cb(); }\n"
    file_p = tmp_path / "old.js"
    file_p.write_text(js_code, encoding="utf-8")

    mod = analyze_javascript_source("proj_test", "old.js", file_p)
    codes = [w.code for w in mod.legacy_warnings]
    assert "VAR_USAGE" in codes
    assert "CALLBACK_HEAVY" in codes


# --- 8. JSX File Handling ---
def test_08_jsx_handling(tmp_path):
    jsx_code = "import React from 'react';\nexport const Button = () => <button>Click</button>;\n"
    file_p = tmp_path / "Button.jsx"
    file_p.write_text(jsx_code, encoding="utf-8")

    mod = analyze_javascript_source("proj_test", "Button.jsx", file_p)
    assert mod.parse_status == "complete"
    assert len(mod.exports) >= 1


# --- 9. Dependency Resolution ---
def test_09_dependency_resolution(tmp_path):
    file_main = tmp_path / "main.py"
    file_utils = tmp_path / "utils.py"
    file_main.write_text("import app.utils\nimport requests\n", encoding="utf-8")
    file_utils.write_text("def calc(): pass\n", encoding="utf-8")

    mod_a = analyze_python_source("p1", "app/main.py", file_main)
    mod_b = analyze_python_source("p1", "app/utils.py", file_utils)

    edges = resolve_project_dependencies([mod_a, mod_b])
    assert len(edges) == 2
    local_edge = [e for e in edges if e.target_module_id == mod_b.module_id][0]
    assert local_edge.resolved is True

    ext_edge = [e for e in edges if e.target_module_id == "requests"][0]
    assert ext_edge.resolved is False

    target_ids = {e.target_module_id for e in edges}
    assert target_ids == {mod_b.module_id, "requests"}


# --- 10. Stable ID Determinism ---
def test_10_stable_id_determinism():
    mod_id1 = generate_module_id("proj1", "src/utils/helpers.py")
    mod_id2 = generate_module_id("proj1", "src/utils/helpers.py")
    assert mod_id1 == mod_id2

    sym_id1 = generate_symbol_id(mod_id1, "function", "add", 10)
    sym_id2 = generate_symbol_id(mod_id1, "function", "add", 10)
    assert sym_id1 == sym_id2

    edge_id1 = generate_edge_id(mod_id1, "mod_target", "import", 5)
    edge_id2 = generate_edge_id(mod_id1, "mod_target", "import", 5)
    assert edge_id1 == edge_id2


# --- 11. End-to-End Project Analysis & Caching ---
def test_11_project_analysis_caching(tmp_path):
    ws_dir = tmp_path / "ws_test"
    raw_dir = ws_dir / "raw"
    raw_dir.mkdir(parents=True)

    (raw_dir / "app.py").write_text("def run(): pass\n", encoding="utf-8")
    (raw_dir / "server.js").write_text("console.log('hi');\n", encoding="utf-8")

    db = TestingSessionLocal()
    proj = Project(
        id="proj_cache_test",
        display_name="CacheTest",
        source_type="zip",
        detected_languages=["python", "javascript"],
        total_files=2,
        total_lines=2,
        content_hash="content_hash_12345",
        workspace_id="ws_test",
        created_at=datetime.now(timezone.utc),
    )
    pf1 = ProjectFile(id="f1", project_id="proj_cache_test", relative_path="app.py", language="python", size_bytes=20, line_count=1, sha256_hash="h1")
    pf2 = ProjectFile(id="f2", project_id="proj_cache_test", relative_path="server.js", language="javascript", size_bytes=20, line_count=1, sha256_hash="h2")

    db.add(proj)
    db.add(pf1)
    db.add(pf2)
    db.commit()

    with patch("app.analysis.service.get_workspace_dir", return_value=ws_dir):
        res1 = run_analysis_for_project(db, "proj_cache_test", force=False)
        assert res1.cache_status == "miss"
        assert res1.total_files == 2

        res2 = run_analysis_for_project(db, "proj_cache_test", force=False)
        assert res2.cache_status == "hit"

        res3 = run_analysis_for_project(db, "proj_cache_test", force=True)
        assert res3.cache_status == "forced"

    db.close()


# --- 12. API Endpoints for Analysis & Explanation ---
def test_12_api_analysis_endpoints(tmp_path):
    ws_dir = tmp_path / "ws_api"
    raw_dir = ws_dir / "raw"
    raw_dir.mkdir(parents=True)
    (raw_dir / "main.py").write_text("print('hello')", encoding="utf-8")

    db = TestingSessionLocal()
    proj = Project(
        id="proj_api_123",
        display_name="ApiTest",
        source_type="zip",
        detected_languages=["python"],
        total_files=1,
        total_lines=1,
        content_hash="api_hash_123",
        workspace_id="ws_api",
        created_at=datetime.now(timezone.utc),
    )
    pf = ProjectFile(id="f_api", project_id="proj_api_123", relative_path="main.py", language="python", size_bytes=15, line_count=1, sha256_hash="ha")
    db.add(proj)
    db.add(pf)
    db.commit()
    db.close()

    with patch("app.analysis.service.get_workspace_dir", return_value=ws_dir):
        # Pre-create analysis record for project
        db_run = TestingSessionLocal()
        run_analysis_for_project(db_run, "proj_api_123", force=True)
        db_run.close()

        # GET /api/projects/{id}/analysis
        res_an = client.get("/api/projects/proj_api_123/analysis")
        assert res_an.status_code == 200
        an_json = res_an.json()
        assert an_json["project_id"] == "proj_api_123"
        assert "workspace_id" not in res_an.text
        assert "F:\\" not in res_an.text

        # GET /api/projects/{id}/explanation
        res_exp = client.get("/api/projects/proj_api_123/explanation")
        assert res_exp.status_code == 200
        exp_json = res_exp.json()
        assert "languages_summary" in exp_json

        # POST /api/projects/{id}/analyze (force=True) -> Returns HTTP 202 Accepted
        res_post = client.post("/api/projects/proj_api_123/analyze", json={"force": True})
        assert res_post.status_code == 202
        assert res_post.json()["source_type"] == "analysis"


# --- 13. Synthetic 100,000 Line Performance Benchmark ---
def test_13_synthetic_100k_line_performance_benchmark(tmp_path):
    ws_dir = tmp_path / "ws_bench"
    raw_dir = ws_dir / "raw"
    raw_dir.mkdir(parents=True)

    db = TestingSessionLocal()
    proj = Project(
        id="proj_bench_100k",
        display_name="Bench100k",
        source_type="zip",
        detected_languages=["python", "javascript"],
        total_files=100,
        total_lines=100000,
        content_hash="bench_hash_100k",
        workspace_id="ws_bench",
        created_at=datetime.now(timezone.utc),
    )
    db.add(proj)

    # Generate 50 Python and 50 JavaScript files (1,000 lines each = 100,000 total lines).
    for i in range(50):
        py_path = f"src/py_mod_{i}.py"
        py_lines = [f"val_{j} = {j}\n" for j in range(1000)]
        (raw_dir / f"src/py_mod_{i}.py").parent.mkdir(parents=True, exist_ok=True)
        (raw_dir / py_path).write_text("".join(py_lines), encoding="utf-8")

        db.add(ProjectFile(id=f"f_py_{i}", project_id="proj_bench_100k", relative_path=py_path, language="python", size_bytes=20000, line_count=1000, sha256_hash=f"h_py_{i}"))

        js_path = f"src/js_mod_{i}.js"
        js_lines = [f"const val_{j} = {j};\n" for j in range(1000)]
        (raw_dir / js_path).write_text("".join(js_lines), encoding="utf-8")

        db.add(ProjectFile(id=f"f_js_{i}", project_id="proj_bench_100k", relative_path=js_path, language="javascript", size_bytes=20000, line_count=1000, sha256_hash=f"h_js_{i}"))

    db.commit()

    with patch("app.analysis.service.get_workspace_dir", return_value=ws_dir):
        start_t = time.perf_counter()
        analysis = run_analysis_for_project(db, "proj_bench_100k", force=True)
        elapsed = time.perf_counter() - start_t

        assert analysis.total_files == 100
        assert analysis.total_lines == 100000
        assert elapsed < 30.0

    db.close()
