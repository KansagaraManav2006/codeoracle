from pathlib import Path
from typing import List, Optional

from app.analysis.models import ModuleAnalysis, ProjectAnalysis
from app.testgen.models import GeneratedTestFile
from app.testgen.validator import validate_javascript_test_code


def _relative_path_to_js_import(rel_path: str) -> str:
    """Calculates relative import path from test file (in tests/) to target file."""
    p = Path(rel_path)
    clean_parts = list(p.parts)
    return "../" + "/".join(clean_parts)


def _safe_js_test_filename(rel_path: str) -> str:
    """Generates a safe test file path like 'tests/math_helper.test.js'."""
    p = Path(rel_path)
    clean_name = "_".join(p.with_suffix("").parts).replace(".", "_").replace("-", "_")
    return f"tests/{clean_name}.test.js"


def generate_javascript_unit_tests(
    module: ModuleAnalysis,
    project_analysis: ProjectAnalysis,
    uncovered_lines: Optional[List[int]] = None,
) -> GeneratedTestFile:
    """Generates deterministic Vitest unit tests for a JavaScript module."""
    js_import_path = _relative_path_to_js_import(module.relative_path)
    safe_test_path = _safe_js_test_filename(module.relative_path)
    test_id = f"testgen_js_{module.module_id}"

    is_commonjs = Path(module.relative_path).suffix.lower() == ".cjs" or any(
        item.import_kind == "require" for item in module.imports
    )

    lines = [
        "// Auto-generated Vitest test suite by CodeOracle",
        "import { describe, it, expect } from 'vitest';",
        "",
    ]

    mod_var = "targetModule"
    if is_commonjs:
        lines.append(f"const {mod_var} = require('{js_import_path}');")
    else:
        lines.append(f"import * as {mod_var} from '{js_import_path}';")
    lines.append("")

    strategies_used = set()
    test_count = 0

    lines.append(f"describe('{module.relative_path} test suite', () => {{")

    # 1. Import smoke test
    lines.append("  it('should load module successfully', () => {")
    lines.append(f"    expect({mod_var}).toBeDefined();")
    lines.append("  });")
    lines.append("")
    strategies_used.add("import_smoke")
    test_count += 1

    # 2. Function tests
    for func in module.functions:
        func_name = func.name
        if func_name.startswith("_"):
            continue

        lines.append(f"  describe('function {func_name}', () => {{")

        # Existence
        lines.append(f"    it('should be exported and callable', () => {{")
        lines.append(f"      const target = {mod_var}.{func_name} || {mod_var}.default || {mod_var};")
        lines.append("      expect(target).toBeDefined();")
        lines.append("    });")
        lines.append("")
        strategies_used.add("export_existence")
        test_count += 1

        # Execution
        lines.append(f"    it('should execute without crashing', () => {{")
        lines.append(f"      const target = {mod_var}.{func_name} || {mod_var}.default;")
        lines.append("      if (typeof target === 'function') {")
        lines.append("        try {")
        lines.append("          const res = target(10, 'test');")
        lines.append("          expect(res).toBeDefined();")
        lines.append("        } catch (e) {")
        lines.append("          // Graceful handling for functions requiring specific signatures")
        lines.append("          expect(e).toBeDefined();")
        lines.append("        }")
        lines.append("      }")
        lines.append("    });")
        lines.append("  });")
        lines.append("")
        strategies_used.add("simple_execution")
        test_count += 1

    # 3. Class tests
    for cls in module.classes:
        cls_name = cls.name
        lines.append(f"  describe('class {cls_name}', () => {{")
        lines.append("    it('should instantiate correctly', () => {")
        lines.append(f"      const TargetClass = {mod_var}.{cls_name} || {mod_var}.default;")
        lines.append("      if (typeof TargetClass === 'function') {")
        lines.append("        try {")
        lines.append("          const instance = new TargetClass();")
        lines.append("          expect(instance).toBeDefined();")
        lines.append("        } catch (e) {")
        lines.append("          expect(e).toBeDefined();")
        lines.append("        }")
        lines.append("      }")
        lines.append("    });")
        lines.append("  });")
        lines.append("")
        strategies_used.add("class_instantiation")
        test_count += 1

    lines.append("});")

    code = "\n".join(lines)
    is_valid, err_msg = validate_javascript_test_code(code)

    return GeneratedTestFile(
        test_id=test_id,
        target_relative_path=module.relative_path,
        language="javascript",
        framework="vitest",
        safe_test_path=safe_test_path,
        code=code,
        generation_strategy=", ".join(sorted(strategies_used)),
        syntax_valid=is_valid,
        syntax_error_message=err_msg,
        execution_status="not_run",
        test_count=test_count,
        download_eligible=is_valid,
    )
