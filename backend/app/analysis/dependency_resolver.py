import logging
from pathlib import Path
from typing import Dict, List, Optional, Set

from app.analysis.models import DependencyEdge, ModuleAnalysis, generate_edge_id

logger = logging.getLogger(__name__)

# Standard library module names to avoid false positive local matching
PYTHON_STDLIB = {
    "os", "sys", "re", "json", "math", "time", "datetime", "hashlib", "io",
    "pathlib", "shutil", "subprocess", "logging", "typing", "collections",
    "dataclasses", "unittest", "asyncio", "ast", "tokenize", "uuid", "random",
    "sqlite3", "urllib", "copy", "inspect", "functools", "itertools", "concurrent"
}

JS_BUILTINS = {
    "fs", "path", "http", "https", "events", "util", "stream", "crypto",
    "buffer", "child_process", "os", "url", "querystring", "net", "tls"
}


def resolve_python_import(
    source_rel_path: str,
    module_name: str,
    is_relative: bool,
    known_paths: Dict[str, str],  # normalized_path -> module_id
) -> Optional[str]:
    """Resolves Python import to local project module_id if present."""
    if not module_name:
        return None

    source_dir = Path(source_rel_path).parent

    if is_relative:
        # e.g., source="app/services/user.py", import=".utils" -> "app/services/utils"
        dots_count = len(module_name) - len(module_name.lstrip("."))
        target_name = module_name.lstrip(".")

        current_dir = source_dir
        for _ in range(max(dots_count - 1, 0)):
            current_dir = current_dir.parent

        base_parts = target_name.split(".") if target_name else []
        rel_target = "/".join([str(current_dir.as_posix())] + base_parts).strip("/")
    else:
        # e.g. "app.services.user" -> "app/services/user"
        rel_target = module_name.replace(".", "/")

    # Candidate file paths
    candidates = [
        f"{rel_target}.py",
        f"{rel_target}/__init__.py",
    ]

    for cand in candidates:
        norm_cand = cand.strip("/")
        if norm_cand in known_paths:
            return known_paths[norm_cand]

    return None


def resolve_javascript_import(
    source_rel_path: str,
    import_specifier: str,
    known_paths: Dict[str, str],  # normalized_path -> module_id
) -> Optional[str]:
    """Resolves JavaScript import/require specifier to local project module_id."""
    if not import_specifier or not import_specifier.startswith("."):
        return None

    source_dir = Path(source_rel_path).parent
    resolved_path = (source_dir / import_specifier).resolve()

    # Convert to relative path from root directory posix
    try:
        # Normalize relative path
        norm_base = (source_dir / import_specifier).as_posix()
        # Clean relative path components (./ and ../)
        parts = []
        for p in norm_base.split("/"):
            if p == "." or not p:
                continue
            elif p == "..":
                if parts:
                    parts.pop()
            else:
                parts.append(p)
        clean_target = "/".join(parts)
    except Exception:
        clean_target = import_specifier.lstrip("./")

    candidates = [
        clean_target,
        f"{clean_target}.js",
        f"{clean_target}.jsx",
        f"{clean_target}.mjs",
        f"{clean_target}.cjs",
        f"{clean_target}.ts",
        f"{clean_target}.tsx",
        f"{clean_target}.mts",
        f"{clean_target}.cts",
        f"{clean_target}/index.js",
        f"{clean_target}/index.jsx",
        f"{clean_target}/index.mjs",
        f"{clean_target}/index.cjs",
        f"{clean_target}/index.ts",
        f"{clean_target}/index.tsx",
        f"{clean_target}/index.mts",
        f"{clean_target}/index.cts",
    ]

    for cand in candidates:
        norm_cand = cand.strip("/")
        if norm_cand in known_paths:
            return known_paths[norm_cand]

    return None


def resolve_project_dependencies(modules: List[ModuleAnalysis]) -> List[DependencyEdge]:
    """
    Resolves cross-file local dependencies and external package edges across all project modules.
    Returns list of deterministic DependencyEdge objects.
    """
    # Build lookup dictionary: normalized_relative_path -> module_id
    known_paths: Dict[str, str] = {}
    for mod in modules:
        norm_p = mod.relative_path.replace("\\", "/").strip("/")
        known_paths[norm_p] = mod.module_id

    edges: List[DependencyEdge] = []
    seen_edge_keys: Set[str] = set()

    for mod in modules:
        source_id = mod.module_id
        lang = mod.language

        for imp in mod.imports:
            target_id = None
            is_resolved = False

            if lang == "python":
                base_pkg = imp.module_name.split(".")[0].lstrip(".")
                if not imp.is_relative and base_pkg in PYTHON_STDLIB:
                    target_id = base_pkg
                    is_resolved = False
                else:
                    target_id = resolve_python_import(mod.relative_path, imp.module_name, imp.is_relative, known_paths)
                    if target_id:
                        is_resolved = True
                    else:
                        target_id = imp.module_name or "external"
                        is_resolved = False

            elif lang in {"javascript", "typescript"}:
                if imp.module_name in JS_BUILTINS:
                    target_id = imp.module_name
                    is_resolved = False
                elif imp.is_relative or imp.module_name.startswith("."):
                    target_id = resolve_javascript_import(mod.relative_path, imp.module_name, known_paths)
                    if target_id:
                        is_resolved = True
                    else:
                        target_id = imp.module_name
                        is_resolved = False
                else:
                    target_id = imp.module_name
                    is_resolved = False

            edge_type = getattr(imp, "import_kind", "import") or "import"
            edge_id = generate_edge_id(source_id, target_id, edge_type, imp.source_line)

            edge_key = f"{source_id}->{target_id}:{edge_type}:{imp.source_line}"
            if edge_key not in seen_edge_keys:
                seen_edge_keys.add(edge_key)
                edges.append(
                    DependencyEdge(
                        edge_id=edge_id,
                        source_module_id=source_id,
                        target_module_id=target_id,
                        type=edge_type,
                        resolved=is_resolved,
                        source_line=imp.source_line,
                    )
                )

    return sorted(edges, key=lambda e: (e.source_module_id, e.target_module_id, e.source_line))
