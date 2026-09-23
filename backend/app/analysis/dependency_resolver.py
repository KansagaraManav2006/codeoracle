import logging
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

from app.analysis.graph_models import UnresolvedDependency
from app.analysis.models import DependencyEdge, ModuleAnalysis, generate_edge_id

logger = logging.getLogger(__name__)

# Standard library module names to avoid false positive local matching
PYTHON_STDLIB = {
    "os", "sys", "re", "json", "math", "time", "datetime", "hashlib", "io",
    "pathlib", "shutil", "subprocess", "logging", "typing", "collections",
    "dataclasses", "unittest", "asyncio", "ast", "tokenize", "uuid", "random",
    "sqlite3", "urllib", "copy", "inspect", "functools", "itertools", "concurrent",
    "threading", "queue", "tempfile", "traceback", "contextlib", "abc", "enum",
    "shlex", "base64", "binascii", "csv", "xml", "html", "http", "socket"
}

JS_BUILTINS = {
    "fs", "path", "http", "https", "events", "util", "stream", "crypto",
    "buffer", "child_process", "os", "url", "querystring", "net", "tls",
    "zlib", "assert", "dns", "cluster", "readline", "vm"
}

KNOWN_EXTERNAL_PKGS = {
    "react", "react-dom", "vue", "angular", "svelte", "express", "fastify",
    "axios", "lodash", "zustand", "redux", "tailwindcss", "vite", "webpack",
    "lucide-react", "clsx", "tailwind-merge", "d3", "d3-force", "d3-quadtree",
    "@xyflow/react", "fastapi", "pydantic", "sqlalchemy", "alembic", "pytest",
    "uvicorn", "starlette", "httpx", "requests", "numpy", "pandas", "scipy",
    "torch", "tensorflow", "sklearn", "celery", "redis", "click", "typer"
}


def _expand_candidates(target_base: str) -> List[str]:
    """Generates all standard JS/TS candidate filenames and index files."""
    clean = target_base.replace("\\", "/").strip("/")
    return [
        clean,
        f"{clean}.ts",
        f"{clean}.tsx",
        f"{clean}.js",
        f"{clean}.jsx",
        f"{clean}.mjs",
        f"{clean}.cjs",
        f"{clean}.mts",
        f"{clean}.cts",
        f"{clean}.json",
        f"{clean}/index.ts",
        f"{clean}/index.tsx",
        f"{clean}/index.js",
        f"{clean}/index.jsx",
        f"{clean}/index.mjs",
        f"{clean}/index.cjs",
    ]


def _discover_project_roots(known_paths: Dict[str, str]) -> List[str]:
    """Discovers project source roots from existing file paths (e.g. backend/, src/, frontend/src/)."""
    roots: Set[str] = {""}
    for p in known_paths:
        parts = p.split("/")
        # Check standard folder prefixes
        if len(parts) > 1:
            roots.add(parts[0])
        if len(parts) > 2:
            roots.add(f"{parts[0]}/{parts[1]}")
        if len(parts) > 3:
            roots.add(f"{parts[0]}/{parts[1]}/{parts[2]}")

    # Prioritize standard roots
    ordered_roots = sorted(
        list(roots),
        key=lambda r: (
            0 if r in ("backend/app", "src", "frontend/src", "backend", "frontend", "app") else 1,
            -len(r),
            r,
        ),
    )
    return ordered_roots


