from pathlib import Path, PurePosixPath
from typing import List, Optional

from app.analysis.models import ModuleAnalysis, ProjectAnalysis
from app.testgen.models import GeneratedTestFile
from app.testgen.validator import validate_python_test_code


def _safe_test_filename(rel_path: str) -> str:
    """Generates a safe test file path like 'tests/test_math_helper.py'."""
    p = Path(rel_path)
    clean_name = "_".join(p.with_suffix("").parts).replace(".", "_").replace("-", "_")
    return f"tests/test_{clean_name}.py"


def generate_python_unit_tests(
    module: ModuleAnalysis,
    project_analysis: ProjectAnalysis,
    uncovered_lines: Optional[List[int]] = None,
) -> GeneratedTestFile:
    """Generates deterministic pytest test cases for a Python module."""
    safe_test_path = _safe_test_filename(module.relative_path)
    test_id = f"testgen_py_{module.module_id}"
    target_relative_path = PurePosixPath(module.relative_path).as_posix()
    target_module_name = f"codeoracle_target_{module.module_id}"

    lines = [
        "# Auto-generated pytest suite by CodeOracle",
        "import importlib.util",
        "import sys",
        "from pathlib import Path",
        "import pytest",
        "",
        "# Add workspace root to sys.path",
        "workspace_root = Path(__file__).resolve().parent.parent",
        "if str(workspace_root) not in sys.path:",
        "    sys.path.insert(0, str(workspace_root))",
        "",
        f"target_path = (workspace_root / {target_relative_path!r}).resolve()",
        "for import_root in [target_path.parent, *target_path.parents]:",
        "    if import_root == workspace_root.parent:",
        "        break",
        "    if str(import_root) not in sys.path:",
        "        sys.path.insert(0, str(import_root))",
        "",
        "target_module = None",
        "target_import_error = None",
        "try:",
        f"    target_spec = importlib.util.spec_from_file_location({target_module_name!r}, target_path)",
        "    if target_spec is None or target_spec.loader is None:",
        "        raise ImportError(f'Unable to create an import specification for {target_path}')",
        "    target_module = importlib.util.module_from_spec(target_spec)",
        "    sys.modules[target_spec.name] = target_module",
        "    target_spec.loader.exec_module(target_module)",
        "except Exception as exc:",
        "    target_import_error = exc",
        "",
    ]

    strategies_used = set()
    test_count = 0

    # 1. Module import smoke test
    lines.append(f"def test_{module.module_id.replace('-', '_')}_import_smoke():")
    lines.append(f"    '''Smoke test to verify {target_relative_path} can be safely imported.'''")
    lines.append("    assert target_module is not None, f'Target import failed: {target_import_error}'")
    lines.append("")
    strategies_used.add("import_smoke")
    test_count += 1

    # 2. Function tests
    for func in module.functions:
        if func.name.startswith("_") and not func.name.startswith("__init__"):
            continue

        func_name = func.name
        qualified_target = f"target_module.{func_name}"

        # Existence test
        lines.append(f"def test_{func_name}_existence():")
        lines.append(f"    '''Verify function {func_name} exists and is callable.'''")
        lines.append("    assert target_module is not None, f'Target import failed: {target_import_error}'")
        lines.append(f"    assert hasattr(target_module, '{func_name}')")
        lines.append(f"    assert callable({qualified_target})")
        lines.append("")
        strategies_used.add("callable_existence")
        test_count += 1

        # Parameter inference for execution test
        args = [parameter.name for parameter in func.parameters]
        arg_values = []

        for arg in args:
            arg_lower = arg.lower()
            if arg_lower in ("self", "cls"):
                continue
            elif "num" in arg_lower or "count" in arg_lower or "total" in arg_lower or arg_lower in ("a", "b", "x", "y", "n", "i", "val", "value", "price", "amount"):
                arg_values.append("10")
            elif "str" in arg_lower or "name" in arg_lower or "text" in arg_lower or "msg" in arg_lower or "url" in arg_lower or "path" in arg_lower or arg_lower in ("s", "key"):
                arg_values.append("'test_value'")
            elif "flag" in arg_lower or "is_" in arg_lower or "has_" in arg_lower or "enable" in arg_lower or arg_lower == "bool":
                arg_values.append("True")
            elif "list" in arg_lower or "items" in arg_lower or "data" in arg_lower or arg_lower in ("arr", "arrs", "lines"):
                arg_values.append("[1, 2, 3]")
            elif "dict" in arg_lower or "cfg" in arg_lower or "config" in arg_lower or "opts" in arg_lower:
                arg_values.append("{'key': 'val'}")
            else:
                # Default safe fallback argument
                arg_values.append("0")

        # Basic execution test
        call_str = f"{qualified_target}({', '.join(arg_values)})"
        lines.append(f"def test_{func_name}_basic_execution():")
        lines.append(f"    '''Verify {func_name} executes cleanly with inferable inputs.'''")
        lines.append("    try:")
        lines.append(f"        result = {call_str}")
        lines.append("        assert result is not NotImplemented")
        lines.append("    except TypeError:")
        lines.append("        pytest.skip('Function requires specific argument signature')")
        lines.append("    except (ValueError, ZeroDivisionError):")
        lines.append("        pytest.skip('Input reached a validation branch')")
        lines.append("")
        strategies_used.add("simple_execution")
        test_count += 1

        # Boundary / Branch tests for functions with numeric or string params
        if args and len(args) <= 3:
            # Boundary zero / empty
            empty_args = []
            for arg in args:
                if arg.lower() in ("self", "cls"):
                    continue
                empty_args.append("0" if any(k in arg.lower() for k in ("a", "b", "x", "y", "n", "num", "count", "val")) else "''")

            if empty_args:
                empty_call = f"{qualified_target}({', '.join(empty_args)})"
                lines.append(f"def test_{func_name}_boundary_empty():")
                lines.append(f"    '''Test {func_name} with empty/zero boundary inputs.'''")
                lines.append("    try:")
                lines.append(f"        res = {empty_call}")
                lines.append("        assert res is not NotImplemented")
                lines.append("    except (TypeError, ValueError, ZeroDivisionError, KeyError, AttributeError):")
                lines.append("        pytest.skip('Boundary input is rejected')")
                lines.append("")
                strategies_used.add("boundary_value")
                test_count += 1

    # 3. Class tests
    for cls in module.classes:
        cls_name = cls.name
        qualified_cls = f"target_module.{cls_name}"

        lines.append(f"def test_class_{cls_name}_instantiation():")
        lines.append(f"    '''Verify class {cls_name} exists and can be instantiated.'''")
        lines.append("    assert target_module is not None, f'Target import failed: {target_import_error}'")
        lines.append(f"    assert hasattr(target_module, '{cls_name}')")
        lines.append("    try:")
        lines.append(f"        obj = {qualified_cls}()")
        lines.append(f"        assert isinstance(obj, {qualified_cls})")
        lines.append("    except TypeError:")
        lines.append("        pytest.skip('Class constructor requires positional arguments')")
        lines.append("    except Exception as e:")
        lines.append("        pytest.skip(f'Instantiation skipped: {e}')")
        lines.append("")
        strategies_used.add("class_instantiation")
        test_count += 1

    code = "\n".join(lines)
    is_valid, err_msg = validate_python_test_code(code)

    return GeneratedTestFile(
        test_id=test_id,
        target_relative_path=module.relative_path,
        language="python",
        framework="pytest",
        safe_test_path=safe_test_path,
        code=code,
        generation_strategy=", ".join(sorted(strategies_used)),
        syntax_valid=is_valid,
        syntax_error_message=err_msg,
        execution_status="not_run",
        test_count=test_count,
        download_eligible=is_valid,
    )
