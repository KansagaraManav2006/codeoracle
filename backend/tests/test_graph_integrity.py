import pytest
from app.analysis.dependency_resolver import (
    resolve_javascript_import,
    resolve_project_dependencies,
    resolve_project_dependencies_with_diagnostics,
    resolve_python_import,
)
from app.analysis.graph_models import GraphResponse
from app.analysis.graph_service import build_project_dependency_graph
from app.analysis.models import (
    DependencyEdge,
    ImportInfo,
    ModuleAnalysis,
    ProjectAnalysis,
)


def test_ts_alias_and_extension_resolution():
    known = {
        "frontend/src/components/Button.tsx": "mod_btn",
        "frontend/src/services/api.ts": "mod_api",
        "src/utils/math.ts": "mod_math",
        "src/index.ts": "mod_idx",
    }

    # @/ alias to frontend/src
    assert resolve_javascript_import("frontend/src/App.tsx", "@/components/Button", known) == "mod_btn"
    assert resolve_javascript_import("frontend/src/App.tsx", "@/services/api", known) == "mod_api"
    # ~/ alias
    assert resolve_javascript_import("frontend/src/App.tsx", "~/components/Button", known) == "mod_btn"
    # ~components without slash
    assert resolve_javascript_import("frontend/src/App.tsx", "~components/Button", known) == "mod_btn"
    # Relative resolution with extension inference
    assert resolve_javascript_import("frontend/src/services/api.ts", "../components/Button", known) == "mod_btn"
    # BaseUrl resolution
    assert resolve_javascript_import("src/main.ts", "utils/math", known) == "mod_math"


def test_python_package_roots_and_relative_imports():
    known = {
        "backend/app/services/forecast.py": "mod_forecast",
        "backend/app/database.py": "mod_db",
        "backend/app/core/cache.py": "mod_cache",
        "backend/app/main.py": "mod_main",
        "ml/train.py": "mod_train",
    }

    # Absolute import from app.* with backend/ prefix root
    res_app = resolve_python_import(
        source_rel_path="backend/app/main.py",
        module_name="app.services.forecast",
        is_relative=False,
        known_paths=known,
    )
    assert res_app == "mod_forecast"

    # Relative import .database
    res_rel_dot = resolve_python_import(
        source_rel_path="backend/app/main.py",
        module_name=".database",
        is_relative=True,
        known_paths=known,
    )
    assert res_rel_dot == "mod_db"

    # Relative import ..core.cache
    res_rel_double_dot = resolve_python_import(
        source_rel_path="backend/app/services/forecast.py",
        module_name="..core.cache",
        is_relative=True,
        known_paths=known,
    )
    assert res_rel_double_dot == "mod_cache"

    # from . import database where module_name is empty
    res_empty_name = resolve_python_import(
        source_rel_path="backend/app/main.py",
        module_name=".",
        is_relative=True,
        known_paths=known,
        imported_symbols=["database"],
    )
    assert res_empty_name == "mod_db"