def resolve_python_import(
    source_rel_path: str,
    module_name: str,
    is_relative: bool,
    known_paths: Dict[str, str],  # normalized_path -> module_id
    imported_symbols: Optional[List[str]] = None,
) -> Optional[str]:
    """
    Resolves Python import to local project module_id if present.
    Supports multi-root package resolution, relative imports, and submodule resolution.
    """
    if not module_name and not is_relative:
        return None

    source_dir = Path(source_rel_path.replace("\\", "/")).parent.as_posix()
    if source_dir == ".":
        source_dir = ""

    # 1. Relative Imports (.database, ..core.cache, from . import models)
    if is_relative or module_name.startswith("."):
        clean_mod = module_name or ""
        dots_count = len(clean_mod) - len(clean_mod.lstrip("."))
        target_name = clean_mod.lstrip(".")

        cur_parts = [p for p in source_dir.split("/") if p]
        pop_count = max(dots_count - 1, 0)
        if pop_count <= len(cur_parts):
            base_dir_parts = cur_parts[: len(cur_parts) - pop_count] if pop_count > 0 else cur_parts
        else:
            base_dir_parts = []

        base_dir = "/".join(base_dir_parts)
        target_parts = [p for p in target_name.split(".") if p]

        candidates: List[str] = []
        if target_parts:
            rel_target = f"{base_dir}/{'/'.join(target_parts)}" if base_dir else "/".join(target_parts)
            candidates.extend([f"{rel_target}.py", f"{rel_target}/__init__.py"])
        else:
            # from . import foo -> target_name is empty, symbol might be submodule
            if imported_symbols:
                for sym in imported_symbols:
                    if sym != "*":
                        sym_target = f"{base_dir}/{sym}" if base_dir else sym
                        candidates.extend([f"{sym_target}.py", f"{sym_target}/__init__.py"])
            if base_dir:
                candidates.append(f"{base_dir}/__init__.py")

        for cand in candidates:
            norm_cand = cand.strip("/")
            if norm_cand in known_paths:
                return known_paths[norm_cand]

        return None

    # 2. Absolute Package Imports (app.services.forecast, services.forecast, app.models)
    rel_target = module_name.replace(".", "/")
    target_parts = rel_target.split("/")

    # Discovered package roots
    discovered_roots = _discover_project_roots(known_paths)

    for root in discovered_roots:
        prefix = f"{root}/" if root else ""
        cands = [
            f"{prefix}{rel_target}.py",
            f"{prefix}{rel_target}/__init__.py",
        ]
        # Also check if target_parts match any suffix of root + target
        for cand in cands:
            norm_cand = cand.strip("/")
            if norm_cand in known_paths:
                return known_paths[norm_cand]

        # Check if imported_symbols are submodules (e.g. from app.services import forecast)
        if imported_symbols:
            for sym in imported_symbols:
                if sym != "*":
                    sym_cands = [
                        f"{prefix}{rel_target}/{sym}.py",
                        f"{prefix}{rel_target}/{sym}/__init__.py",
                    ]
                    for cand in sym_cands:
                        norm_cand = cand.strip("/")
                        if norm_cand in known_paths:
                            return known_paths[norm_cand]

    # Check if target matches anywhere in known_paths as a suffix
    for norm_p, mod_id in known_paths.items():
        if norm_p.endswith(f"/{rel_target}.py") or norm_p.endswith(f"/{rel_target}/__init__.py") or norm_p == f"{rel_target}.py":
            return mod_id

    return None


