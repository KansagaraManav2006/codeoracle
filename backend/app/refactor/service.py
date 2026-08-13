import ast
import difflib
import re
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, List, Tuple

from sqlalchemy.orm import Session

from app.ingestion.workspace import get_workspace_dir
from app.models.db import Project, ProjectFile, ProjectRefactorRecord
from app.refactor.models import (
    REFACTOR_ENGINE_VERSION,
    ProjectRefactorResult,
    RefactoredFile,
    RefactorWarning,
)


Rule = Tuple[re.Pattern[str], str, str, str, bool]

PYTHON_RULES: List[Rule] = [
    (re.compile(r"\bxrange\s*\("), "range(", "PY2_XRANGE", "Replaced Python 2 xrange with range.", False),
    (re.compile(r"\.iteritems\s*\("), ".items(", "PY2_ITERITEMS", "Replaced iteritems with items.", True),
    (re.compile(r"\.iterkeys\s*\("), ".keys(", "PY2_ITERKEYS", "Replaced iterkeys with keys.", True),
    (re.compile(r"\.itervalues\s*\("), ".values(", "PY2_ITERVALUES", "Replaced itervalues with values.", True),
    (re.compile(r"\braw_input\s*\("), "input(", "PY2_RAW_INPUT", "Replaced raw_input with input.", True),
    (re.compile(r"\bbasestring\b"), "str", "PY2_BASESTRING", "Replaced basestring with str.", True),
    (re.compile(r"\bunicode\s*\("), "str(", "PY2_UNICODE", "Replaced unicode constructor with str.", True),
]

JS_RULES: List[Rule] = [
    (re.compile(r"(?m)^(\s*)var\s+"), r"\1let ", "JS_VAR_DECLARATION", "Replaced function-scoped var with block-scoped let.", True),
    (re.compile(r"(?<![=!])==(?!=)"), "===", "JS_STRICT_EQUALITY", "Replaced loose equality with strict equality.", True),
    (re.compile(r"(?<![=!])!=(?!=)"), "!==", "JS_STRICT_INEQUALITY", "Replaced loose inequality with strict inequality.", True),
]


def _line_for(text: str, offset: int) -> int:
    return text.count("\n", 0, offset) + 1


def _apply_rules(source: str, rules: List[Rule]) -> Tuple[str, List[str], List[RefactorWarning]]:
    updated = source
    changes: List[str] = []
    warnings: List[RefactorWarning] = []
    for pattern, replacement, code, message, breaking in rules:
        matches = list(pattern.finditer(updated))
        if not matches:
            continue
        warnings.append(
            RefactorWarning(
                code=code,
                severity="risk" if breaking else "info",
                message=(message + (" Review behavior before merging." if breaking else "")),
                line=_line_for(updated, matches[0].start()),
                breaking_change=breaking,
            )
        )
        updated, count = pattern.subn(replacement, updated)
        changes.append(f"{message} ({count} occurrence{'s' if count != 1 else ''})")
    return updated, changes, warnings


def _modernize_python(source: str) -> Tuple[str, List[str], List[RefactorWarning]]:
    updated, changes, warnings = _apply_rules(source, PYTHON_RULES)

    # Handle only the unambiguous one-line Python 2 print statement form.
    print_pattern = re.compile(r"(?m)^(\s*)print\s+([^>\n][^\n]*)$")
    matches = list(print_pattern.finditer(updated))
    if matches:
        updated, count = print_pattern.subn(lambda m: f"{m.group(1)}print({m.group(2).rstrip()})", updated)
        changes.append(f"Converted Python 2 print statements to print calls. ({count} occurrences)")
        warnings.append(RefactorWarning(code="PY2_PRINT", severity="info", message="Converted print statement syntax.", line=_line_for(source, matches[0].start())))

    except_pattern = re.compile(r"(?m)^(\s*except\s+[^:\n,]+),\s*([A-Za-z_]\w*)\s*:")
    matches = list(except_pattern.finditer(updated))
    if matches:
        updated, count = except_pattern.subn(r"\1 as \2:", updated)
        changes.append(f"Converted legacy exception binding syntax. ({count} occurrences)")
        warnings.append(RefactorWarning(code="PY2_EXCEPT", severity="info", message="Converted exception binding to 'as' syntax.", line=_line_for(source, matches[0].start())))
    return updated, changes, warnings


