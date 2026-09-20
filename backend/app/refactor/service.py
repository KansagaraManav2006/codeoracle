import ast
import difflib
import io
import re
import time
import tokenize
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, List, Set, Tuple

from sqlalchemy.orm import Session
import tree_sitter
import tree_sitter_javascript

from app.ingestion.workspace import get_workspace_dir
from app.analysis.models import ProjectAnalysis, decorate_findings, summarize_findings
from app.analysis.service import build_analysis_findings, run_analysis_for_project
from app.models.db import Project, ProjectAnalysisRecord, ProjectFile, ProjectRefactorRecord
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
]

def _line_for(text: str, offset: int) -> int:
    return text.count("\n", 0, offset) + 1


def _python_protected_ranges(source: str) -> List[Tuple[int, int]]:
    """
    Returns a list of (start, end) byte-offset ranges covering all string literals
    (including docstrings and multi-line strings) and inline comments in the source.
    Matches within these ranges are skipped by _apply_rules to avoid mutating
    content inside string values or comments.
    """
    ranges: List[Tuple[int, int]] = []
    try:
        tokens = list(tokenize.generate_tokens(io.StringIO(source).readline))
    except tokenize.TokenError:
        # Tokenization failed (e.g., broken source); return empty — rules still run
        return ranges

    for tok_type, tok_string, tok_start, tok_end, _ in tokens:
        if tok_type in (tokenize.STRING, tokenize.COMMENT):
            # Convert (line, col) positions to flat byte offsets
            lines = source.splitlines(keepends=True)
            start_offset = sum(len(lines[i]) for i in range(tok_start[0] - 1)) + tok_start[1]
            end_offset = sum(len(lines[i]) for i in range(tok_end[0] - 1)) + tok_end[1]
            ranges.append((start_offset, end_offset))
    return ranges


def _js_protected_ranges(source: str) -> List[Tuple[int, int]]:
    """
    Returns approximate protected ranges for JS/TS string literals (single-quoted,
    double-quoted, and template literals) and line/block comments.
    This is a best-effort regex scanner — not a full parser.
    """
    ranges: List[Tuple[int, int]] = []
    # Pattern matches: double-quoted strings, single-quoted strings, template literals,
    # block comments, and line comments (in that priority order).
    _JS_LITERAL_RE = re.compile(
        r'"(?:[^"\\]|\\.)*"'     # double-quoted
        r"|'(?:[^'\\]|\\.)*'"   # single-quoted
        r"|`(?:[^`\\]|\\.)*`"   # template literal
        r"|/\*.*?\*/"            # block comment
        r"|//[^\n]*",            # line comment
        re.DOTALL,
    )
    for m in _JS_LITERAL_RE.finditer(source):
        ranges.append((m.start(), m.end()))
    return ranges


def _in_protected_range(offset: int, protected: List[Tuple[int, int]]) -> bool:
    """Returns True if the given offset falls inside any protected range."""
    for start, end in protected:
        if start <= offset < end:
            return True
    return False


def _first_loose_js_equality_line(source: str) -> int | None:
    """Find an equality expression, ignoring comments and literal text."""
    parser = tree_sitter.Parser(tree_sitter.Language(tree_sitter_javascript.language()))
    root = parser.parse(source.encode("utf-8")).root_node
    pending = [root]
    while pending:
        node = pending.pop()
        if node.type == "binary_expression":
            operator = node.child_by_field_name("operator")
            if operator is not None and operator.type in {"==", "!="}:
                return operator.start_point.row + 1
        pending.extend(reversed(node.named_children))
    return None


