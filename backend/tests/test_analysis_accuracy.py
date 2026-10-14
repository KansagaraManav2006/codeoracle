"""Benchmark ground-truth tests measuring static analysis engine accuracy.

Verifies:
1. Exact language parser behavior (Python ast, Tree-sitter JS)
2. Import and dependency resolution
3. Entry-point detection (structural and semantic)
4. Cycle detection (find_directed_cycles)
5. Fan-in, fan-out, and graph conservation invariants
6. Transitive blast radius calculations
7. Cyclomatic complexity calculations
8. Modernization findings and rule detections
9. Test-generation syntax validation
10. Refactor proposal syntax validation
"""
from pathlib import Path
import pytest

from app.analysis.complexity import calculate_python_ast_complexity
from app.analysis.dependency_resolver import resolve_project_dependencies
from app.analysis.graph_service import (
    _classify_semantic_entry_point,
    build_project_dependency_graph,
    find_directed_cycles,
)
from app.analysis.javascript_analyzer import analyze_javascript_source
from app.analysis.models import (
    ANALYZER_VERSION,
    ModuleAnalysis,
    ProjectAnalysis,
    generate_module_id,
)
from app.analysis.python_analyzer import analyze_python_source
from app.analysis.scoring import SCORING_VERSION
from app.refactor.service import _syntax_check, _modernize_python
from app.testgen.javascript_generator import generate_javascript_unit_tests
from app.testgen.python_generator import generate_python_unit_tests
from app.testgen.validator import validate_javascript_test_code, validate_python_test_code

CORPUS_ROOT = Path(__file__).parent / "fixtures" / "benchmark_corpus"


