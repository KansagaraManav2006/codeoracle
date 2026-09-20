import json

from app.analysis.javascript_analyzer import analyze_javascript_source
from app.analysis.models import ProjectAnalysis
from app.analysis.python_analyzer import analyze_python_source
from app.testgen.coverage import parse_pytest_coverage_json
from app.testgen.javascript_generator import generate_javascript_unit_tests
from app.testgen.javascript_generator import _safe_js_test_filename
from app.testgen.python_generator import generate_python_unit_tests
from app.testgen.python_generator import _safe_test_filename
from app.testgen.runner import execute_generated_tests_safely
from app.testgen.validator import validate_javascript_test_code, validate_python_test_code


def _project(module, project_id: str = "proj_test") -> ProjectAnalysis:
    return ProjectAnalysis(
        project_id=project_id,
        content_hash="0" * 64,
        languages=[module.language],
        total_files=1,
        total_lines=module.line_count,
        modules=[module],
    )


def test_python_generator_creates_syntax_valid_pytest(tmp_path) -> None:
    source = tmp_path / "calculator.py"
    source.write_text("def add(a, b):\n    return a + b\n", encoding="utf-8")
    module = analyze_python_source("proj_test", "calculator.py", source)
    generated = generate_python_unit_tests(module, _project(module))
    assert generated.framework == "pytest"
    assert generated.syntax_valid is True
    assert generated.test_count == 5
    assert generated.test_category == "function contract test"
    assert "error-path test" in generated.test_categories
    assert "edge-case test" in generated.test_categories
    assert "import smoke test" in generated.test_categories
    assert generated.covered_symbols == ["add"]
    assert generated.is_import_only is False
    assert "calculator.add(10, 10)" in generated.code


def test_javascript_commonjs_generator_uses_require(tmp_path) -> None:
    source = tmp_path / "math.cjs"
    source.write_text("const fs = require('fs');\nfunction add(a,b){return a+b;}\nmodule.exports={add};\n", encoding="utf-8")
    module = analyze_javascript_source("proj_test", "math.cjs", source)
    generated = generate_javascript_unit_tests(module, _project(module))
    assert generated.framework == "vitest"
    assert generated.syntax_valid is True
    assert "require('../math.cjs')" in generated.code
    assert generated.test_category == "function contract test"
    assert "add" in generated.covered_symbols
    assert generated.is_import_only is False


def test_import_only_classification_for_empty_module(tmp_path) -> None:
    source = tmp_path / "constants.py"
    source.write_text("VERSION = '1.0.0'\nDEBUG = True\n", encoding="utf-8")
    module = analyze_python_source("proj_test", "constants.py", source)
    generated = generate_python_unit_tests(module, _project(module))
    assert generated.is_import_only is True
    assert generated.test_category == "import smoke test"
    assert generated.covered_symbols == []
    assert generated.protection_type == "unprotected"


def test_non_testable_module_filtering(tmp_path) -> None:
    from app.testgen.service import is_non_testable_module

    # 1. Empty __init__.py
    f_init = tmp_path / "__init__.py"
    f_init.write_text("", encoding="utf-8")
    mod_init = analyze_python_source("proj_test", "__init__.py", f_init)
    assert is_non_testable_module(mod_init) is True

    # 2. Barrel index.ts without functions
    f_barrel = tmp_path / "index.ts"
    f_barrel.write_text("export * from './button';\n", encoding="utf-8")
    mod_barrel = analyze_javascript_source("proj_test", "index.ts", f_barrel)
    assert is_non_testable_module(mod_barrel) is True

    # 3. Types file
    f_types = tmp_path / "types.ts"
    f_types.write_text("export interface Config { timeout: number; }\n", encoding="utf-8")
    mod_types = analyze_javascript_source("proj_test", "types.ts", f_types)
    assert is_non_testable_module(mod_types) is True

    # 4. Config file
    f_cfg = tmp_path / "vite.config.ts"
    f_cfg.write_text("export default { plugins: [] };\n", encoding="utf-8")
    mod_cfg = analyze_javascript_source("proj_test", "vite.config.ts", f_cfg)
    assert is_non_testable_module(mod_cfg) is True

    # 5. Real logic module should NOT be filtered
    f_logic = tmp_path / "calculator.py"
    f_logic.write_text("def multiply(a, b): return a * b\n", encoding="utf-8")
    mod_logic = analyze_python_source("proj_test", "calculator.py", f_logic)
    assert is_non_testable_module(mod_logic) is False


def test_generated_filenames_distinguish_paths_and_extensions() -> None:
    python_paths = ["a/item.py", "b/item.py", "a/__init__.py", "b/__init__.py", "A/item.py", "a.b.py", "a_b.py"]
    js_paths = ["a/index.ts", "b/index.ts", "a/index.js", "A/index.ts", "foo.js", "foo.ts", "foo.cjs"]
    for paths, filename in ((python_paths, _safe_test_filename), (js_paths, _safe_js_test_filename)):
        names = [filename(path) for path in paths]
        assert len({name.casefold() for name in names}) == len(paths)
        assert all(name.startswith("tests/") and name.count("/") == 1 for name in names)
        assert names == [filename(path) for path in paths]


def test_python_duplicate_function_names_have_distinct_tests(tmp_path) -> None:
    source = tmp_path / "duplicate.py"
    source.write_text("def same(a):\n    return a\ndef same(a):\n    return a\n", encoding="utf-8")
    module = analyze_python_source("proj_test", "duplicate.py", source)
    generated = generate_python_unit_tests(module, _project(module))
    import ast
    names = [node.name for node in ast.parse(generated.code).body if isinstance(node, ast.FunctionDef)]
    assert len(names) == len(set(names)) == generated.test_count


