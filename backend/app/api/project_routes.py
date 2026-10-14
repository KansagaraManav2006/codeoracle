import hashlib
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.analysis.service import run_analysis_for_project
from app.api.auth import can_delete_project, get_current_user, get_current_user_optional
from app.api.helpers import get_authorized_project
from app.database import get_db
from app.ingestion.workspace import delete_project_workspace_and_records, get_workspace_dir
from app.models.db import (
    Job,
    Project,
    ProjectAnalysisRecord,
    ProjectFile,
    ProjectRefactorRecord,
    ProjectTestRecord,
    User,
)
from app.models.schema import (
    LanguageStat,
    ParseCoverage,
    ProjectFileResponse,
    ProjectFilesListResponse,
    ProjectMetadataResponse,
    ProjectSummaryResponse,
    ProjectTotals,
    RecentProjectsListResponse,
    RepositoryInfo,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["projects"])


@router.get("/projects", response_model=RecentProjectsListResponse)
def get_recent_projects(
    limit: int = Query(12, ge=1, le=50, description="Max number of recent projects to retrieve"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> RecentProjectsListResponse:
    """Lists recent stored projects: user-owned only for signed-in users, demo benchmarks only for guests."""
    query = db.query(Project)
    if current_user:
        query = query.filter(Project.user_id == current_user.id)
    else:
        query = query.filter(Project.is_public_demo == 1)

    projects = query.order_by(Project.created_at.desc()).limit(limit).all()
    items = [
        ProjectMetadataResponse(
            project_id=p.id,
            display_name=p.display_name,
            source_type=p.source_type,
            source_url=p.source_url,
            detected_languages=p.detected_languages or [],
            total_files=p.total_files,
            total_lines=p.total_lines,
            content_hash=p.content_hash,
            created_at=p.created_at,
        )
        for p in projects
    ]
    return RecentProjectsListResponse(total=len(items), projects=items)


@router.get("/demo/projects", response_model=RecentProjectsListResponse)
def get_demo_projects(
    db: Session = Depends(get_db),
) -> RecentProjectsListResponse:
    """Lists available public demo projects without duplicate accumulating entries."""
    demos = (
        db.query(Project)
        .filter(Project.is_public_demo == 1)
        .order_by(Project.created_at.asc())
        .all()
    )
    seen = set()
    deduped = []
    for d in demos:
        key = d.source_url or d.display_name
        if key not in seen:
            seen.add(key)
            deduped.append(
                ProjectMetadataResponse(
                    project_id=d.id,
                    display_name=d.display_name,
                    source_type=d.source_type,
                    source_url=d.source_url,
                    detected_languages=d.detected_languages or [],
                    total_files=d.total_files,
                    total_lines=d.total_lines,
                    content_hash=d.content_hash,
                    created_at=d.created_at,
                )
            )
    return RecentProjectsListResponse(total=len(deduped), projects=deduped)


@router.get("/projects/{project_id}", response_model=ProjectMetadataResponse)
def get_project_metadata(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> ProjectMetadataResponse:
    """Retrieves metadata summary for an ingested project."""
    project = get_authorized_project(project_id, db, current_user)

    return ProjectMetadataResponse(
        project_id=project.id,
        display_name=project.display_name,
        source_type=project.source_type,
        source_url=project.source_url,
        detected_languages=project.detected_languages,
        total_files=project.total_files,
        total_lines=project.total_lines,
        content_hash=project.content_hash,
        created_at=project.created_at,
    )


@router.delete("/projects/{project_id}")
def delete_project_endpoint(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Permanently delete a project, its source workspace files, and all associated database records."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Project '{project_id}' not found.")

    if not can_delete_project(project, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to delete this project.",
        )

    delete_project_workspace_and_records(db, project)
    return {
        "status": "ok",
        "message": f"Project '{project_id}' and all associated workspace data have been permanently deleted.",
    }


@router.get("/projects/{project_id}/summary", response_model=ProjectSummaryResponse)
def get_project_summary(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> ProjectSummaryResponse:
    """Retrieves canonical single-source-of-truth summary metrics for a project."""
    project = get_authorized_project(project_id, db, current_user)
    files = db.query(ProjectFile).filter(ProjectFile.project_id == project_id).all()

    # 1. Repository metadata
    owner = ""
    name = project.display_name
    url = project.source_url or ""
    if url and "github.com/" in url:
        path_part = url.split("github.com/")[-1]
        if path_part.endswith(".git"):
            path_part = path_part[:-4]
        parts = path_part.strip("/").split("/")
        if len(parts) >= 2:
            owner, name = parts[0], parts[1]

    # 2. Canonical language LOC directly from files
    lang_loc = {}
    for f in files:
        lang = f.language.capitalize() if f.language else "Other"
        lang_loc[lang] = lang_loc.get(lang, 0) + (f.line_count or 0)

    languages = [
        LanguageStat(language=k, loc=v)
        for k, v in sorted(lang_loc.items(), key=lambda x: x[1], reverse=True)
    ]

    # 3. Parse coverage from ProjectAnalysisRecord
    record = db.query(ProjectAnalysisRecord).filter(ProjectAnalysisRecord.project_id == project_id).first()
    fully_parsed = 0
    partial = 0
    unsupported = 0
    failed = 0

    if record and record.analysis_data:
        modules = record.analysis_data.get("modules", [])
        for m in modules:
            st = m.get("parse_status", "complete")
            lng = (m.get("language") or "").lower()
            if st == "complete":
                fully_parsed += 1
            elif st == "partial":
                partial += 1
            elif st == "unsupported" or (lng not in ("python", "javascript", "typescript") and st == "failed"):
                unsupported += 1
            elif st == "failed":
                failed += 1
            else:
                fully_parsed += 1
    else:
        fully_parsed = len(files)

    total_source_files = len(files)
    accounted = fully_parsed + partial + unsupported + failed
    if total_source_files > accounted:
        unsupported += (total_source_files - accounted)

    full_ast_pct = round((fully_parsed / max(total_source_files, 1)) * 100, 1)

    parse_coverage = ParseCoverage(
        fully_parsed=fully_parsed,
        partial=partial,
        unsupported=unsupported,
        failed=failed,
        full_ast_percentage=full_ast_pct,
    )

    totals = ProjectTotals(
        repository_files=project.total_files if project.total_files >= len(files) else len(files),
        source_files=total_source_files,
        loc=sum(f.line_count for f in files),
    )

    warnings = []
    incomplete_count = partial + unsupported + failed
    if incomplete_count > 0:
        warnings.append(f"{incomplete_count} files were not fully parsed. Dependency and impact results may be incomplete.")

    return ProjectSummaryResponse(
        project_id=project.id,
        display_name=project.display_name,
        repository=RepositoryInfo(owner=owner, name=name, url=url),
        totals=totals,
        languages=languages,
        parse_coverage=parse_coverage,
        analysis_mode="static",
        warnings=warnings,
    )


@router.get("/projects/{project_id}/files", response_model=ProjectFilesListResponse)
def get_project_files(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> ProjectFilesListResponse:
    """Retrieves list of all discovered source files in a project, enriched with AST parse status."""
    project = get_authorized_project(project_id, db, current_user)

    files = db.query(ProjectFile).filter(ProjectFile.project_id == project_id).all()
    analysis_record = db.query(ProjectAnalysisRecord).filter(ProjectAnalysisRecord.project_id == project_id).first()
    mod_map = {}
    if analysis_record and analysis_record.analysis_data:
        for m in analysis_record.analysis_data.get("modules", []):
            mod_map[m.get("relative_path")] = m

    file_responses = []
    for f in files:
        m = mod_map.get(f.relative_path)
        p_status = m.get("parse_status", "complete") if m else "complete"
        p_errors = m.get("parse_errors", []) if m else []

        if f.language == "python":
            parser = "Python AST"
        elif f.language == "typescript":
            parser = "Tree-sitter TypeScript"
        elif f.language == "javascript":
            parser = "Tree-sitter JavaScript"
        else:
            parser = "Generic Parser"

        if p_status == "complete":
            badge = "FULL AST"
            reason = None
            confidence = "High"
        elif p_status == "partial":
            badge = "PARTIAL"
            reason = p_errors[0] if p_errors else "syntax fallback"
            confidence = "Medium"
        elif p_status in ("fallback", "lexical"):
            badge = "FALLBACK"
            reason = p_errors[0] if p_errors else "lexical fallback"
            confidence = "Low"
        elif p_status == "unsupported" or f.language not in ("python", "javascript", "typescript"):
            badge = "UNSUPPORTED"
            reason = "unsupported syntax pattern"
            confidence = "Low"
        else:
            badge = "FAILED"
            reason = p_errors[0] if p_errors else "syntax parsing error"
            confidence = "Low"

        file_responses.append(
            ProjectFileResponse(
                file_id=f.id,
                relative_path=f.relative_path,
                language=f.language,
                size_bytes=f.size_bytes,
                line_count=f.line_count,
                sha256_hash=f.sha256_hash,
                parse_status=p_status,
                parse_badge=badge,
                parse_reason=reason,
                parser=parser,
                confidence=confidence,
            )
        )

    return ProjectFilesListResponse(
        project_id=project.id,
        total_files=len(file_responses),
        files=file_responses,
    )


@router.post("/demo/benchmarks/{benchmark_name}", response_model=ProjectMetadataResponse, status_code=status.HTTP_201_CREATED)
def load_demo_benchmark(
    benchmark_name: str,
    db: Session = Depends(get_db),
) -> ProjectMetadataResponse:
    """Ingest a bundled trusted Python, JavaScript, or full legacy-retail benchmark."""
    route_path = Path(__file__).resolve()
    demo_roots = [route_path.parents[2], route_path.parents[3]]
    bench_dir = next(
        (root / "demo" / "benchmarks" / benchmark_name for root in demo_roots if (root / "demo" / "benchmarks" / benchmark_name).is_dir()),
        demo_roots[0] / "demo" / "benchmarks" / benchmark_name,
    )
    if not bench_dir.exists() or not bench_dir.is_dir():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Benchmark '{benchmark_name}' not found.")

    project_id = f"proj_bench_{benchmark_name}"
    workspace_id = f"ws_bench_{benchmark_name}"
    ws_dir = get_workspace_dir(workspace_id)
    raw_ws_dir = ws_dir / "raw"
    raw_ws_dir.mkdir(parents=True, exist_ok=True)

    existing_proj = db.query(Project).filter(Project.id == project_id).first()
    if existing_proj:
        if not getattr(existing_proj, "is_public_demo", 0):
            existing_proj.is_public_demo = 1
            db.commit()
        analysis_exists = db.query(ProjectAnalysisRecord).filter(ProjectAnalysisRecord.project_id == project_id).first()
        if analysis_exists:
            return ProjectMetadataResponse(
                project_id=existing_proj.id,
                display_name=existing_proj.display_name,
                source_type=existing_proj.source_type,
                source_url=existing_proj.source_url,
                detected_languages=existing_proj.detected_languages or [],
                total_files=existing_proj.total_files,
                total_lines=existing_proj.total_lines,
                content_hash=existing_proj.content_hash,
                created_at=existing_proj.created_at,
            )
        db.query(ProjectTestRecord).filter(ProjectTestRecord.project_id == project_id).delete()
        db.query(ProjectRefactorRecord).filter(ProjectRefactorRecord.project_id == project_id).delete()
        db.query(ProjectAnalysisRecord).filter(ProjectAnalysisRecord.project_id == project_id).delete()
        db.query(ProjectFile).filter(ProjectFile.project_id == project_id).delete()
        db.query(Job).filter(Job.project_id == project_id).delete()
        db.delete(existing_proj)
        db.commit()

    content_hasher = hashlib.sha256()
    total_files = 0
    total_lines = 0
    languages = set()
    project_files = []

    for file_path in bench_dir.glob("**/*"):
        if file_path.is_file():
            rel_path = file_path.relative_to(bench_dir).as_posix()
            ext = file_path.suffix.lower()
            lang = "python" if ext == ".py" else ("javascript" if ext in (".js", ".jsx") else "other")
            if lang != "other":
                languages.add(lang)

            content_bytes = file_path.read_bytes()
            content_hasher.update(content_bytes)
            file_hash = hashlib.sha256(content_bytes).hexdigest()
            line_count = len(content_bytes.decode("utf-8", errors="ignore").splitlines())

            target_p = raw_ws_dir / rel_path
            target_p.parent.mkdir(parents=True, exist_ok=True)
            target_p.write_bytes(content_bytes)

            pf = ProjectFile(
                id=f"pf_bench_{uuid.uuid4().hex[:8]}",
                project_id=project_id,
                relative_path=rel_path,
                language=lang,
                size_bytes=len(content_bytes),
                line_count=line_count,
                sha256_hash=file_hash,
            )
            project_files.append(pf)
            total_files += 1
            total_lines += line_count

    proj = Project(
        id=project_id,
        display_name=f"Demo Benchmark: {benchmark_name.replace('_', ' ').title()}",
        source_type="demo_benchmark",
        source_url=f"demo/benchmarks/{benchmark_name}",
        detected_languages=sorted(list(languages)),
        total_files=total_files,
        total_lines=total_lines,
        content_hash=content_hasher.hexdigest(),
        workspace_id=workspace_id,
        is_trusted=1,
        is_public_demo=1,
        created_at=datetime.now(timezone.utc),
    )
    db.add(proj)
    for pf in project_files:
        db.add(pf)
    db.commit()

    run_analysis_for_project(db, project_id, force=True)

    return ProjectMetadataResponse(
        project_id=project_id,
        display_name=proj.display_name,
        source_type=proj.source_type,
        source_url=proj.source_url,
        detected_languages=proj.detected_languages,
        total_files=total_files,
        total_lines=total_lines,
        content_hash=proj.content_hash,
        created_at=proj.created_at,
    )