class TestAnalysisAccuracyBenchmark:
    """Rigorous ground-truth verification on benchmark corpus fixtures."""

    # 1. Parse Success & Truthful Reporting
    def test_python_clean_parse_accuracy(self):
        root = CORPUS_ROOT / "python_clean"
        utils_path = root / "utils.py"
        service_path = root / "service.py"
        main_path = root / "main.py"

        mod_utils = analyze_python_source("proj_bench", "utils.py", utils_path)
        mod_service = analyze_python_source("proj_bench", "service.py", service_path)
        mod_main = analyze_python_source("proj_bench", "main.py", main_path)

        # Parse success assertions
        assert mod_utils.parse_status == "complete"
        assert len(mod_utils.parse_errors) == 0
        assert mod_service.parse_status == "complete"
        assert len(mod_service.parse_errors) == 0
        assert mod_main.parse_status == "complete"
        assert len(mod_main.parse_errors) == 0

        # Symbol extraction
        utils_fn_names = {f.name for f in mod_utils.functions}
        assert utils_fn_names == {"add", "multiply", "format_currency"}

        service_cls_names = {c.name for c in mod_service.classes}
        assert service_cls_names == {"BillingService"}

    def test_python_syntax_error_partial_status(self):
        root = CORPUS_ROOT / "python_syntax_error"
        broken_path = root / "syntax_broken.py"

        mod_broken = analyze_python_source("proj_bench", "syntax_broken.py", broken_path)

        # Must report partial status, never silently pretend full parse
        assert mod_broken.parse_status == "partial"
        assert len(mod_broken.parse_errors) > 0
        # Token fallback extracts import
        imported_mods = {imp.module_name for imp in mod_broken.imports}
        assert "os" in imported_mods

    def test_javascript_esm_parse_accuracy(self):
        root = CORPUS_ROOT / "js_esm"
        calc_path = root / "calculator.js"
        math_path = root / "math_utils.js"

        mod_calc = analyze_javascript_source("proj_bench", "calculator.js", calc_path, "javascript")
        mod_math = analyze_javascript_source("proj_bench", "math_utils.js", math_path, "javascript")

        assert mod_calc.parse_status == "complete"
        assert len(mod_calc.parse_errors) == 0
        assert mod_math.parse_status == "complete"
        assert len(mod_math.parse_errors) == 0

        # Exports
        math_exports = {exp.name for exp in mod_math.exports}
        assert "add" in math_exports
        assert "multiply" in math_exports

        calc_classes = {c.name for c in mod_calc.classes}
        assert "Calculator" in calc_classes

    def test_javascript_commonjs_parse_accuracy(self):
        root = CORPUS_ROOT / "js_commonjs"
        server_path = root / "server.js"
        logger_path = root / "logger.js"

        mod_server = analyze_javascript_source("proj_bench", "server.js", server_path, "javascript")
        mod_logger = analyze_javascript_source("proj_bench", "logger.js", logger_path, "javascript")

        assert mod_server.parse_status == "complete"
        assert mod_logger.parse_status == "complete"

        # CJS require detection
        req_mods = [imp.module_name for imp in mod_server.imports if imp.import_kind == "require"]
        assert "./logger" in req_mods

    def test_typescript_and_tsx_handling(self):
        root = CORPUS_ROOT / "ts_types"
        user_service = root / "user_service.ts"
        mod_user = analyze_javascript_source("proj_bench", "user_service.ts", user_service, "typescript")

        # Type-only import detection
        type_imports = [imp for imp in mod_user.imports if imp.is_type_only]
        assert len(type_imports) >= 1
        assert type_imports[0].module_name == "./types"

        # TSX Component extraction
        tsx_root = CORPUS_ROOT / "tsx_react"
        btn_path = tsx_root / "Button.tsx"
        mod_btn = analyze_javascript_source("proj_bench", "Button.tsx", btn_path, "typescript")
        fn_names = {f.name for f in mod_btn.functions}
        assert "PrimaryButton" in fn_names

    # 2. Import & Dependency Resolution
    def test_dependency_resolution(self):
        root = CORPUS_ROOT / "python_clean"
        modules = [
            analyze_python_source("proj_bench", "utils.py", root / "utils.py"),
            analyze_python_source("proj_bench", "service.py", root / "service.py"),
            analyze_python_source("proj_bench", "main.py", root / "main.py"),
        ]

        edges = resolve_project_dependencies(modules)
        resolved_edges = [e for e in edges if e.resolved]

        id_map = {m.relative_path: m.module_id for m in modules}

        # main -> service edge
        main_to_service = [
            e for e in resolved_edges
            if e.source_module_id == id_map["main.py"] and e.target_module_id == id_map["service.py"]
        ]
        assert len(main_to_service) >= 1

        # service -> utils edge
        service_to_utils = [
            e for e in resolved_edges
            if e.source_module_id == id_map["service.py"] and e.target_module_id == id_map["utils.py"]
        ]
        assert len(service_to_utils) >= 1

    # 3. Entry-point Detection
    def test_entry_point_detection(self):
        root = CORPUS_ROOT / "python_clean"
        mod_main = analyze_python_source("proj_bench", "main.py", root / "main.py")
        mod_utils = analyze_python_source("proj_bench", "utils.py", root / "utils.py")

        assert mod_main.is_entry_point is True
        assert mod_utils.is_entry_point is False

        is_entry, kind, conf, evidence = _classify_semantic_entry_point("main.py", mod_main)
        assert is_entry is True
        assert kind == "app_runtime"
        assert conf == "high"

    # 4. Cycle Detection
    def test_cycle_detection_in_cycle_corpus(self):
        root = CORPUS_ROOT / "python_cycles"
        modules = [
            analyze_python_source("proj_cycles", "node_a.py", root / "node_a.py"),
            analyze_python_source("proj_cycles", "node_b.py", root / "node_b.py"),
            analyze_python_source("proj_cycles", "node_c.py", root / "node_c.py"),
        ]
        edges = resolve_project_dependencies(modules)
        edge_pairs = [(e.source_module_id, e.target_module_id) for e in edges if e.resolved]
        node_ids = {m.module_id for m in modules}

        cycles = find_directed_cycles(node_ids, edge_pairs)

        # Ground truth: exactly 1 3-node cycle
        assert len(cycles) == 1
        assert len(cycles[0]) == 4  # e.g. [A, B, C, A]
        assert cycles[0][0] == cycles[0][-1]

    def test_cycle_detection_zero_in_clean_corpus(self):
        root = CORPUS_ROOT / "python_clean"
        modules = [
            analyze_python_source("proj_bench", "utils.py", root / "utils.py"),
            analyze_python_source("proj_bench", "service.py", root / "service.py"),
            analyze_python_source("proj_bench", "main.py", root / "main.py"),
        ]
        edges = resolve_project_dependencies(modules)
        edge_pairs = [(e.source_module_id, e.target_module_id) for e in edges if e.resolved]
        node_ids = {m.module_id for m in modules}

        cycles = find_directed_cycles(node_ids, edge_pairs)
        assert len(cycles) == 0

    # 5. Fan-in / Fan-out & Blast Radius
    def test_graph_degrees_and_blast_radius(self):
        root = CORPUS_ROOT / "python_clean"
        modules = [
            analyze_python_source("proj_bench", "utils.py", root / "utils.py"),
            analyze_python_source("proj_bench", "service.py", root / "service.py"),
            analyze_python_source("proj_bench", "main.py", root / "main.py"),
        ]
        edges = resolve_project_dependencies(modules)

        analysis = ProjectAnalysis(
            project_id="proj_bench",
            content_hash="hash_clean",
            total_files=3,
            modules=modules,
            dependency_edges=edges,
        )

        graph_resp = build_project_dependency_graph(analysis, include_external=False)

        node_map = {n.label: n for n in graph_resp.nodes}
        # utils.py: fan_in=1 (service.py), blast_radius=2 (service + main)
        assert node_map["utils.py"].fan_in == 1
        assert node_map["utils.py"].blast_radius == 2

        # service.py: fan_in=1 (main.py), blast_radius=1 (main)
        assert node_map["service.py"].fan_in == 1
        assert node_map["service.py"].blast_radius == 1

        # main.py: fan_in=0, blast_radius=0
        assert node_map["main.py"].fan_in == 0
        assert node_map["main.py"].blast_radius == 0

        # Degree conservation invariant: sum(in_degree) == sum(out_degree) == internal edge count
        in_sum = sum(n.fan_in for n in graph_resp.nodes)
        out_sum = sum(n.fan_out for n in graph_resp.nodes)
        assert in_sum == out_sum == 2

    # 6. Cyclomatic Complexity
    def test_cyclomatic_complexity_ground_truth(self):
        root = CORPUS_ROOT / "python_clean"
        utils_mod = analyze_python_source("proj_bench", "utils.py", root / "utils.py")

        format_fn = next(f for f in utils_mod.functions if f.name == "format_currency")
        # 1 base + 1 'if amount < 0' = 2
        assert format_fn.complexity == 2

        add_fn = next(f for f in utils_mod.functions if f.name == "add")
        # 1 base (no branches) = 1
        assert add_fn.complexity == 1

    # 7. Modernization Findings
    def test_modernization_rule_findings(self):
        legacy_code = "print 'Legacy Python 2 print statement'\n"
        modern, changes, warnings = _modernize_python(legacy_code)

        assert "print(" in modern
        assert len(changes) >= 1
        assert any(w.code == "PY2_PRINT" for w in warnings)

    # 8. Test Generation Syntax Validity
    def test_test_generation_syntax_validity(self):
        root = CORPUS_ROOT / "python_clean"
        service_mod = analyze_python_source("proj_bench", "service.py", root / "service.py")
        analysis = ProjectAnalysis(
            project_id="proj_bench",
            content_hash="h1",
            total_files=1,
            modules=[service_mod],
        )

        test_file = generate_python_unit_tests(service_mod, analysis)
        assert test_file.syntax_valid is True
        assert test_file.syntax_error_message is None

        # Direct AST parse check
        valid, err = validate_python_test_code(test_file.code)
        assert valid is True
        assert err is None

    # 9. Refactor Syntax Validity
    def test_refactor_syntax_validity(self):
        valid_py = "def clean_func(x: int) -> int:\n    return x + 1\n"
        is_valid, err = _syntax_check("python", valid_py)
        assert is_valid is True
        assert err is None

        invalid_py = "def broken(\n    return 1\n"
        is_valid, err = _syntax_check("python", invalid_py)
        assert is_valid is False
        assert "SyntaxError" in str(err) or "Line" in str(err)

    # 10. Engine Version Constants
    def test_version_constants(self):
        assert ANALYZER_VERSION == "1.1.0"
        assert SCORING_VERSION == "1.2.0"
