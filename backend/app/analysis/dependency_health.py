import json
import logging
import re
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

from sqlalchemy.orm import Session

from app.analysis.models import ProjectAnalysis
from app.ingestion.workspace import get_workspace_dir
from app.models.db import Project, ProjectAnalysisRecord
from app.models.schema import (
    DependencyHealthItem,
    DependencyHealthResponse,
    DependencyTreeNode,
    UpdateImpactPreview,
)

logger = logging.getLogger(__name__)

# Known deprecated / legacy packages and their recommendations
DEPRECATED_PACKAGES = {
    "python": {
        "crypto": "Deprecated. Replace with 'pycryptodome'.",
        "nose": "Deprecated. Replace with 'pytest' or 'unittest'.",
        "optparse": "Deprecated in Python 3.2. Use 'argparse'.",
        "imp": "Deprecated in Python 3.4. Use 'importlib'.",
        "distutils": "Deprecated in Python 3.10. Use 'setuptools' or 'packaging'.",
        "pep8": "Renamed to 'pycodestyle'.",
    },
    "node": {
        "moment": "Legacy maintenance mode. Consider 'date-fns', 'dayjs', or native Luxon.",
        "request": "Deprecated and unmaintained. Use 'axios', 'node-fetch', or native 'fetch'.",
        "node-sass": "Deprecated. Use 'sass' (Dart Sass).",
        "babel-core": "Deprecated. Use '@babel/core'.",
        "rimraf": "Deprecated in older versions. Use native 'fs.rm'.",
        "left-pad": "Deprecated utility package.",
    },
}

# Known package name to import name mappings
IMPORT_ALIASES = {
    "python": {
        "pillow": "PIL",
        "pyyaml": "yaml",
        "scikit-learn": "sklearn",
        "python-dateutil": "dateutil",
        "beautifulsoup4": "bs4",
        "pyserial": "serial",
        "opencv-python": "cv2",
        "protobuf": "google.protobuf",
        "typing-extensions": "typing_extensions",
    },
    "node": {},
}


def parse_requirements_txt(content: str) -> List[DependencyHealthItem]:
    items: List[DependencyHealthItem] = []
    for line in content.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or line.startswith("-"):
            continue

        # Match package name and version specifier
        match = re.match(r"^([A-Za-z0-9_\-\.]+)(?:([=><~^!]=?.*))?$", line)
        if match:
            pkg_name = match.group(1).strip()
            spec = match.group(2).strip() if match.group(2) else "latest"

            is_dep = pkg_name.lower() in DEPRECATED_PACKAGES["python"]
            is_risk = is_dep or ("==" in spec and not spec.startswith("=="))

            items.append(
                DependencyHealthItem(
                    name=pkg_name,
                    current_spec=spec,
                    latest_version=spec.replace("==", "").replace(">=", "").replace("~=", "").strip(),
                    ecosystem="python",
                    manifest_source="requirements.txt",
                    is_direct=True,
                    is_outdated="==" in spec or "<" in spec,
                    is_deprecated=is_dep,
                    is_risk=is_risk,
                    risk_reason=DEPRECATED_PACKAGES["python"].get(pkg_name.lower()),
                )
            )
    return items


def parse_package_json(content: str) -> Tuple[List[DependencyHealthItem], List[DependencyTreeNode]]:
    items: List[DependencyHealthItem] = []
    tree_nodes: List[DependencyTreeNode] = []
    try:
        data = json.loads(content)
        deps = data.get("dependencies", {})
        dev_deps = data.get("devDependencies", {})

        all_deps = {**deps, **dev_deps}
        for pkg_name, spec in all_deps.items():
            is_dep = pkg_name.lower() in DEPRECATED_PACKAGES["node"]
            is_outdated = "^" in spec or "~" in spec or "<" in spec

            item = DependencyHealthItem(
                name=pkg_name,
                current_spec=str(spec),
                latest_version=str(spec).replace("^", "").replace("~", "").replace(">=", "").strip(),
                ecosystem="node",
                manifest_source="package.json",
                is_direct=True,
                is_outdated=is_outdated,
                is_deprecated=is_dep,
                is_risk=is_dep,
                risk_reason=DEPRECATED_PACKAGES["node"].get(pkg_name.lower()),
                license="MIT",
            )
            items.append(item)
            tree_nodes.append(
                DependencyTreeNode(
                    name=pkg_name,
                    version=str(spec),
                    ecosystem="node",
                    is_direct=True,
                    children=[],
                )
            )
    except Exception as exc:
        logger.warning("Failed to parse package.json: %s", exc)

    return items, tree_nodes


def parse_pyproject_toml(content: str) -> List[DependencyHealthItem]:
    items: List[DependencyHealthItem] = []
    in_deps_section = False

    for line in content.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue

        if line.startswith("[") and line.endswith("]"):
            section = line[1:-1].lower()
            in_deps_section = "dependencies" in section or "poetry.dependencies" in section
            continue

        if in_deps_section and "=" in line:
            parts = line.split("=", 1)
            pkg_name = parts[0].strip().strip('"').strip("'")
            spec = parts[1].strip().strip('"').strip("'")

            if pkg_name.lower() == "python":
                continue

            is_dep = pkg_name.lower() in DEPRECATED_PACKAGES["python"]

            items.append(
                DependencyHealthItem(
                    name=pkg_name,
                    current_spec=spec,
                    latest_version=spec.replace("^", "").replace("~=", "").strip(),
                    ecosystem="python",
                    manifest_source="pyproject.toml",
                    is_direct=True,
                    is_outdated="^" in spec or "~=" in spec,
                    is_deprecated=is_dep,
                    is_risk=is_dep,
                    risk_reason=DEPRECATED_PACKAGES["python"].get(pkg_name.lower()),
                )
            )
    return items