def test_graph_mathematical_invariants():
    """Verify sum(fanIn) == resolvedEdges == sum(fanOut) == edges.length."""
    mod_a = ModuleAnalysis(
        module_id="mod_a",
        relative_path="src/a.ts",
        language="typescript",
        line_count=50,
        parse_status="complete",
        imports=[
            ImportInfo(module_name="./b", is_relative=True, source_line=1),
            ImportInfo(module_name="./c", is_relative=True, source_line=2),
        ],
    )
    mod_b = ModuleAnalysis(
        module_id="mod_b",
        relative_path="src/b.ts",
        language="typescript",
        line_count=40,
        parse_status="complete",
        imports=[
            ImportInfo(module_name="./c", is_relative=True, source_line=1),
        ],
    )
    mod_c = ModuleAnalysis(
        module_id="mod_c",
        relative_path="src/c.ts",
        language="typescript",
        line_count=30,
        parse_status="complete",
        imports=[],
    )
    mod_standalone = ModuleAnalysis(
        module_id="mod_standalone",
        relative_path="src/isolated.ts",
        language="typescript",
        line_count=20,
        parse_status="complete",
        imports=[],
    )

    modules = [mod_a, mod_b, mod_c, mod_standalone]
    edges, unresolved = resolve_project_dependencies_with_diagnostics(modules)

    proj = ProjectAnalysis(
        project_id="test_proj",
        content_hash="test",
        languages=["typescript"],
        total_files=len(modules),
        total_lines=140,
        modules=modules,
        dependency_edges=edges,
    )

    graph_res = build_project_dependency_graph(proj, include_external=False)

    # 1. Total edges in graph equals summary resolved_edges
    assert len(graph_res.edges) == graph_res.summary.resolved_edges
    assert graph_res.summary.resolved_edges == 3

    # 2. Invariant: sum(fan_in) == resolved_edges == sum(fan_out)
    total_fan_in = sum(n.fan_in for n in graph_res.nodes)
    total_fan_out = sum(n.fan_out for n in graph_res.nodes)
    assert total_fan_in == graph_res.summary.resolved_edges
    assert total_fan_out == graph_res.summary.resolved_edges

    # 3. Node degrees
    nodes_by_id = {n.id: n for n in graph_res.nodes}
    assert nodes_by_id["mod_a"].fan_out == 2
    assert nodes_by_id["mod_a"].fan_in == 0
    assert nodes_by_id["mod_b"].fan_out == 1
    assert nodes_by_id["mod_b"].fan_in == 1
    assert nodes_by_id["mod_c"].fan_out == 0
    assert nodes_by_id["mod_c"].fan_in == 2

    # 4. Standalone logic
    assert nodes_by_id["mod_standalone"].standalone_status == "true_standalone"
    assert graph_res.summary.standalone_modules == 1
    assert graph_res.summary.orphan_count == 1


def test_semantic_entry_point_classification():
    mod_main = ModuleAnalysis(
        module_id="m1",
        relative_path="frontend/src/main.tsx",
        language="typescript",
        line_count=30,
        parse_status="complete",
    )
    mod_server = ModuleAnalysis(
        module_id="m2",
        relative_path="backend/app/main.py",
        language="python",
        line_count=50,
        parse_status="complete",
    )
    mod_config = ModuleAnalysis(
        module_id="m3",
        relative_path="vite.config.ts",
        language="typescript",
        line_count=25,
        parse_status="complete",
    )
    mod_worker = ModuleAnalysis(
        module_id="m4",
        relative_path="backend/worker.py",
        language="python",
        line_count=45,
        parse_status="complete",
    )

    modules = [mod_main, mod_server, mod_config, mod_worker]
    proj = ProjectAnalysis(
        project_id="test_entries",
        content_hash="hash",
        languages=["python", "typescript"],
        total_files=len(modules),
        total_lines=150,
        modules=modules,
        dependency_edges=[],
    )

    graph_res = build_project_dependency_graph(proj, include_external=False)
    nodes = {n.id: n for n in graph_res.nodes}

    assert nodes["m1"].entry_point_kind == "frontend_bootstrap"
    assert nodes["m1"].entry_point_confidence == "high"
    assert nodes["m2"].entry_point_kind == "app_runtime"
    assert nodes["m2"].entry_point_confidence == "high"
    assert nodes["m3"].entry_point_kind == "config"
    assert nodes["m4"].entry_point_kind == "worker"


def test_isolation_uncertain_when_unresolved_imports():
    """Modules with unresolved imports must NOT be marked true_standalone."""
    mod_unresolved = ModuleAnalysis(
        module_id="m_unres",
        relative_path="src/orphan_maybe.ts",
        language="typescript",
        line_count=20,
        parse_status="complete",
        imports=[
            ImportInfo(module_name="@/missing/feature", is_relative=False, source_line=1),
        ],
    )
    proj = ProjectAnalysis(
        project_id="test_unres",
        content_hash="hash",
        languages=["typescript"],
        total_files=1,
        total_lines=20,
        modules=[mod_unresolved],
        dependency_edges=[
            DependencyEdge(
                edge_id="e1",
                source_module_id="m_unres",
                target_module_id="@/missing/feature",
                type="import",
                resolved=False,
                source_line=1,
            )
        ],
    )

    graph_res = build_project_dependency_graph(proj, include_external=False)
    node = graph_res.nodes[0]
    assert node.standalone_status == "isolation_uncertain"
    assert graph_res.summary.standalone_modules == 0
    assert graph_res.summary.unresolved_imports == 1
    assert graph_res.summary.cycle_confidence_warning is not None