def resolve_javascript_import(
    source_rel_path: str,
    import_specifier: str,
    known_paths: Dict[str, str],  # normalized_path -> module_id
) -> Optional[str]:
    """
    Resolves JavaScript/TypeScript import/require specifier to local project module_id.
    Supports baseUrl, tsconfig/Vite paths (@/*, ~/*, #/*), relative paths, and extension/index inference.
    """
    if not import_specifier:
        return None

    clean_spec = import_specifier.strip().strip("'\"")

    # 1. Alias Resolution (@/*, ~/*, #/*, ~components, @components)
    alias_prefixes = [
        "src/",
        "frontend/src/",
        "client/src/",
        "web/src/",
        "app/",
        "frontend/app/",
        "",
    ]

    sub_path = None
    if clean_spec.startswith(("@/", "~/", "#/")):
        sub_path = clean_spec[2:]
    elif clean_spec.startswith("~") and len(clean_spec) > 1 and clean_spec[1] != "/":
        sub_path = clean_spec[1:]
    elif clean_spec.startswith("@") and "/" in clean_spec and not clean_spec.startswith(("@xyflow", "@vitejs", "@types")):
        # e.g. @components/Button -> components/Button
        parts = clean_spec.split("/", 1)
        sub_path = parts[1]

    if sub_path is not None:
        for prefix in alias_prefixes:
            for cand in _expand_candidates(f"{prefix}{sub_path}"):
                norm_cand = cand.strip("/")
                if norm_cand in known_paths:
                    return known_paths[norm_cand]
        return None

    # 2. Relative Import Resolution (./ or ../)
    if clean_spec.startswith("."):
        source_dir = Path(source_rel_path.replace("\\", "/")).parent.as_posix()
        try:
            parts = [p for p in source_dir.split("/") if p and p != "."]
            for segment in clean_spec.split("/"):
                if segment in (".", ""):
                    continue
                elif segment == "..":
                    if parts:
                        parts.pop()
                else:
                    parts.append(segment)
            clean_target = "/".join(parts)
        except Exception:
            clean_target = clean_spec.lstrip("./")

        for cand in _expand_candidates(clean_target):
            norm_cand = cand.strip("/")
            if norm_cand in known_paths:
                return known_paths[norm_cand]
        return None

    # 3. BaseUrl / Prefix Resolution (e.g. baseUrl='src' or baseUrl='frontend/src')
    discovered_roots = _discover_project_roots(known_paths)
    for root in discovered_roots:
        prefix = f"{root}/" if root else ""
        for cand in _expand_candidates(f"{prefix}{clean_spec}"):
            norm_cand = cand.strip("/")
            if norm_cand in known_paths:
                return known_paths[norm_cand]

    return None


def classify_unresolved_import(
    raw_target: str,
    source_path: str,
    source_lang: str,
    parse_status: str,
    is_dynamic: bool,
) -> Tuple[str, str]:
    """
    Classifies an unresolved import into a strict diagnostic category and user-friendly label.
    Categories: ts_alias, python_relative, dynamic_import, generated, syntax_error, external, unknown.
    """
    target = (raw_target or "").strip()
    lower_target = target.lower()

    if is_dynamic or "import(" in target:
        return "dynamic_import", "Dynamic runtime import requiring runtime evaluation"

    if target.startswith(("@/", "~/", "#/")) or (source_lang in ("javascript", "typescript") and target.startswith("@") and "/" in target):
        return "ts_alias", "TypeScript/Vite path alias requiring tsconfig/vite.config path mapping"

    if any(tok in lower_target for tok in ("generated", ".generated.", "_pb2", "openapi", "graphql")):
        return "generated", "Build-time or code-generated artifact"

    if parse_status in ("partial", "failed", "unsupported"):
        return "syntax_error", "Source file syntax errors prevented complete import extraction"

    if source_lang == "python":
        if target.startswith(".") or target.startswith("app.") or (
            "/" not in target and "." in target and not any(target.startswith(p) for p in ("os", "sys", "json", "math", "re", "typing"))
        ):
            return "python_relative", "Python relative / repository package root resolution"

    # Known third-party packages or bare specifiers without path markers
    first_token = target.split("/")[0].split(".")[0]
    if first_token in PYTHON_STDLIB or first_token in JS_BUILTINS or first_token in KNOWN_EXTERNAL_PKGS or (
        not target.startswith((".", "@/", "~/", "#/")) and "/" not in target and "." not in target
    ):
        return "external", "External third-party package or runtime library"

    return "unknown", "Unresolved module reference"


