import logging
import os
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional
from sqlalchemy.orm import Session

from app.analysis.dependency_resolver import resolve_project_dependencies
from app.analysis.graph_service import find_directed_cycles
from app.analysis.explanations import (
    generate_module_explanation,
    generate_project_explanation,
    generate_symbol_explanation,
)
from app.analysis.javascript_analyzer import analyze_javascript_source
from app.analysis.models import (
    ANALYZER_VERSION,
    Finding,
    ModuleAnalysis,
    ProjectAnalysis,
    WarningInfo,
    generate_finding_id,
    generate_module_id,
    summarize_findings,
)
from app.analysis.python_analyzer import analyze_python_source
from app.config import settings
from app.database import SessionLocal
from app.ingestion.workspace import get_workspace_dir
from app.models.db import Job, JobState, Project, ProjectAnalysisRecord, ProjectFile

logger = logging.getLogger(__name__)


AUTO_DIFF_RULE_IDS = {
    "PY2_XRANGE",
    "PY2_PRINT",
    "PY2_EXCEPT",
    "PY2_RAW_INPUT",
    "PY2_UNICODE",
    "PY2_BASESTRING",
    "PY2_ITERITEMS",
    "PY2_ITERKEYS",
    "PY2_ITERVALUES",
    "LEGACY_PYTHON2_CONSTRUCT",
    "LEGACY_PYTHON2_PRINT",
    "VAR_USAGE",
    "JS_VAR_DECLARATION",
}


def _finding_category(rule_id: str) -> str:
    if rule_id in ("PARSE_ERROR", "SYNTAX_ERROR"):
        return "analysis"
    if any(token in rule_id for token in ("EVAL", "EXEC", "FUNCTION")):
        return "security"
    if rule_id in ("DEPENDENCY_CYCLE", "CIRCULAR_DEPENDENCY"):
        return "dependency"
    if rule_id in ("HIGH_COMPLEXITY",):
        return "complexity"
    return "modernization"


def build_analysis_findings(
    project_id: str,
    modules: List[ModuleAnalysis],
    dependency_edges,
) -> List[Finding]:
    """Translate deterministic analyzer warnings into a shared finding contract."""
    paths_by_id = {module.module_id: module.relative_path for module in modules}
    dependencies_by_id: Dict[str, List[str]] = {module.module_id: [] for module in modules}
    for edge in dependency_edges:
        if edge.resolved and edge.source_module_id in dependencies_by_id:
            target = paths_by_id.get(edge.target_module_id)
            if target:
                dependencies_by_id[edge.source_module_id].append(target)

    findings: List[Finding] = []
    seen_ids = set()
    for module in modules:
        warning_sources = list(module.legacy_warnings)
        warning_sources.extend(
            WarningInfo(code="PARSE_ERROR", message=error, severity="risk")
            for error in module.parse_errors
        )
        for symbol in [*module.classes, *module.functions, *module.variables]:
            warning_sources.extend(symbol.legacy_warnings)

        for warning in warning_sources:
            category = _finding_category(warning.code)
            finding_id = generate_finding_id(
                project_id, warning.code, module.relative_path, warning.line, category,
            )
            if finding_id in seen_ids:
                continue
            seen_ids.add(finding_id)
            findings.append(Finding(
                id=finding_id,
                rule_id=warning.code,
                file=module.relative_path,
                line=warning.line,
                severity=warning.severity,
                category=category,
                message=warning.message,
                evidence=f"Static analysis detected {warning.code} in {module.relative_path}.",
                confidence="static",
                autofixable=warning.code in AUTO_DIFF_RULE_IDS,
                related_dependencies=sorted(set(dependencies_by_id.get(module.module_id, []))),
                suggested_tests=[f"Generate characterization tests for {module.relative_path}"],
            ))
    module_ids = set(paths_by_id)
    runtime_edge_pairs = []
    for edge in dependency_edges:
        if (
            edge.resolved
            and edge.source_module_id in module_ids
            and edge.target_module_id in module_ids
            and not getattr(edge, "is_type_only", False)
        ):
            src_p = paths_by_id.get(edge.source_module_id, "")
            tgt_p = paths_by_id.get(edge.target_module_id, "")
            src_name = Path(src_p.replace("\\", "/")).name
            tgt_name = Path(tgt_p.replace("\\", "/")).name
            src_parent = Path(src_p.replace("\\", "/")).parent.as_posix()
            tgt_parent = Path(tgt_p.replace("\\", "/")).parent.as_posix()
            is_reexport = (
                (src_name in ("__init__.py", "index.ts", "index.js", "index.tsx") and tgt_parent == src_parent)
                or (tgt_name in ("__init__.py", "index.ts", "index.js", "index.tsx") and src_parent == tgt_parent)
            )
            if not is_reexport:
                runtime_edge_pairs.append((edge.source_module_id, edge.target_module_id))

    cycles = find_directed_cycles(module_ids, runtime_edge_pairs)
    for cycle in cycles:
        cycle_paths = [paths_by_id[module_id] for module_id in cycle if module_id in paths_by_id]
        if not cycle_paths:
            continue
        file = cycle_paths[0]
        findings.append(Finding(
            id=generate_finding_id(project_id, "DEPENDENCY_CYCLE", file, None, "dependency"),
            rule_id="DEPENDENCY_CYCLE",
            file=file,
            severity="risk",
            category="dependency",
            message="A circular dependency can make modernization order-sensitive.",
            evidence=f"Static dependency traversal found the cycle: {' → '.join(cycle_paths)}.",
            confidence="static",
            related_dependencies=sorted(set(cycle_paths)),
            suggested_tests=[f"Generate characterization tests for {path}" for path in sorted(set(cycle_paths))],
        ))
    return sorted(findings, key=lambda item: (item.file, item.line or 0, item.rule_id, item.id))


