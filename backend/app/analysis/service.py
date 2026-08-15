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
from app.analysis.explanations import (
    generate_module_explanation,
    generate_project_explanation,
    generate_symbol_explanation,
)
from app.analysis.javascript_analyzer import analyze_javascript_source
from app.analysis.models import (
    ANALYZER_VERSION,
    ModuleAnalysis,
    ProjectAnalysis,
    WarningInfo,
    generate_module_id,
)
from app.analysis.python_analyzer import analyze_python_source
from app.config import settings
from app.database import SessionLocal
from app.ingestion.workspace import get_workspace_dir
from app.models.db import Job, JobState, Project, ProjectAnalysisRecord, ProjectFile

logger = logging.getLogger(__name__)


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

    project_warnings: List[WarningInfo] = []
    for m in modules:
        for w in m.legacy_warnings:
            project_warnings.append(w)
        for err in m.parse_errors:
            project_warnings.append(WarningInfo(code="PARSE_ERROR", message=f"{m.relative_path}: {err}", severity="risk"))

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