def _apply_rules(
    source: str,
    rules: List[Rule],
    is_python: bool = False,
) -> Tuple[str, List[str], List[RefactorWarning]]:
    """
    Applies modernization rules to source, skipping matches that fall inside
    string literals or comments (token-aware for Python, regex-approximate for JS).
    """
    # Build protected ranges from the ORIGINAL source before any substitutions.
    # We use original offsets as a conservative guard; after substitutions offsets
    # shift, but the guard only needs to protect regions that start protected.
    if is_python:
        protected = _python_protected_ranges(source)
    else:
        protected = _js_protected_ranges(source)

    updated = source
    # Track cumulative offset shift so we can map original offsets after substitutions.
    # Since we process rules sequentially and use pattern.subn on the evolving string,
    # we recompute protected ranges from the current state for each rule to stay accurate.
    changes: List[str] = []
    warnings: List[RefactorWarning] = []

    for pattern, replacement, code, message, breaking in rules:
        # Recompute protected ranges on the current version of the text for accuracy.
        current_protected = _python_protected_ranges(updated) if is_python else _js_protected_ranges(updated)

        # Find all matches; only count/warn on matches outside protected ranges.
        matches = list(pattern.finditer(updated))
        unprotected_matches = [m for m in matches if not _in_protected_range(m.start(), current_protected)]

        if not unprotected_matches:
            continue

        warnings.append(
            RefactorWarning(
                code=code,
                severity="risk" if breaking else "info",
                message=(message + (" Review behavior before merging." if breaking else "")),
                line=_line_for(updated, unprotected_matches[0].start()),
                breaking_change=breaking,
            )
        )

        # Apply substitution only to unprotected matches, rebuilding the string
        # by replacing from right to left (to preserve offsets for earlier matches).
        count = 0
        result_parts = []
        prev_end = 0
        for m in matches:
            if _in_protected_range(m.start(), current_protected):
                # Inside a string literal or comment — keep as-is.
                result_parts.append(updated[prev_end:m.end()])
            else:
                result_parts.append(updated[prev_end:m.start()])
                result_parts.append(m.expand(replacement))
                count += 1
            prev_end = m.end()
        result_parts.append(updated[prev_end:])
        updated = "".join(result_parts)

        changes.append(f"{message} ({count} occurrence{'s' if count != 1 else ''})") 

    if rules is JS_RULES:
        equality_line = _first_loose_js_equality_line(source)
        if equality_line is not None:
            warnings.append(RefactorWarning(
                code="JS_EQUALITY_REVIEW_REQUIRED",
                severity="risk",
                message="Loose equality was left unchanged. Converting it to strict equality can change null/undefined and mixed-type behavior; review each comparison manually.",
                line=equality_line,
                breaking_change=False,
            ))
    return updated, changes, warnings


def _modernize_python(source: str) -> Tuple[str, List[str], List[RefactorWarning]]:
    updated, changes, warnings = _apply_rules(source, PYTHON_RULES, is_python=True)

    # Handle only the unambiguous one-line Python 2 print statement form.
    # The pattern requires a line-start anchor, so it cannot match inside strings.
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


def _load_project_findings(db: Session, project_id: str) -> List:
    record = db.query(ProjectAnalysisRecord).filter(ProjectAnalysisRecord.project_id == project_id).first()
    analysis = (
        ProjectAnalysis.model_validate(record.analysis_data)
        if record else run_analysis_for_project(db, project_id)
    )
    return analysis.findings or build_analysis_findings(
        project_id, analysis.modules, analysis.dependency_edges,
    )


def run_refactor_for_project(db: Session, project_id: str, force: bool = False) -> ProjectRefactorResult:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError("Project not found.")

    cached = db.query(ProjectRefactorRecord).filter(ProjectRefactorRecord.project_id == project_id).first()
    if cached and cached.content_hash == project.content_hash and cached.engine_version == REFACTOR_ENGINE_VERSION and not force:
        return ProjectRefactorResult.model_validate(cached.refactor_data)

    raw_dir = get_workspace_dir(project.workspace_id) / "raw"
    results: List[RefactoredFile] = []
    files = db.query(ProjectFile).filter(ProjectFile.project_id == project_id).all()
    for project_file in files:
        if project_file.language not in {"python", "javascript", "typescript"}:
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
        if project_file.language != "python" and original != modern:
            warnings.append(RefactorWarning(
                code="JS_SYNTAX_REVIEW_REQUIRED",
                severity="risk",
                message="Only bracket balance was checked. Parse and test this JavaScript or TypeScript change before applying it.",
            ))
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
    findings = decorate_findings(
        _load_project_findings(db, project_id),
        {item.relative_path for item in results if item.changed},
    )
    result = ProjectRefactorResult(
        project_id=project_id,
        generated_at=datetime.now(timezone.utc).isoformat(),
        files=results,
        analyzed_files=len(results),
        changed_files=changed_files,
        total_changes=total_changes,
        breaking_warning_count=breaking_count,
        # Static syntax checks and rule warnings cannot establish behavioral equivalence.
        safe_to_apply_automatically=False,
        summary=(f"Prepared {total_changes} modernization rule group(s) across {changed_files} file(s). "
                 "Review every diff and run the generated tests before merging." if changed_files else
                 "No deterministic legacy patterns were found. The engine left all source files unchanged."),
        findings=findings,
        finding_funnel=summarize_findings(findings),
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