def analysis_languages_are_current(analysis: ProjectAnalysis, project_files: List[ProjectFile]) -> bool:
    """Detect persisted analyses made before TypeScript language preservation."""
    expected_by_path = {project_file.relative_path: project_file.language for project_file in project_files}
    return all(
        expected_by_path.get(module.relative_path, module.language) == module.language
        for module in analysis.modules
    )


def process_analysis_job(job_id: str, project_id: str, force: bool = False) -> None:
    """
    Background worker for executing static analysis jobs asynchronously.
    Creates and closes its own independent database session.
    """
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return

        job.state = JobState.ANALYZING
        job.stage = "Analyzing static AST and dependencies..."
        job.progress_percentage = 50
        job.updated_at = datetime.now(timezone.utc)
        db.commit()

        run_analysis_for_project(db, project_id, force=force)

        job.state = JobState.COMPLETED
        job.stage = "Completed"
        job.progress_percentage = 100
        job.message = "Static code analysis complete."
        job.updated_at = datetime.now(timezone.utc)
        db.commit()

    except Exception as e:
        db.rollback()
        logger.exception("Failed to run analysis job %s for project %s", job_id, project_id)
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.state = JobState.FAILED
            job.stage = "Failed"
            job.error_code = "ANALYSIS_FAILED"
            job.error_message = "Internal file-analysis failure."
            job.updated_at = datetime.now(timezone.utc)
            db.commit()
    finally:
        db.close()


def _analyze_single_file(project_id: str, rel_path: str, abs_path: Path, lang: str) -> ModuleAnalysis:
    """Worker function for analyzing a single source file."""
    if lang == "python":
        mod = analyze_python_source(project_id, rel_path, abs_path)
    elif lang in ("javascript", "typescript"):
        mod = analyze_javascript_source(project_id, rel_path, abs_path, language=lang)
    else:
        mod = ModuleAnalysis(
            module_id=generate_module_id(project_id, rel_path),
            relative_path=rel_path,
            language=lang,
            line_count=0,
            parse_status="failed",
            parse_errors=["Internal file-analysis failure."],
        )

    # Attach symbol explanations
    for cls_sym in mod.classes:
        cls_sym.explanation = generate_symbol_explanation(cls_sym)
    for fn_sym in mod.functions:
        fn_sym.explanation = generate_symbol_explanation(fn_sym)
    for var_sym in mod.variables:
        var_sym.explanation = generate_symbol_explanation(var_sym)

    # Attach module explanation
    mod.explanation = generate_module_explanation(mod)

    return mod


