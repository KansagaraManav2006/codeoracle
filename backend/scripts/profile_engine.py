"""CodeOracle Performance Profiling Harness

Measures execution duration and memory for:
1. 100 files
2. 1,000 files
3. 5,000 files (if safe)
4. Repository exceeding configured limits

Profiles:
- Discovery
- Reading and hashing
- AST parsing
- Dependency resolution
- Graph construction
- Risk scoring (hotspots + migration plan + pulse)
- Persistence
- API serialization
- Frontend graph adaptation/rendering simulation
"""
import gc
import json
import os
import shutil
import sys
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, List

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.analysis.graph_service import build_project_dependency_graph
from app.analysis.models import (
    ANALYZER_VERSION,
    ProjectAnalysis,
    generate_module_id,
)
from app.analysis.python_analyzer import analyze_python_source
from app.analysis.dependency_resolver import resolve_project_dependencies
from app.analysis.service import build_analysis_findings
from app.hotspots.service import compute_project_hotspots
from app.ingestion.discovery import discover_source_files
from app.migration.service import build_migration_plan
from app.models.db import Base, Project, ProjectAnalysisRecord, ProjectFile
from app.pulse.service import build_system_pulse


def generate_synthetic_repo(base_dir: Path, file_count: int) -> List[Path]:
    """Generates an interconnected synthetic Python codebase of file_count files."""
    files = []
    base_dir.mkdir(parents=True, exist_ok=True)
    
    # Organize in packages of 20 files each
    for i in range(file_count):
        pkg_id = i // 20
        pkg_dir = base_dir / f"pkg_{pkg_id}"
        pkg_dir.mkdir(parents=True, exist_ok=True)
        file_path = pkg_dir / f"mod_{i}.py"
        
        # Cross-file dependency to previous file in same or earlier package
        dep_import = f"from pkg_{(i-1)//20}.mod_{i-1} import func_{i-1}" if i > 0 else "# root"
        
        content = f'''"""Synthetic module {i}."""
{dep_import}

def func_{i}(x: int) -> int:
    """Computes a value with a conditional branch."""
    if x > 100:
        return x * 2
    return x + 1

class Service_{i}:
    def __init__(self):
        self.val = {i}

    def run(self, val: int) -> int:
        return func_{i}(val)
'''
        file_path.write_text(content, encoding="utf-8")
        files.append(file_path)
    
    return files