def test_generated_code_validators_reject_dangerous_calls() -> None:
    assert validate_python_test_code("import os\nos.system('bad')\n")[0] is False
    assert validate_javascript_test_code("const cp = require('child_process');")[0] is False


def test_coverage_parser_reports_only_target_files(tmp_path) -> None:
    report = tmp_path / "coverage.json"
    report.write_text(json.dumps({"files": {
        "calculator.py": {"executed_lines": [1, 2, 3], "missing_lines": [4], "summary": {"num_statements": 4, "covered_lines": 3, "missing_lines": 1}},
        "tests/test_calculator.py": {"executed_lines": [1], "missing_lines": [], "summary": {"num_statements": 1, "covered_lines": 1, "missing_lines": 0}},
    }}), encoding="utf-8")
    overall, per_file, covered, missing = parse_pytest_coverage_json(report, ["calculator.py"])
    assert overall == 75.0
    assert per_file == {"calculator.py": 75.0}
    assert covered["calculator.py"] == [1, 2, 3]
    assert missing["calculator.py"] == [4]


def test_untrusted_project_code_is_not_executed(tmp_path) -> None:
    source = tmp_path / "safe.py"
    source.write_text("def value():\n    return 1\n", encoding="utf-8")
    module = analyze_python_source("proj_test", "safe.py", source)
    generated = generate_python_unit_tests(module, _project(module))
    files, coverage, per_file, warning = execute_generated_tests_safely(tmp_path, [generated], is_trusted=False)
    assert files[0].execution_status in {"not_run", "unavailable"}
    assert coverage is None
    assert per_file == {}
    assert "disabled" in warning.lower()


def test_protection_accounting_does_not_claim_behavioral_coverage_for_import_smoke(tmp_path) -> None:
    import uuid
    from app.testgen.service import run_test_generation_for_project
    from app.models.db import Project, ProjectAnalysisRecord, ProjectTestRecord
    from app.database import SessionLocal

    db = SessionLocal()
    unique_id = f"smoke_{uuid.uuid4().hex[:12]}"
    proj_id = f"proj_{unique_id}"
    ws_id = f"ws_{unique_id}"

    try:
        # Create dummy project
        proj = Project(
            id=proj_id,
            display_name="Smoke Test Proj",
            workspace_id=ws_id,
            source_type="local",
            content_hash="a" * 64,
            is_trusted=False,
        )
        db.add(proj)
        db.commit()

        # In workspace directory, create one module with logic and one import-only/constants file and one barrel index.ts
        ws_dir = tmp_path / "workspaces" / ws_id / "raw"
        ws_dir.mkdir(parents=True, exist_ok=True)

        logic_file = ws_dir / "math_utils.py"
        logic_file.write_text("def add(x, y):\n    return x + y\n", encoding="utf-8")

        const_file = ws_dir / "constants.py"
        const_file.write_text("API_KEY = 'secret'\nTIMEOUT = 30\n", encoding="utf-8")

        barrel_file = ws_dir / "index.ts"
        barrel_file.write_text("export * from './button';\n", encoding="utf-8")

        mod_math = analyze_python_source(proj_id, "math_utils.py", logic_file)
        mod_const = analyze_python_source(proj_id, "constants.py", const_file)
        mod_barrel = analyze_javascript_source(proj_id, "index.ts", barrel_file)

        analysis = ProjectAnalysis(
            project_id=proj_id,
            content_hash="a" * 64,
            languages=["python", "typescript"],
            total_files=3,
            total_lines=10,
            modules=[mod_math, mod_const, mod_barrel],
        )
        db.add(ProjectAnalysisRecord(
            id=f"rec_anal_{proj_id}",
            project_id=proj_id,
            analyzer_version="1.0.0",
            content_hash="a" * 64,
            analysis_data=analysis.model_dump(mode="json"),
        ))
        db.commit()

        # Monkeypatch get_workspace_dir to point to tmp_path / "workspaces" / ws.id
        import app.testgen.service as tgs
        import app.ingestion.service as igs
        orig_get_ws = igs.get_workspace_dir
        igs.get_workspace_dir = lambda wid: tmp_path / "workspaces" / wid
        tgs.get_workspace_dir = lambda wid: tmp_path / "workspaces" / wid

        try:
            result = run_test_generation_for_project(db, proj.id, execute=False, force=True)

            # math_utils.py has real functions, so it should be protected
            assert "math_utils.py" in result.protected_files

            # barrel index.ts should NOT be in test_files at all (filtered)
            gen_target_paths = [tf.target_relative_path for tf in result.test_files]
            assert "index.ts" not in gen_target_paths

            # constants.py has only constants (import smoke), so it must NOT be in protected_files
            assert "constants.py" not in result.protected_files
            assert "constants.py" in result.unprotected_files

            # Categories must have entries
            assert result.category_counts.get("function contract test", 0) > 0
            assert result.is_measured is False  # execute=False and not trusted
        finally:
            igs.get_workspace_dir = orig_get_ws
            tgs.get_workspace_dir = orig_get_ws
            # Clean up db
            db.query(ProjectTestRecord).filter(ProjectTestRecord.project_id == proj.id).delete()
            db.query(ProjectAnalysisRecord).filter(ProjectAnalysisRecord.project_id == proj.id).delete()
            db.query(Project).filter(Project.id == proj.id).delete()
            db.commit()
    finally:
        # Also clean up any lingering proj_smoke_test
        db.query(ProjectTestRecord).filter(ProjectTestRecord.project_id == "proj_smoke_test").delete()
        db.query(ProjectAnalysisRecord).filter(ProjectAnalysisRecord.project_id == "proj_smoke_test").delete()
        db.query(Project).filter(Project.id == "proj_smoke_test").delete()
        db.commit()
        db.close()


