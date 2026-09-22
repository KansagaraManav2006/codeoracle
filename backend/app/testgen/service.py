import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from app.analysis.models import ModuleAnalysis, ProjectAnalysis
from app.analysis.service import run_analysis_for_project
from app.config import settings
from app.database import SessionLocal
from app.ingestion.service import get_workspace_dir
from app.models.db import Job, JobState, Project, ProjectAnalysisRecord, ProjectTestRecord, ProjectRefactorRecord
from app.testgen.javascript_generator import generate_javascript_unit_tests
from app.testgen.models import GeneratedTestFile, ProjectTestResult, TEST_GENERATOR_VERSION
from app.testgen.python_generator import generate_python_unit_tests
from app.testgen.runner import execute_generated_tests_safely

logger = logging.getLogger(__name__)


def is_non_testable_module(module: ModuleAnalysis) -> bool:
    """Detects empty __init__.py, barrel re-export files, type-only files, or config files

    to avoid inflating test counts with spurious test suites.
    """
    rel_lower = module.relative_path.lower().replace("\\", "/")
    filename = Path(rel_lower).name

    # 1. Empty or re-export-only __init__.py
    if filename == "__init__.py":
        if len(module.functions) == 0 and len(module.classes) == 0:
            return True

    # 2. Barrel files (index.ts / index.js / index.tsx with no functions or classes)
    if filename in ("index.ts", "index.js", "index.tsx", "index.jsx"):
        if len(module.functions) == 0 and len(module.classes) == 0:
            return True

    # 3. Type-only files (.d.ts or types/interfaces files with no runtime functions/classes)
    if filename.endswith(".d.ts"):
        return True
    if (
        filename in ("types.ts", "interfaces.ts", "models.ts", "declarations.ts")
        and len(module.functions) == 0
        and len(module.classes) == 0
    ):
        return True

    # 4. Configuration-only modules
    config_prefixes = (
        "vite.config.",
        "webpack.config.",
        "next.config.",
        "jest.config.",
        "vitest.config.",
        "babel.config.",
        "tailwind.config.",
        "postcss.config.",
        "rollup.config.",
        "commitlint.config.",
        "eslint",
        "prettier.config.",
    )
    if any(filename.startswith(cfg) for cfg in config_prefixes):
        return True
    if (
        filename in ("setup.py", "pyproject.toml", "conftest.py")
        and len(module.functions) == 0
        and len(module.classes) == 0
    ):
        return True

    return False