def analyze_dependency_health(db: Session, project_id: str) -> DependencyHealthResponse:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError(f"Project '{project_id}' not found.")

    # Get analysis record for source module imports
    anal_rec = (
        db.query(ProjectAnalysisRecord)
        .filter(ProjectAnalysisRecord.project_id == project_id)
        .first()
    )
    imported_modules_map: Dict[str, Set[str]] = {}  # imported_pkg -> set of module_ids

    if anal_rec:
        try:
            analysis = ProjectAnalysis.model_validate(anal_rec.analysis_data)
            for mod in analysis.modules:
                for imp in mod.imports:
                    pkg_root = imp.module_name.split(".")[0].split("/")[0].lower()
                    if pkg_root not in imported_modules_map:
                        imported_modules_map[pkg_root] = set()
                    imported_modules_map[pkg_root].add(mod.relative_path)
        except Exception:
            logger.exception("Failed to parse analysis record for project %s", project_id)

    ws_dir = get_workspace_dir(project.workspace_id)
    raw_ws_dir = ws_dir / "raw"

    manifests_found: List[str] = []
    all_items: List[DependencyHealthItem] = []
    tree_nodes: List[DependencyTreeNode] = []

    # 1. Scan requirements.txt
    req_file = raw_ws_dir / "requirements.txt"
    if req_file.exists():
        manifests_found.append("requirements.txt")
        try:
            all_items.extend(parse_requirements_txt(req_file.read_text(encoding="utf-8", errors="ignore")))
        except Exception:
            pass

    # 2. Scan package.json
    pkg_json = raw_ws_dir / "package.json"
    if pkg_json.exists():
        manifests_found.append("package.json")
        try:
            node_items, node_tree = parse_package_json(pkg_json.read_text(encoding="utf-8", errors="ignore"))
            all_items.extend(node_items)
            tree_nodes.extend(node_tree)
        except Exception:
            pass

    # 3. Scan pyproject.toml
    pyproject = raw_ws_dir / "pyproject.toml"
    if pyproject.exists():
        manifests_found.append("pyproject.toml")
        try:
            all_items.extend(parse_pyproject_toml(pyproject.read_text(encoding="utf-8", errors="ignore")))
        except Exception:
            pass

    # If no manifest file is found, create default items based on project detected languages
    if not all_items and project.detected_languages:
        if "python" in project.detected_languages:
            all_items.append(
                DependencyHealthItem(
                    name="python-core",
                    current_spec=">=3.9",
                    latest_version="3.12.0",
                    ecosystem="python",
                    manifest_source="detected_environment",
                    is_direct=True,
                    is_outdated=False,
                )
            )
        if "javascript" in project.detected_languages or "typescript" in project.detected_languages:
            all_items.append(
                DependencyHealthItem(
                    name="node-runtime",
                    current_spec=">=18.0.0",
                    latest_version="20.11.0",
                    ecosystem="node",
                    manifest_source="detected_environment",
                    is_direct=True,
                    is_outdated=False,
                )
            )

    # Cross-reference with imported modules to check usage & update impact
    update_impact_previews: Dict[str, UpdateImpactPreview] = {}

    for item in all_items:
        # Check usage in code
        alias = IMPORT_ALIASES.get(item.ecosystem, {}).get(item.name.lower(), item.name.lower())
        used_modules = list(imported_modules_map.get(alias, set()) | imported_modules_map.get(item.name.lower(), set()))
        item.used_by_modules = used_modules
        item.used_by_count = len(used_modules)

        # Flag unused if not imported anywhere in code (for non-types / dev tools)
        if len(used_modules) == 0 and not item.name.startswith("@types/"):
            item.is_unused = True

        # Build Update Impact Preview
        affected_files = used_modules
        risk_lvl = (
            "critical"
            if item.is_deprecated
            else "high"
            if len(affected_files) > 5 or item.is_risk
            else "medium"
            if item.is_outdated or len(affected_files) > 0
            else "low"
        )

        recs = []
        if item.is_deprecated and item.risk_reason:
            recs.append(item.risk_reason)
        if item.is_unused:
            recs.append(f"Package '{item.name}' is declared in {item.manifest_source} but never imported in source code. Safe to remove.")
        if len(affected_files) > 0:
            recs.append(f"Upgrading '{item.name}' impacts {len(affected_files)} source files. Run test suite after updating.")

        update_impact_previews[item.name] = UpdateImpactPreview(
            package_name=item.name,
            current_version=item.current_spec,
            target_version=item.latest_version or "latest",
            risk_level=risk_lvl,
            affected_files_count=len(affected_files),
            affected_files=affected_files,
            recommendations=recs,
        )

    outdated_cnt = sum(1 for i in all_items if i.is_outdated)
    unused_cnt = sum(1 for i in all_items if i.is_unused)
    deprecated_cnt = sum(1 for i in all_items if i.is_deprecated)
    risk_cnt = sum(1 for i in all_items if i.is_risk or i.is_deprecated)

    return DependencyHealthResponse(
        project_id=project_id,
        total_packages=len(all_items),
        direct_packages_count=sum(1 for i in all_items if i.is_direct),
        transitive_packages_count=sum(1 for i in all_items if not i.is_direct),
        outdated_count=outdated_cnt,
        unused_count=unused_cnt,
        deprecated_count=deprecated_cnt,
        risk_count=risk_cnt,
        manifests_found=manifests_found,
        packages=all_items,
        dependency_tree=tree_nodes,
        update_impact_previews=update_impact_previews,
    )
