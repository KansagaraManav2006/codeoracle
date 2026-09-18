import hashlib
import logging
from typing import Dict, List, Set

from sqlalchemy.orm import Session

from app.analysis.models import ProjectAnalysis
from app.models.db import Project, ProjectAnalysisRecord
from app.models.schema import (
    KnowledgeGraphEdge,
    KnowledgeGraphNode,
    KnowledgeGraphResponse,
    KnowledgeGraphSummary,
    KnowledgeGraphValidation,
)

logger = logging.getLogger(__name__)


def build_knowledge_graph(db: Session, project_id: str) -> KnowledgeGraphResponse:
    """
    Constructs a normalized, read-only Codebase Knowledge Graph representing
    entities (projects, files, modules, classes, functions, methods, variables,
    imports, exports, calls, APIs, tests, dependencies, configuration files, DB interactions)
    and directed relationships (IMPORTS, IMPORTED_BY, CALLS, CALLED_BY, EXTENDS, IMPLEMENTS,
    DEPENDS_ON, TESTS, EXPOSES, READS, WRITES). Includes validation checks to prevent
    duplicate or corrupted edges.
    """
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise ValueError(f"Project '{project_id}' not found.")

    record = (
        db.query(ProjectAnalysisRecord)
        .filter(ProjectAnalysisRecord.project_id == project_id)
        .order_by(ProjectAnalysisRecord.created_at.desc())
        .first()
    )
    if not record or not record.analysis_data:
        from app.analysis.service import run_analysis_for_project
        analysis = run_analysis_for_project(db, project_id, force=True)
    else:
        analysis = ProjectAnalysis.model_validate(record.analysis_data)

    nodes_map: Dict[str, KnowledgeGraphNode] = {}
    edges_map: Dict[str, KnowledgeGraphEdge] = {}
    seen_edge_triples: Set[str] = set()

    duplicate_edges_removed = 0
    orphaned_edges_prevented = 0
    warnings: List[str] = []

    def add_node(node: KnowledgeGraphNode):
        if node.id not in nodes_map:
            nodes_map[node.id] = node

    def add_edge(source_id: str, target_id: str, relation: str, properties: dict = None) -> bool:
        nonlocal duplicate_edges_removed, orphaned_edges_prevented
        if properties is None:
            properties = {}

        # Validation: Check orphaned node references
        if source_id not in nodes_map or target_id not in nodes_map:
            orphaned_edges_prevented += 1
            return False

        # Validation: Check duplicate edge triple
        triple_key = f"{source_id}|{target_id}|{relation}"
        if triple_key in seen_edge_triples:
            duplicate_edges_removed += 1
            return False

        seen_edge_triples.add(triple_key)
        edge_id = f"kg_edge_{hashlib.sha256(triple_key.encode('utf-8')).hexdigest()[:12]}"
        edges_map[edge_id] = KnowledgeGraphEdge(
            id=edge_id,
            source_id=source_id,
            target_id=target_id,
            relation=relation,
            properties=properties,
        )
        return True

    # 1. Project Root Node
    root_node_id = f"node_proj_{project_id}"
    add_node(
        KnowledgeGraphNode(
            id=root_node_id,
            label=proj.display_name,
            kind="project",
            properties={
                "project_id": project_id,
                "languages": analysis.languages,
                "total_files": analysis.total_files,
                "total_lines": analysis.total_lines,
            },
        )
    )

    # 2. Iterate Modules
    for mod in analysis.modules:
        mod_node_id = f"node_mod_{mod.module_id}"
        file_node_id = f"node_file_{mod.relative_path.replace('/', '_').replace('.', '_')}"

        is_config = any(
            cfg_name in mod.relative_path.lower()
            for cfg_name in [
                "package.json",
                "tsconfig",
                "pytest.ini",
                "setup.py",
                "pyproject.toml",
                ".env",
                "docker",
                "requirements",
            ]
        )
        is_test = (
            "test" in mod.relative_path.lower()
            or mod.relative_path.startswith("tests/")
            or mod.relative_path.endswith("_test.py")
        )

        kind = "configuration_file" if is_config else ("test" if is_test else "module")

        add_node(
            KnowledgeGraphNode(
                id=mod_node_id,
                label=mod.relative_path,
                kind=kind,
                properties={
                    "language": mod.language,
                    "line_count": mod.line_count,
                    "parse_status": mod.parse_status,
                    "is_entry_point": mod.is_entry_point,
                    "complexity": mod.complexity.cyclomatic_complexity,
                },
            )
        )

        # File Node
        add_node(
            KnowledgeGraphNode(
                id=file_node_id,
                label=mod.relative_path,
                kind="file",
                properties={"language": mod.language, "lines": mod.line_count},
            )
        )

        # Project EXPOSES/CONTAINS File & Module
        add_edge(root_node_id, mod_node_id, "DEPENDS_ON", {"type": "contains_module"})
        add_edge(root_node_id, file_node_id, "EXPOSES", {"type": "contains_file"})

        # Check DB Interaction
        db_indicators = ["db", "session", "sqlalchemy", "model", "query", "select", "insert", "update", "delete", "table"]
        path_lower = mod.relative_path.lower()
        if any(db_word in path_lower for db_word in ["db", "model", "repository", "crud", "database"]):
            db_node_id = f"node_db_{mod.module_id}"
            add_node(
                KnowledgeGraphNode(
                    id=db_node_id,
                    label=f"DB Context: {mod.relative_path}",
                    kind="database_interaction",
                    properties={"module": mod.relative_path},
                )
            )
            add_edge(mod_node_id, db_node_id, "READS", {"context": "persistence_layer"})
            add_edge(mod_node_id, db_node_id, "WRITES", {"context": "persistence_layer"})

        # Check API Endpoint node
        if any(api_word in path_lower for api_word in ["route", "api", "controller", "endpoint", "views"]):
            api_node_id = f"node_api_{mod.module_id}"
            add_node(
                KnowledgeGraphNode(
                    id=api_node_id,
                    label=f"API Module: {mod.relative_path}",
                    kind="api",
                    properties={"module": mod.relative_path},
                )
            )
            add_edge(mod_node_id, api_node_id, "EXPOSES", {"type": "api_contract"})

        # Process Classes
        for cls in mod.classes:
            cls_node_id = f"node_cls_{cls.symbol_id}"
            add_node(
                KnowledgeGraphNode(
                    id=cls_node_id,
                    label=cls.name,
                    kind="class",
                    properties={
                        "qualified_name": cls.qualified_name,
                        "module": mod.relative_path,
                        "start_line": cls.start_line,
                        "end_line": cls.end_line,
                    },
                )
            )
            add_edge(mod_node_id, cls_node_id, "EXPOSES", {"type": "class_declaration"})

            # Handle Inheritance (EXTENDS)
            for dec in cls.decorators:
                if "base" in dec.lower() or "model" in dec.lower():
                    base_id = f"node_cls_base_{dec}"
                    add_node(
                        KnowledgeGraphNode(
                            id=base_id,
                            label=dec,
                            kind="class",
                            properties={"is_external_base": True},
                        )
                    )
                    add_edge(cls_node_id, base_id, "EXTENDS", {"base_class": dec})

        # Process Functions
        for fn in mod.functions:
            fn_node_id = f"node_fn_{fn.symbol_id}"
            fn_kind = "test" if fn.name.startswith("test_") or is_test else "function"
            add_node(
                KnowledgeGraphNode(
                    id=fn_node_id,
                    label=fn.name,
                    kind=fn_kind,
                    properties={
                        "qualified_name": fn.qualified_name,
                        "module": mod.relative_path,
                        "is_async": fn.is_async,
                        "complexity": fn.complexity,
                    },
                )
            )
            add_edge(mod_node_id, fn_node_id, "EXPOSES", {"type": "function_declaration"})

            if fn_kind == "test":
                # Link test function to target module
                add_edge(fn_node_id, root_node_id, "TESTS", {"target_scope": "project"})

        # Process Variables
        for var in mod.variables:
            var_node_id = f"node_var_{var.symbol_id}"
            add_node(
                KnowledgeGraphNode(
                    id=var_node_id,
                    label=var.name,
                    kind="variable",
                    properties={
                        "qualified_name": var.qualified_name,
                        "module": mod.relative_path,
                    },
                )
            )
            add_edge(mod_node_id, var_node_id, "EXPOSES", {"type": "variable_declaration"})

        # Process Imports
        for imp in mod.imports:
            imp_target_id = f"node_imp_{hashlib.sha256(imp.module_name.encode('utf-8')).hexdigest()[:12]}"
            if imp_target_id not in nodes_map:
                add_node(
                    KnowledgeGraphNode(
                        id=imp_target_id,
                        label=imp.module_name,
                        kind="import",
                        properties={"module_name": imp.module_name, "is_relative": imp.is_relative},
                    )
                )
            add_edge(mod_node_id, imp_target_id, "IMPORTS", {"source_line": imp.source_line})
            add_edge(imp_target_id, mod_node_id, "IMPORTED_BY", {"source_line": imp.source_line})

        # Process Exports
        for exp in mod.exports:
            exp_node_id = f"node_exp_{hashlib.sha256(f'{mod.module_id}:{exp.name}'.encode('utf-8')).hexdigest()[:12]}"
            add_node(
                KnowledgeGraphNode(
                    id=exp_node_id,
                    label=exp.name,
                    kind="export",
                    properties={"kind": exp.kind, "source_line": exp.source_line},
                )
            )
            add_edge(mod_node_id, exp_node_id, "EXPOSES", {"source_line": exp.source_line})

        # Process Calls
        for call in mod.calls:
            call_node_id = f"node_call_{hashlib.sha256(f'{call.caller_qualified_name}:{call.target_name}'.encode('utf-8')).hexdigest()[:12]}"
            add_node(
                KnowledgeGraphNode(
                    id=call_node_id,
                    label=f"{call.caller_qualified_name} -> {call.target_name}",
                    kind="call",
                    properties={"target_name": call.target_name, "source_line": call.source_line},
                )
            )
            add_edge(mod_node_id, call_node_id, "CALLS", {"source_line": call.source_line})

    # 3. Process Dependency Edges for External Dependencies
    for edge in analysis.dependency_edges:
        src_mod_id = f"node_mod_{edge.source_module_id}"
        tgt_mod_id = f"node_mod_{edge.target_module_id}"

        if tgt_mod_id not in nodes_map:
            # Create external package dependency node
            dep_node_id = f"node_dep_{hashlib.sha256(edge.target_module_id.encode('utf-8')).hexdigest()[:12]}"
            add_node(
                KnowledgeGraphNode(
                    id=dep_node_id,
                    label=edge.target_module_id,
                    kind="dependency",
                    properties={"is_external": True},
                )
            )
            tgt_mod_id = dep_node_id

        add_edge(src_mod_id, tgt_mod_id, "DEPENDS_ON", {"type": edge.type, "source_line": edge.source_line})

    # 4. Compute Graph Summary & Kind/Relation Counts
    node_kind_counts: Dict[str, int] = {}
    for node in nodes_map.values():
        node_kind_counts[node.kind] = node_kind_counts.get(node.kind, 0) + 1

    relation_counts: Dict[str, int] = {}
    for edge in edges_map.values():
        relation_counts[edge.relation] = relation_counts.get(edge.relation, 0) + 1

    # Validation Summary
    validation_status = "valid"
    if duplicate_edges_removed > 0 or orphaned_edges_prevented > 0:
        validation_status = "warnings"
        if duplicate_edges_removed > 0:
            warnings.append(f"Removed {duplicate_edges_removed} duplicate relation edge(s).")
        if orphaned_edges_prevented > 0:
            warnings.append(f"Prevented {orphaned_edges_prevented} orphaned edge(s) referencing non-existent nodes.")

    validation = KnowledgeGraphValidation(
        status=validation_status,
        duplicate_edges_removed=duplicate_edges_removed,
        orphaned_edges_prevented=orphaned_edges_prevented,
        total_checks_passed=len(nodes_map) + len(edges_map),
        warnings=warnings,
    )

    summary = KnowledgeGraphSummary(
        total_nodes=len(nodes_map),
        total_edges=len(edges_map),
        node_kind_counts=node_kind_counts,
        relation_counts=relation_counts,
        validation=validation,
    )

    # Sort nodes and edges deterministically
    sorted_nodes = sorted(list(nodes_map.values()), key=lambda n: (n.kind, n.label, n.id))
    sorted_edges = sorted(list(edges_map.values()), key=lambda e: (e.relation, e.source_id, e.target_id, e.id))

    return KnowledgeGraphResponse(
        project_id=project_id,
        summary=summary,
        nodes=sorted_nodes,
        edges=sorted_edges,
        schema_version="1.0.0",
        disclaimer="Knowledge Graph is an internal read-only structured representation of project entities and relationships.",
    )