def run_test_generation_for_project(
    db: Session,
    project_id: str,
    execute: bool = False,
    force: bool = False,
) -> ProjectTestResult:
    """Generates unit tests for a project, executes them if requested/trusted, and saves results."""
    start_time = time.time()

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError(f"Project '{project_id}' not found.")

    # Check cache
    if not force:
        cached_rec = (
            db.query(ProjectTestRecord)
            .filter(
                ProjectTestRecord.project_id == project_id,
                ProjectTestRecord.generator_version == TEST_GENERATOR_VERSION,
                ProjectTestRecord.content_hash == project.content_hash,
            )
            .first()
        )
        if cached_rec:
            try:
                res = ProjectTestResult.model_validate(cached_rec.test_data)
                # If cached result wasn't executed but execute=True was requested, proceed to execute
                if not execute or res.execution_enabled:
                    return res
            except Exception:
                logger.warning("Failed to deserialize cached test generation record for %s", project_id)

    # Ensure analysis exists
    anal_rec = (
        db.query(ProjectAnalysisRecord)
        .filter(ProjectAnalysisRecord.project_id == project_id)
        .first()
    )
    if not anal_rec:
        analysis = run_analysis_for_project(db, project_id)
    else:
        analysis = ProjectAnalysis.model_validate(anal_rec.analysis_data)

    ws_dir = get_workspace_dir(project.workspace_id)
    raw_ws_dir = ws_dir / "raw"

    # Determine execution policy
    is_trusted = bool(project.is_trusted)
    execution_allowed = bool(settings.TEST_EXECUTION_ENABLED) or is_trusted
    should_execute = bool(execute or is_trusted) and execution_allowed

    max_iterations = getattr(settings, "TEST_EXECUTION_MAX_ITERATIONS", 3)
    iteration_count = 0
    iteration_log = []

    test_files: List[GeneratedTestFile] = []
    frameworks = set()
    overall_coverage: Optional[float] = None
    per_file_cov: Dict[str, Optional[float]] = {}
    exec_warning: Optional[str] = None
    exec_duration_ms = 0

    gen_start = time.time()

    # Iterative improvement loop
    for iter_idx in range(1, max_iterations + 1):
        iteration_count = iter_idx
        current_gen_files = []

        for module in analysis.modules:
            if module.parse_status == "failed":
                continue
            # Avoid inflating counts for empty __init__.py, barrel, type-only, or config modules
            if is_non_testable_module(module):
                continue

            if module.language == "python":
                tf = generate_python_unit_tests(module, analysis)
                current_gen_files.append(tf)
                frameworks.add("pytest")
            elif module.language in ("javascript", "typescript"):
                tf = generate_javascript_unit_tests(module, analysis)
                current_gen_files.append(tf)
                frameworks.add("vitest")

        test_files = current_gen_files

        # Execute tests if enabled
        if should_execute and test_files:
            e_start = time.time()
            test_files, overall_coverage, per_file_cov, exec_warning = execute_generated_tests_safely(
                raw_ws_dir, test_files, is_trusted=is_trusted
            )
            exec_duration_ms += int((time.time() - e_start) * 1000)

        iteration_log.append({
            "iteration": iter_idx,
            "test_count": sum(tf.test_count for tf in test_files),
            "syntax_valid_count": sum(1 for tf in test_files if tf.syntax_valid),
            "overall_coverage": overall_coverage,
        })

        # Break early if target coverage achieved or execution disabled
        if not should_execute or (overall_coverage is not None and overall_coverage >= 60.0):
            break

    gen_duration_ms = int((time.time() - gen_start) * 1000)

    # Upgrade protection_type only for Python files whose coverage was actually measured.
    # JavaScript execution is not available, so JS files must never be labeled "measured".
    is_measured = overall_coverage is not None
    if is_measured:
        for tf in test_files:
            if not tf.is_import_only and tf.syntax_valid and tf.language == "python":
                tf.protection_type = "measured"

    # Compute aggregate metrics
    syntax_valid_cnt = sum(1 for tf in test_files if tf.syntax_valid)
    total_tests = sum(tf.test_count for tf in test_files)
    executed_cnt = sum(1 for tf in test_files if tf.execution_status in ("passed", "failed"))
    passed_cnt = sum(1 for tf in test_files if tf.execution_status == "passed")
    failed_cnt = sum(1 for tf in test_files if tf.execution_status == "failed")

    # Protected vs unprotected files
    protected_files = [
        tf.target_relative_path
        for tf in test_files
        if tf.syntax_valid and not tf.is_import_only
    ]
    protected_set = set(protected_files)
    unprotected_files = [
        m.relative_path
        for m in analysis.modules
        if m.relative_path not in protected_set
    ]

    # Category counts
    category_counts: Dict[str, int] = {
        "function contract test": 0,
        "error-path test": 0,
        "edge-case test": 0,
        "integration test": 0,
        "import smoke test": 0,
    }
    for tf in test_files:
        for cat in tf.test_categories:
            category_counts[cat] = category_counts.get(cat, 0) + 1

    # Strength counts
    strength_counts = {
        "syntax": sum(1 for tf in test_files if tf.strength_level == "L1" or tf.test_strength == "syntax"),
        "import": sum(1 for tf in test_files if tf.strength_level == "L2" or tf.test_strength == "import" or tf.is_import_only),
        "contract": sum(1 for tf in test_files if tf.strength_level == "L3" or tf.test_strength == "contract"),
        "behavior": sum(1 for tf in test_files if tf.strength_level == "L4" or tf.test_strength == "behavior"),
        "integration": sum(1 for tf in test_files if tf.strength_level == "L5" or tf.test_strength == "integration"),
    }

    # Archetype framework coverage
    archetype_totals: Dict[str, int] = {"react": 0, "fastapi": 0, "service": 0, "ml": 0, "generic": 0}
    archetype_protected: Dict[str, int] = {"react": 0, "fastapi": 0, "service": 0, "ml": 0, "generic": 0}

    tf_archetype_by_target = {tf.target_relative_path: tf.framework_archetype for tf in test_files}

    for m in analysis.modules:
        arch = tf_archetype_by_target.get(m.relative_path)
        if not arch:
            rel_lower = m.relative_path.lower()
            if rel_lower.endswith((".tsx", ".jsx")) or "component" in rel_lower:
                arch = "react"
            elif "router" in rel_lower or "api" in rel_lower or "endpoint" in rel_lower:
                arch = "fastapi"
            elif any(k in rel_lower for k in ("anomaly", "forecast", "model", "predict")):
                arch = "ml"
            elif "service" in rel_lower:
                arch = "service"
            else:
                arch = "generic"
        archetype_totals[arch] = archetype_totals.get(arch, 0) + 1
        if m.relative_path in protected_set:
            archetype_protected[arch] = archetype_protected.get(arch, 0) + 1

    framework_coverage = {
        arch: {
            "total": archetype_totals[arch],
            "protected": archetype_protected[arch],
            "unprotected": archetype_totals[arch] - archetype_protected[arch],
            "percentage": round((archetype_protected[arch] / max(1, archetype_totals[arch])) * 100, 1),
        }
        for arch in ("react", "fastapi", "service", "ml", "generic")
        if archetype_totals.get(arch, 0) > 0
    }

    # Refactor proposals lookup for planned changes
    refactor_rec = db.query(ProjectRefactorRecord).filter(ProjectRefactorRecord.project_id == project_id).first()
    changed_files_set = set()
    if refactor_rec and refactor_rec.refactor_data:
        for rf in refactor_rec.refactor_data.get("files", []):
            if rf.get("changed"):
                changed_files_set.add(rf.get("relative_path", "").replace("\\", "/").lower())

    # Build prioritized unprotected modules queue
    unprotected_modules_detail: List[Dict[str, Any]] = []
    for m in analysis.modules:
        if m.relative_path in protected_set:
            continue

        norm_path = m.relative_path.replace("\\", "/").lower()
        has_planned_changes = norm_path in changed_files_set
        caller_count = sum(1 for e in analysis.dependency_edges if e.target_module_id == m.module_id)
        complexity_val = m.complexity.cyclomatic_complexity if m.complexity else 0
        risk_score = min(100, int(complexity_val * 2 + caller_count * 5))
        risk_level = "critical" if risk_score > 70 else ("high" if risk_score > 40 else ("medium" if risk_score > 15 else "low"))
        is_modernization_candidate = has_planned_changes or len(m.legacy_warnings) > 0

        # Assign P0, P1, P2
        if has_planned_changes and (risk_level in ("critical", "high") or caller_count > 3):
            priority = "P0"
            priority_label = "P0 — Protect before modification"
        elif is_modernization_candidate or risk_level in ("medium", "high", "critical") or caller_count > 1:
            priority = "P1"
            priority_label = "P1 — Recommended"
        else:
            priority = "P2"
            priority_label = "P2 — Optional / low risk"

        # Explicit failure/skip reason
        if is_non_testable_module(m):
            if norm_path.endswith((".d.ts", "types.ts", "models.ts", "interfaces.ts")):
                reason = "Type-only definitions (.d.ts / types.ts) without runtime callable implementations"
            elif "config" in norm_path:
                reason = "Static configuration file; no business logic functions"
            elif "index." in norm_path:
                reason = "Barrel re-export file with no standalone function or class declarations"
            elif norm_path.endswith("__init__.py"):
                reason = "Package initialization module with no direct exportable functions"
            else:
                reason = "Non-testable static module"
        elif m.parse_status == "failed":
            reason = "Parser syntax error or unsupported dynamic AST grammar"
        elif len(m.functions) == 0 and len(m.classes) == 0:
            reason = "No callable functions or class contracts identified"
        else:
            reason = "Module marked for characterization expansion"

        unprotected_modules_detail.append({
            "path": m.relative_path,
            "reason": reason,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "blast_radius": caller_count,
            "is_modernization_candidate": is_modernization_candidate,
            "has_planned_changes": has_planned_changes,
            "priority": priority,
            "priority_label": priority_label,
            "caller_count": caller_count,
            "loc": m.end_line - m.start_line + 1 if m.end_line >= m.start_line else 0,
        })

    # Sort unprotected queue: P0 first, then P1, then P2, ordered by risk_score desc
    priority_weights = {"P0": 0, "P1": 1, "P2": 2}
    unprotected_modules_detail.sort(key=lambda u: (priority_weights.get(u["priority"], 3), -u["risk_score"], -u["blast_radius"]))

    # Test manifest
    manifest = {
        "generated": len(test_files),
        "sourceProtected": len(protected_files),
        "unprotected": len(unprotected_files),
        "totalModules": len(analysis.modules),
        "coveragePercentage": round((len(protected_files) / max(1, len(analysis.modules))) * 100, 1),
        "runtimeExecuted": bool(is_measured or any(tf.execution_status == "passed" for tf in test_files)),
        "frameworks": sorted(list(frameworks)),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "generatorVersion": TEST_GENERATOR_VERSION,
    }

    result = ProjectTestResult(
        project_id=project_id,
        generation_version=TEST_GENERATOR_VERSION,
        generated_at=datetime.now(timezone.utc).isoformat(),
        status="completed",
        frameworks=sorted(list(frameworks)),
        test_files=test_files,
        target_source_files=len(analysis.modules),
        total_generated_tests=total_tests,
        syntax_valid_count=syntax_valid_cnt,
        executed_test_count=executed_cnt,
        passed_test_count=passed_cnt,
        failed_test_count=failed_cnt,
        overall_line_coverage=overall_coverage,
        per_file_coverage=per_file_cov,
        execution_enabled=should_execute,
        execution_warning=exec_warning,
        generation_duration_ms=gen_duration_ms,
        execution_duration_ms=exec_duration_ms,
        iteration_count=iteration_count,
        iteration_log=iteration_log,
        protected_files=protected_files,
        unprotected_files=unprotected_files,
        category_counts=category_counts,
        is_measured=is_measured,
        strength_counts=strength_counts,
        framework_coverage=framework_coverage,
        unprotected_modules_detail=unprotected_modules_detail,
        manifest=manifest,
    )

    # Persist in DB
    existing_rec = (
        db.query(ProjectTestRecord)
        .filter(ProjectTestRecord.project_id == project_id)
        .first()
    )
    if existing_rec:
        existing_rec.generator_version = TEST_GENERATOR_VERSION
        existing_rec.content_hash = project.content_hash
        existing_rec.test_data = result.model_dump(mode="json")
        existing_rec.created_at = datetime.now(timezone.utc)
        record_to_refresh = existing_rec
    else:
        new_rec = ProjectTestRecord(
            id=f"rec_test_{project_id}",
            project_id=project_id,
            generator_version=TEST_GENERATOR_VERSION,
            content_hash=project.content_hash,
            test_data=result.model_dump(mode="json"),
            created_at=datetime.now(timezone.utc),
        )
        db.add(new_rec)
        record_to_refresh = new_rec

    db.flush()
    db.commit()
    try:
        db.refresh(record_to_refresh)
    except Exception:
        pass
    return result


def process_test_generation_job(job_id: str, project_id: str, execute: bool = False, force: bool = False):
    """Background worker task for asynchronous test generation."""
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            logger.error("Job %s not found for test generation worker", job_id)
            return

        job.state = JobState.GENERATING
        job.stage = "Generating Unit Tests..."
        job.progress_percentage = 20
        job.message = "Running deterministic test generation..."
        db.commit()

        res = run_test_generation_for_project(db, project_id, execute=execute, force=force)

        job.state = JobState.COMPLETED
        job.stage = "Test Generation Complete"
        job.progress_percentage = 100
        job.message = f"Generated {res.total_generated_tests} tests across {len(res.test_files)} files."
        job.project_id = project_id
        db.commit()

    except Exception:
        logger.exception("Failed test generation job %s for project %s", job_id, project_id)
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.state = JobState.FAILED
            job.stage = "Generation Failed"
            job.progress_percentage = 100
            job.error_code = "TEST_GENERATION_FAILED"
            job.error_message = "Test generation could not be completed safely."
            db.commit()
    finally:
        db.close()