def resolve_project_dependencies_with_diagnostics(
    modules: List[ModuleAnalysis],
) -> Tuple[List[DependencyEdge], List[UnresolvedDependency]]:
    """
    Resolves cross-file local dependencies and external package edges across all project modules.
    Returns:
      1. Sorted list of deterministic DependencyEdge objects.
      2. Categorized list of UnresolvedDependency objects.
    """
    # Build lookup dictionary: normalized_relative_path -> module_id
    known_paths: Dict[str, str] = {}
    modules_by_id: Dict[str, ModuleAnalysis] = {}
    for mod in modules:
        norm_p = mod.relative_path.replace("\\", "/").strip("/")
        known_paths[norm_p] = mod.module_id
        modules_by_id[mod.module_id] = mod

    edges: List[DependencyEdge] = []
    unresolved_deps: List[UnresolvedDependency] = []
    seen_edge_keys: Set[str] = set()

    for mod in modules:
        source_id = mod.module_id
        source_path = mod.relative_path
        lang = mod.language

        for imp in mod.imports:
            raw_target = imp.module_name or ""
            target_id: Optional[str] = None
            is_resolved = False

            if lang == "python":
                base_pkg = raw_target.split(".")[0].lstrip(".")
                if not imp.is_relative and base_pkg in PYTHON_STDLIB:
                    target_id = base_pkg
                    is_resolved = False
                else:
                    target_id = resolve_python_import(
                        source_path,
                        raw_target,
                        imp.is_relative,
                        known_paths,
                        imported_symbols=imp.imported_symbols,
                    )
                    if target_id:
                        is_resolved = True
                    else:
                        target_id = raw_target or "external"
                        is_resolved = False

            elif lang in ("javascript", "typescript"):
                if raw_target in JS_BUILTINS:
                    target_id = raw_target
                    is_resolved = False
                else:
                    target_id = resolve_javascript_import(source_path, raw_target, known_paths)
                    if target_id:
                        is_resolved = True
                    else:
                        target_id = raw_target
                        is_resolved = False

            # Semantic edge kind
            raw_kind = getattr(imp, "import_kind", "import") or "import"
            is_type_only = bool(getattr(imp, "is_type_only", False))
            is_dynamic = bool(getattr(imp, "is_dynamic", False))

            if is_type_only:
                kind = "type_only_import"
            elif is_dynamic or raw_kind == "dynamic_import":
                kind = "dynamic_import"
            elif raw_kind == "require":
                kind = "require"
            elif raw_kind == "re_export":
                kind = "re_export"
            else:
                kind = "runtime_import"

            confidence = "high" if is_resolved else "medium"
            edge_id = generate_edge_id(source_id, target_id, kind, imp.source_line)
            edge_key = f"{source_id}->{target_id}:{kind}:{is_type_only}:{is_dynamic}:{imp.source_line}"

            if edge_key not in seen_edge_keys:
                seen_edge_keys.add(edge_key)
                edges.append(
                    DependencyEdge(
                        edge_id=edge_id,
                        source_module_id=source_id,
                        target_module_id=target_id,
                        type=raw_kind,
                        kind=kind,
                        confidence=confidence,
                        raw_import=raw_target,
                        resolved=is_resolved,
                        source_line=imp.source_line,
                        is_type_only=is_type_only,
                        is_dynamic=is_dynamic,
                    )
                )

            # Record unresolved local imports separately from external packages
            if not is_resolved:
                reason_key, reason_label = classify_unresolved_import(
                    raw_target=raw_target,
                    source_path=source_path,
                    source_lang=lang,
                    parse_status=mod.parse_status,
                    is_dynamic=is_dynamic,
                )
                if reason_key != "external":
                    unresolved_deps.append(
                        UnresolvedDependency(
                            source=source_id,
                            source_path=source_path,
                            raw_import=raw_target,
                            reason_key=reason_key,
                            reason_label=reason_label,
                            line=imp.source_line,
                        )
                    )

    sorted_edges = sorted(edges, key=lambda e: (e.source_module_id, e.target_module_id, e.source_line))
    sorted_unresolved = sorted(unresolved_deps, key=lambda u: (u.source_path, u.line, u.raw_import))
    return sorted_edges, sorted_unresolved


def resolve_project_dependencies(modules: List[ModuleAnalysis]) -> List[DependencyEdge]:
    """Resolves cross-file dependencies and returns list of DependencyEdge objects."""
    edges, _ = resolve_project_dependencies_with_diagnostics(modules)
    return edges