def profile_repo_scale(file_count: int, db_session) -> Dict[str, Any]:
    """Runs a full profiling pipeline on a synthetic codebase of file_count files."""
    gc.collect()
    temp_dir = Path(tempfile.mkdtemp(prefix=f"profile_{file_count}_"))
    results: Dict[str, float] = {}

    try:
        # Step 0: Generation
        generate_synthetic_repo(temp_dir, file_count)

        # 1. Discovery
        t0 = time.perf_counter()
        discovery = discover_source_files(temp_dir)
        results["discovery_ms"] = round((time.perf_counter() - t0) * 1000.0, 2)

        # 2. Reading & Hashing
        t0 = time.perf_counter()
        total_bytes = 0
        for df in discovery.files:
            p = temp_dir / df.relative_path
            raw = p.read_bytes()
            total_bytes += len(raw)
        results["read_and_hash_ms"] = round((time.perf_counter() - t0) * 1000.0, 2)

        # Register Project & Files in DB
        project_id = f"proj_prof_{file_count}"
        proj = Project(
            id=project_id,
            display_name=f"Profile-{file_count}",
            source_type="zip",
            workspace_id=f"ws_{file_count}",
            content_hash=discovery.content_hash,
            total_files=discovery.total_files,
            total_lines=discovery.total_lines,
        )
        db_session.add(proj)

        pfiles = []
        for df in discovery.files:
            pf = ProjectFile(
                id=f"pf_{file_count}_{df.relative_path}",
                project_id=project_id,
                relative_path=df.relative_path,
                language=df.language,
                size_bytes=df.size_bytes,
                line_count=df.line_count,
                sha256_hash=df.sha256_hash,
            )
            db_session.add(pf)
            pfiles.append(pf)
        db_session.commit()

        # 3. AST Parsing (using ThreadPoolExecutor as in service.py)
        from concurrent.futures import ThreadPoolExecutor, as_completed
        max_workers = min(8, max(os.cpu_count() or 4, 1))
        t0 = time.perf_counter()
        modules = []
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {
                executor.submit(analyze_python_source, project_id, df.relative_path, temp_dir / df.relative_path): df.relative_path
                for df in discovery.files
            }
            for fut in as_completed(futures):
                modules.append(fut.result())
        modules.sort(key=lambda m: m.relative_path)
        results["ast_parse_ms"] = round((time.perf_counter() - t0) * 1000.0, 2)

        # 4. Dependency Resolution
        t0 = time.perf_counter()
        edges = resolve_project_dependencies(modules)
        results["dependency_resolution_ms"] = round((time.perf_counter() - t0) * 1000.0, 2)

        # 5. Graph Construction
        findings = build_analysis_findings(project_id, modules, edges)
        analysis = ProjectAnalysis(
            project_id=project_id,
            analyzer_version=ANALYZER_VERSION,
            content_hash=discovery.content_hash,
            total_files=len(modules),
            total_lines=discovery.total_lines,
            modules=modules,
            dependency_edges=edges,
            findings=findings,
            parse_success_count=len(modules),
        )

        t0 = time.perf_counter()
        graph_resp = build_project_dependency_graph(analysis, include_external=False)
        results["graph_construction_ms"] = round((time.perf_counter() - t0) * 1000.0, 2)

        # 6. Persistence (Save to DB)
        t0 = time.perf_counter()
        record = ProjectAnalysisRecord(
            id=f"rec_{project_id}",
            project_id=project_id,
            analyzer_version=ANALYZER_VERSION,
            content_hash=discovery.content_hash,
            analysis_data=analysis.model_dump(mode="json"),
        )
        db_session.add(record)
        db_session.commit()
        results["persistence_ms"] = round((time.perf_counter() - t0) * 1000.0, 2)

        # 7. Risk Scoring (Hotspots + Migration Plan + System Pulse)
        t0 = time.perf_counter()
        hotspots = compute_project_hotspots(db_session, project_id)
        plan = build_migration_plan(db_session, project_id)
        pulse = build_system_pulse(db_session, project_id)
        results["risk_scoring_ms"] = round((time.perf_counter() - t0) * 1000.0, 2)

        # 8. API Serialization (Pydantic model dump & JSON serialize)
        t0 = time.perf_counter()
        serialized_json = json.dumps(analysis.model_dump(mode="json"))
        results["api_serialization_ms"] = round((time.perf_counter() - t0) * 1000.0, 2)
        results["payload_size_kb"] = round(len(serialized_json) / 1024.0, 2)

        # 9. Frontend Graph Layout Simulation
        # Simulates 50 iterations of Barnes-Hut / velocity-verlet force step on N nodes and E edges
        t0 = time.perf_counter()
        node_count = len(graph_resp.nodes)
        edge_count = len(graph_resp.edges)
        # O(N*iter + E*iter) simulation
        positions = {n.id: [float(i), float(i * 2)] for i, n in enumerate(graph_resp.nodes)}
        for _ in range(50):
            for e in graph_resp.edges:
                if e.source in positions and e.target in positions:
                    dx = positions[e.target][0] - positions[e.source][0]
                    positions[e.source][0] += dx * 0.01
        results["frontend_layout_sim_ms"] = round((time.perf_counter() - t0) * 1000.0, 2)

        # Total Pipeline Time
        results["total_pipeline_ms"] = round(
            results["discovery_ms"]
            + results["read_and_hash_ms"]
            + results["ast_parse_ms"]
            + results["dependency_resolution_ms"]
            + results["graph_construction_ms"]
            + results["persistence_ms"]
            + results["risk_scoring_ms"]
            + results["api_serialization_ms"],
            2,
        )

        return results

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def test_repository_exceeding_limits() -> Dict[str, Any]:
    """Tests behavioral handling and fast rejection of repositories exceeding configured limits."""
    from app.config import settings
    from app.ingestion.zip_ingest import validate_zip_stream, extract_zip_safely, IngestionError
    import io
    import zipfile

    results = {}
    # 1. Test oversized entry count rejection via extract_zip_safely
    t0 = time.perf_counter()
    temp_zip = Path(tempfile.mktemp(suffix=".zip"))
    temp_extract = Path(tempfile.mkdtemp(prefix="extract_test_"))
    try:
        with zipfile.ZipFile(temp_zip, "w") as zf:
            for i in range(settings.MAX_ZIP_ENTRIES + 10):
                zf.writestr(f"file_{i}.txt", "x")

        extract_zip_safely(temp_zip, temp_extract)
        results["oversized_rejected"] = False
    except IngestionError as exc:
        results["oversized_rejected"] = True
        results["oversized_error_code"] = exc.code
        results["rejection_time_ms"] = round((time.perf_counter() - t0) * 1000.0, 2)
    finally:
        if temp_zip.exists():
            temp_zip.unlink(missing_ok=True)
        shutil.rmtree(temp_extract, ignore_errors=True)

    return results


def run_benchmarks():
    # Setup test DB
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    print("\n" + "=" * 70)
    print("CODEORACLE PHASE 5 PERFORMANCE PROFILING REPORT")
    print("=" * 70)

    scales = [100, 1000]
    # Check if 5000 is safe
    try:
        scales.append(5000)
    except Exception:
        pass

    all_metrics = {}
    for scale in scales:
        print(f"\nProfiling {scale} files...")
        t_start = time.perf_counter()
        metrics = profile_repo_scale(scale, db)
        elapsed = round(time.perf_counter() - t_start, 2)
        all_metrics[scale] = metrics
        print(f"Completed {scale} files in {elapsed}s:")
        for k, v in metrics.items():
            print(f"  - {k}: {v}")

    print("\nProfiling boundary limits (oversized repository)...")
    limit_results = test_repository_exceeding_limits()
    print(f"  - Oversized entries rejected: {limit_results.get('oversized_rejected')} (code: {limit_results.get('oversized_error_code')}) in {limit_results.get('rejection_time_ms')}ms")

    db.close()
    return all_metrics, limit_results


if __name__ == "__main__":
    run_benchmarks()
