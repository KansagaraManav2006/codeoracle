import os
import re
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from app.config import settings
from app.testgen.coverage import parse_pytest_coverage_json
from app.testgen.models import GeneratedTestFile


def _sanitize_output(text: str, workspace_path: Optional[Path] = None) -> str:
    """Sanitizes absolute server paths and sensitive variables from output."""
    if not text:
        return ""
    
    # Remove workspace absolute paths
    if workspace_path:
        text = text.replace(str(workspace_path), "[WORKSPACE]")
        text = text.replace(str(workspace_path.resolve()), "[WORKSPACE]")

    # Remove drive letters / windows absolute paths
    text = re.sub(r"[A-Za-z]:\\[^\s:\"']+", "[REDACTED_PATH]", text)
    text = re.sub(r"/[^\s:\"']+/workspaces/[^\s:\"']+", "[REDACTED_PATH]", text)

    # Truncate output
    max_bytes = getattr(settings, "TEST_EXECUTION_MAX_OUTPUT_BYTES", 50000)
    if len(text) > max_bytes:
        text = text[:max_bytes] + "\n... [OUTPUT TRUNCATED]"

    return text


def execute_generated_tests_safely(
    raw_workspace_dir: Path,
    test_files: List[GeneratedTestFile],
    is_trusted: bool = False,
) -> Tuple[List[GeneratedTestFile], Optional[float], Dict[str, Optional[float]], str]:
    """Executes generated test files in a dedicated temporary subprocess workspace.
    
    Returns:
        (updated_test_files, overall_line_coverage, per_file_coverage, execution_warning)
    """
    execution_enabled = getattr(settings, "TEST_EXECUTION_ENABLED", False)
    allow_untrusted = getattr(settings, "TEST_EXECUTION_ALLOW_UNTRUSTED", False)

    if not execution_enabled and not is_trusted:
        return test_files, None, {}, "Test execution disabled by server policy."

    if not is_trusted and not allow_untrusted:
        for tf in test_files:
            tf.execution_status = "unavailable"
            tf.execution_output = "Execution disabled for untrusted repositories."
        return test_files, None, {}, "Subprocess isolation reduces risk but untrusted execution is disabled by default."

    # Create temporary execution workspace
    exec_ws_dir = raw_workspace_dir.parent / "test_exec_workspace"
    if exec_ws_dir.exists():
        try:
            shutil.rmtree(exec_ws_dir)
        except Exception:
            pass

    try:
        shutil.copytree(raw_workspace_dir, exec_ws_dir)
    except Exception:
        for tf in test_files:
            tf.execution_status = "failed"
            tf.execution_output = "Failed to prepare isolated test workspace."
        return test_files, None, {}, "Workspace preparation failed."

    try:
        # Write test files into exec_ws_dir/tests/
        tests_dir = exec_ws_dir / "tests"
        tests_dir.mkdir(parents=True, exist_ok=True)
        (tests_dir / "__init__.py").write_text("", encoding="utf-8")

        python_test_files = [tf for tf in test_files if tf.language == "python" and tf.syntax_valid]
        js_test_files = [tf for tf in test_files if tf.language == "javascript" and tf.syntax_valid]

        # Prepare clean environment (strip secrets)
        clean_env = os.environ.copy()
        for secret_key in ("OPENAI_API_KEY", "DATABASE_URL", "SECRET_KEY", "HTTP_PROXY", "HTTPS_PROXY"):
            clean_env.pop(secret_key, None)
        clean_env["PYTHONDONTWRITEBYTECODE"] = "1"
        clean_env["PYTHONPATH"] = str(exec_ws_dir)

        timeout_sec = getattr(settings, "TEST_EXECUTION_TIMEOUT_SECONDS", 15)

        # 1. Execute Python tests via pytest
        if python_test_files:
            for tf in python_test_files:
                target_path = exec_ws_dir / tf.safe_test_path
                target_path.parent.mkdir(parents=True, exist_ok=True)
                target_path.write_text(tf.code, encoding="utf-8")

            coverage_file = exec_ws_dir / "coverage.json"
            cmd = [
                sys.executable,
                "-m",
                "pytest",
                "--cov=.",
                f"--cov-report=json:{coverage_file}",
                "-q",
                f"--junitxml={exec_ws_dir / 'test-results.xml'}",
                "tests",
            ]

            try:
                result = subprocess.run(
                    cmd,
                    cwd=exec_ws_dir,
                    env=clean_env,
                    capture_output=True,
                    text=True,
                    timeout=timeout_sec,
                )
                output = _sanitize_output(result.stdout + "\n" + result.stderr, exec_ws_dir)
                # A single pytest return code describes the whole suite. Use
                # junit XML to account for each generated file independently,
                # so one failing file cannot make every file look failed (or
                # make every file look passed when the suite is partitioned).
                file_outcomes: Dict[str, bool] = {}
                junit_path = exec_ws_dir / "test-results.xml"
                try:
                    root = ET.parse(junit_path).getroot()
                    for case in root.iter("testcase"):
                        case_file = (case.attrib.get("file") or "").replace("\\", "/")
                        if not case_file:
                            classname = case.attrib.get("classname", "").replace(".", "/")
                            case_file = f"{classname}.py" if classname else ""
                        case_file = case_file.split("/tests/", 1)[-1]
                        if case_file and not case_file.startswith("tests/"):
                            case_file = f"tests/{case_file}"
                        failed = case.find("failure") is not None or case.find("error") is not None
                        file_outcomes[case_file] = file_outcomes.get(case_file, False) or failed
                except (OSError, ET.ParseError):
                    file_outcomes = {}

                for tf in python_test_files:
                    outcome = file_outcomes.get(tf.safe_test_path.replace("\\", "/"))
                    if outcome is None:
                        # Collection/runtime failures may not emit test cases;
                        # retain the conservative whole-suite result.
                        tf.execution_status = "passed" if result.returncode == 0 else "failed"
                    else:
                        tf.execution_status = "failed" if outcome else "passed"
                    tf.execution_output = output

            except subprocess.TimeoutExpired:
                for tf in python_test_files:
                    tf.execution_status = "timed_out"
                    tf.execution_output = f"Test execution timed out after {timeout_sec} seconds."
            except Exception:
                for tf in python_test_files:
                    tf.execution_status = "failed"
                    tf.execution_output = "Test execution failed unexpectedly."

            # Parse coverage
            target_rel_files = [tf.target_relative_path for tf in test_files]
            overall_cov, per_file_cov, covered_lines_map, uncovered_lines_map = parse_pytest_coverage_json(
                coverage_file, target_rel_files
            )

            for tf in python_test_files:
                if tf.target_relative_path in per_file_cov:
                    tf.line_coverage = per_file_cov[tf.target_relative_path]
                    tf.covered_lines = covered_lines_map.get(tf.target_relative_path, [])
                    tf.uncovered_lines = uncovered_lines_map.get(tf.target_relative_path, [])

        # 2. JavaScript test execution fallback status check
        if js_test_files:
            for tf in js_test_files:
                # Unless local Vitest is installed, mark JS execution as unavailable or not run
                tf.execution_status = "unavailable"
                tf.execution_output = "Vitest execution unavailable in minimal environment. Syntax validation passed."

        # Aggregate overall coverage
        target_files = [tf.target_relative_path for tf in test_files]
        overall_cov, per_file_cov, _, _ = parse_pytest_coverage_json(
            exec_ws_dir / "coverage.json", target_files
        )

        warning_msg = "Subprocess isolation reduces risk but is not a complete hostile-code sandbox."
        return test_files, overall_cov, per_file_cov, warning_msg

    finally:
        # Cleanup isolated workspace
        if exec_ws_dir.exists():
            try:
                shutil.rmtree(exec_ws_dir)
            except Exception:
                pass