def run_analysis_for_project(
    db: Session,
    project_id: str,
    force: bool = False,
) -> ProjectAnalysis:
    """
    Orchestrates deterministic static analysis for a project.
    Supports thread-pool parallel file parsing, dependency resolution, caching, and DB persistence.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError(f"Project '{project_id}' not found.")

    # 1. Cache Check (if force is False)
    if not force:
        cached_record = (
            db.query(ProjectAnalysisRecord)
            .filter(
                ProjectAnalysisRecord.project_id == project_id,
                ProjectAnalysisRecord.analyzer_version == ANALYZER_VERSION,
                ProjectAnalysisRecord.content_hash == project.content_hash,
            )
            .first()
        )
        if cached_record:
            try:
                result = ProjectAnalysis.model_validate(cached_record.analysis_data)
                result.cache_status = "hit"
                logger.info("Returned cached analysis for project %s [hash: %s]", project_id, project.content_hash[:8])
                return result
            except Exception as e:
                logger.warning("Failed to deserialize cached analysis record for %s: %s", project_id, str(e))

    # 2. Execute Fresh Analysis
    start_time = time.perf_counter()
    workspace_raw_dir = get_workspace_dir(project.workspace_id) / "raw"
    raw_workspace_resolved = workspace_raw_dir.resolve()

    project_files = db.query(ProjectFile).filter(ProjectFile.project_id == project_id).all()

    # Bounded ThreadPoolExecutor
    max_workers = min(8, max(os.cpu_count() or 4, 1))
    modules: List[ModuleAnalysis] = []

    valid_files_to_submit = []
    for pf in project_files:
        norm_rel = os.path.normpath(pf.relative_path).replace("\\", "/")
        if norm_rel.startswith("../") or norm_rel.startswith("/") or ".." in norm_rel.split("/"):
            logger.warning("Rejected traversal relative path '%s' for project %s", pf.relative_path, project_id)
            modules.append(
                ModuleAnalysis(
                    module_id=generate_module_id(project_id, pf.relative_path),
                    relative_path=pf.relative_path,
                    language=pf.language,
                    line_count=0,
                    parse_status="failed",
                    parse_errors=["Internal file-analysis failure."],
                )
            )
            continue

        abs_p = (workspace_raw_dir / norm_rel).resolve()
        try:
            is_inside = abs_p.is_relative_to(raw_workspace_resolved)
        except AttributeError:
            is_inside = str(abs_p).startswith(str(raw_workspace_resolved))

        if not is_inside:
            logger.warning("Rejected traversal path outside workspace '%s'", abs_p)
            modules.append(
                ModuleAnalysis(
                    module_id=generate_module_id(project_id, pf.relative_path),
                    relative_path=pf.relative_path,
                    language=pf.language,
                    line_count=0,
                    parse_status="failed",
                    parse_errors=["Internal file-analysis failure."],
                )
            )
            continue

        valid_files_to_submit.append((pf, abs_p))

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {}
        for pf, abs_p in valid_files_to_submit:
            f = executor.submit(_analyze_single_file, project_id, pf.relative_path, abs_p, pf.language)
            futures[f] = pf.relative_path

        for f in as_completed(futures):
            rel_p = futures[f]
            try:
                mod = f.result()
                modules.append(mod)
            except Exception as e:
                logger.exception("File analysis thread exception for %s", rel_p)
                modules.append(
                    ModuleAnalysis(
                        module_id=generate_module_id(project_id, rel_p),
                        relative_path=rel_p,
                        language="unknown",
                        line_count=0,
                        parse_status="failed",
                        parse_errors=["Internal file-analysis failure."],
                    )
                )

    # Sort modules deterministically by relative path
    modules.sort(key=lambda m: m.relative_path)

    # 3. Cross-File Dependency Resolution
    dependency_edges = resolve_project_dependencies(modules)

    # 4. Success / Partial / Failure Counts & Project Warnings
    success_count = sum(1 for m in modules if m.parse_status == "complete")
    partial_count = sum(1 for m in modules if m.parse_status == "partial")
    failure_count = sum(1 for m in modules if m.parse_status == "failed")

    entry_points = [m.relative_path for m in modules if m.is_entry_point]

    findings = build_analysis_findings(project_id, modules, dependency_edges)
    project_warnings: List[WarningInfo] = [
        WarningInfo(code=f.rule_id, message=f.message, line=f.line, severity=f.severity)
        for f in findings
    ]

    duration_ms = (time.perf_counter() - start_time) * 1000.0

    detected_langs = sorted(list({m.language for m in modules if m.language != "unknown"}))

    analysis_res = ProjectAnalysis(
        project_id=project_id,
        analyzer_version=ANALYZER_VERSION,
        content_hash=project.content_hash,
        analyzed_at=datetime.now(timezone.utc),
        languages=detected_langs,
        total_files=len(modules),
        total_lines=sum(m.line_count for m in modules),
        modules=modules,
        dependency_edges=dependency_edges,
        entry_points=entry_points,
        project_warnings=project_warnings,
        findings=findings,
        finding_funnel=summarize_findings(findings),
        parse_success_count=success_count,
        parse_partial_count=partial_count,
        parse_failure_count=failure_count,
        analysis_duration_ms=round(duration_ms, 2),
        cache_status="forced" if force else "miss",
    )

    # Attach Project-level explanation
    analysis_res.explanation = generate_project_explanation(analysis_res)

    # 5. Persist to Database
    try:
        db.query(ProjectAnalysisRecord).filter(ProjectAnalysisRecord.project_id == project_id).delete()

        rec_id = f"analysis_{project_id}"
        analysis_dict = analysis_res.model_dump(mode="json")

        record = ProjectAnalysisRecord(
            id=rec_id,
            project_id=project_id,
            analyzer_version=ANALYZER_VERSION,
            content_hash=project.content_hash,
            analysis_data=analysis_dict,
            created_at=datetime.now(timezone.utc),
        )

        db.add(record)
        db.commit()

    except Exception as e:
        db.rollback()
        logger.exception("Failed to persist project analysis record for %s", project_id)

    return analysis_res