def _syntax_check(language: str, code: str) -> Tuple[bool, str | None]:
    if language == "python":
        try:
            ast.parse(code)
            return True, None
        except SyntaxError as exc:
            return False, f"Line {exc.lineno}: {exc.msg}"
    # JavaScript receives a lightweight structural check; source is never executed.
    pairs = {"(": ")", "[": "]", "{": "}"}
    stack: List[str] = []
    for char in code:
        if char in pairs:
            stack.append(char)
        elif char in pairs.values():
            if not stack or pairs[stack.pop()] != char:
                return False, "Unbalanced brackets after transformation."
    return (not stack, None if not stack else "Unbalanced brackets after transformation.")


def run_refactor_for_project(db: Session, project_id: str, force: bool = False) -> ProjectRefactorResult:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError("Project not found.")

    cached = db.query(ProjectRefactorRecord).filter(ProjectRefactorRecord.project_id == project_id).first()
    if cached and cached.content_hash == project.content_hash and not force:
        return ProjectRefactorResult.model_validate(cached.refactor_data)

    raw_dir = get_workspace_dir(project.workspace_id) / "raw"
    results: List[RefactoredFile] = []
    files = db.query(ProjectFile).filter(ProjectFile.project_id == project_id).all()
    for project_file in files:
        if project_file.language not in {"python", "javascript"}:
            continue
        path = (raw_dir / project_file.relative_path).resolve()
        try:
            path.relative_to(raw_dir.resolve())
            original = path.read_text(encoding="utf-8", errors="replace")
        except (OSError, ValueError):
            continue

        if project_file.language == "python":
            modern, changes, warnings = _modernize_python(original)
        else:
            modern, changes, warnings = _apply_rules(original, JS_RULES)
        valid, syntax_error = _syntax_check(project_file.language, modern)
        if not valid:
            warnings.append(RefactorWarning(code="SYNTAX_REVIEW_REQUIRED", severity="risk", message="The proposal did not pass static syntax validation; do not apply it automatically.", breaking_change=True))

        diff = "".join(difflib.unified_diff(
            original.splitlines(keepends=True), modern.splitlines(keepends=True),
            fromfile=f"a/{project_file.relative_path}", tofile=f"b/{project_file.relative_path}",
        ))
        results.append(RefactoredFile(
            relative_path=project_file.relative_path,
            language=project_file.language,
            original_code=original,
            refactored_code=modern,
            unified_diff=diff,
            changes=changes,
            warnings=warnings,
            syntax_valid=valid,
            syntax_error=syntax_error,
            changed=original != modern,
        ))

    changed_files = sum(item.changed for item in results)
    total_changes = sum(len(item.changes) for item in results)
    breaking_count = sum(w.breaking_change for item in results for w in item.warnings)
    result = ProjectRefactorResult(
        project_id=project_id,
        generated_at=datetime.now(timezone.utc).isoformat(),
        files=results,
        analyzed_files=len(results),
        changed_files=changed_files,
        total_changes=total_changes,
        breaking_warning_count=breaking_count,
        safe_to_apply_automatically=bool(changed_files) and breaking_count == 0 and all(item.syntax_valid for item in results),
        summary=(f"Prepared {total_changes} modernization rule group(s) across {changed_files} file(s). "
                 "Review every diff and run the generated tests before merging." if changed_files else
                 "No deterministic legacy patterns were found. The engine left all source files unchanged."),
    )

    if cached:
        cached.engine_version = REFACTOR_ENGINE_VERSION
        cached.content_hash = project.content_hash
        cached.refactor_data = result.model_dump(mode="json")
        cached.created_at = datetime.now(timezone.utc)
    else:
        db.add(ProjectRefactorRecord(
            id=f"ref_{uuid.uuid4().hex[:12]}", project_id=project_id,
            engine_version=REFACTOR_ENGINE_VERSION, content_hash=project.content_hash,
            refactor_data=result.model_dump(mode="json"),
        ))
    db.commit()
    return result
