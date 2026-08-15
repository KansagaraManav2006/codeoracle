import json

from app.analysis.javascript_analyzer import analyze_javascript_source
from app.analysis.models import ProjectAnalysis
from app.analysis.python_analyzer import analyze_python_source
from app.testgen.coverage import parse_pytest_coverage_json
from app.testgen.javascript_generator import generate_javascript_unit_tests
from app.testgen.python_generator import generate_python_unit_tests
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
    assert generated.test_count >= 3
    assert "target_module.add(10, 10)" in generated.code


def test_python_generator_handles_github_wrapper_folder(tmp_path) -> None:
    source = tmp_path / "codeoracle-main" / "backend" / "app" / "service.py"
    source.parent.mkdir(parents=True)
    source.write_text("def ready():\n    return True\n", encoding="utf-8")
    module = analyze_python_source("proj_archive", "codeoracle-main/backend/app/service.py", source)

    generated = generate_python_unit_tests(module, _project(module, "proj_archive"))

    assert generated.syntax_valid is True
    assert "import codeoracle-main" not in generated.code
    assert "codeoracle-main/backend/app/service.py" in generated.code
    assert "spec_from_file_location" in generated.code

    test_file = tmp_path / generated.safe_test_path
    namespace = {"__file__": str(test_file)}
    exec(compile(generated.code, str(test_file), "exec"), namespace)
    namespace[f"test_{module.module_id}_import_smoke"]()


def test_javascript_commonjs_generator_uses_require(tmp_path) -> None:
    source = tmp_path / "math.cjs"
    source.write_text("const fs = require('fs');\nfunction add(a,b){return a+b;}\nmodule.exports={add};\n", encoding="utf-8")
    module = analyze_javascript_source("proj_test", "math.cjs", source)
    generated = generate_javascript_unit_tests(module, _project(module))
    assert generated.framework == "vitest"
    assert generated.syntax_valid is True
    assert "require('../math.cjs')" in generated.code


def test_nested_modules_generate_unique_test_paths(tmp_path) -> None:
    source = tmp_path / "pricing.py"
    source.write_text("def total(value):\n    return value\n", encoding="utf-8")
    service_module = analyze_python_source("proj_test", "services/pricing.py", source)
    existing_test_module = analyze_python_source("proj_test", "tests/pricing.py", source)
    service_test = generate_python_unit_tests(service_module, _project(service_module))
    existing_test = generate_python_unit_tests(existing_test_module, _project(existing_test_module))
    assert service_test.safe_test_path == "tests/test_services_pricing.py"
    assert existing_test.safe_test_path == "tests/test_tests_pricing.py"
    assert service_test.safe_test_path != existing_test.safe_test_path


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
