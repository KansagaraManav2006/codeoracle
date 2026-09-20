import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.database import Base
from app.models.db import Project, ProjectFile
from app.refactor.service import JS_RULES, _apply_rules, _modernize_python, _syntax_check, run_refactor_for_project


def test_python2_patterns_are_modernized() -> None:
    source = "for item in xrange(3):\n    print item\nvalue = raw_input('Name: ')\n"
    modern, changes, warnings = _modernize_python(source)
    assert "range(3)" in modern
    assert "print(item)" in modern
    assert "input('Name: ')" in modern
    assert len(changes) == 3
    assert {warning.code for warning in warnings} == {"PY2_XRANGE", "PY2_PRINT", "PY2_RAW_INPUT"}


def test_iterator_semantics_emit_breaking_warning() -> None:
    modern, _, warnings = _modernize_python("values = data.iteritems()\n")
    assert modern == "values = data.items()\n"
    assert warnings[0].breaking_change is True


def test_legacy_exception_binding_is_converted() -> None:
    modern, _, _ = _modernize_python("try:\n    run()\nexcept ValueError, exc:\n    print exc\n")
    assert "except ValueError as exc:" in modern
    assert "print(exc)" in modern
    assert _syntax_check("python", modern) == (True, None)


def test_javascript_rules_are_reviewable() -> None:
    modern, changes, warnings = _apply_rules("var answer = value == 42;\n", JS_RULES)
    assert modern == "let answer = value == 42;\n"
    assert len(changes) == 1
    assert {warning.code for warning in warnings} == {"JS_VAR_DECLARATION", "JS_EQUALITY_REVIEW_REQUIRED"}
    assert all(warning.severity == "risk" for warning in warnings)


def test_javascript_equality_keeps_null_undefined_and_other_values() -> None:
    source = """null == undefined; null != undefined; value == null; null != value;
1 == '1'; true != 1; left == right; 2 == 2; 'x' == 'x';
left === right; left !== right;
const text = 'a == b'; // x != y
const re = /a==b/; const template = `x == ${value}`;
"""
    modern, changes, warnings = _apply_rules(source, JS_RULES)
    assert modern == source
    assert changes == []
    assert [warning.code for warning in warnings] == ["JS_EQUALITY_REVIEW_REQUIRED"]
    assert warnings[0].breaking_change is False
    assert _apply_rules(modern, JS_RULES)[0] == source


def test_javascript_literal_equality_text_does_not_create_review_warning() -> None:
    source = "const text = 'a == b'; // x != y\nconst re = /a==b/; const template = `x != y`;\n"
    modern, changes, warnings = _apply_rules(source, JS_RULES)
    assert modern == source
    assert changes == []
    assert warnings == []


def test_javascript_template_expression_still_requires_review() -> None:
    source = "const template = `text == ${value != null}`;\n"
    modern, _, warnings = _apply_rules(source, JS_RULES)
    assert modern == source
    assert [warning.code for warning in warnings] == ["JS_EQUALITY_REVIEW_REQUIRED"]


@pytest.mark.parametrize(
    ("relative_path", "source"),
    [
        ("legacy.py", "for item in xrange(3):\n    pass\n"),
        ("legacy.js", "var answer = value == null;\n"),
    ],
)
def test_refactor_proposals_never_claim_automatic_safety(tmp_path, monkeypatch, relative_path, source) -> None:
    workspace = tmp_path / "workspace"
    raw = workspace / "raw"
    raw.mkdir(parents=True)
    (raw / relative_path).write_text(source, encoding="utf-8")
    monkeypatch.setattr("app.refactor.service.get_workspace_dir", lambda _: workspace)
    monkeypatch.setattr("app.analysis.service.get_workspace_dir", lambda _: workspace)
    engine = create_engine(f"sqlite:///{tmp_path / 'refactor.db'}")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        db.add(Project(id="p", display_name="sample", source_type="zip", content_hash="hash", workspace_id="w"))
        db.add(ProjectFile(id="f", project_id="p", relative_path=relative_path,
                           language="python" if relative_path.endswith(".py") else "javascript",
                           size_bytes=len(source), line_count=source.count("\n"), sha256_hash="hash"))
        db.commit()
        result = run_refactor_for_project(db, "p")
        assert result.changed_files == 1
        assert result.safe_to_apply_automatically is False
        assert result.files[0].syntax_valid is True
        assert result.findings
        assert result.finding_funnel.generated_diffs == 1
        assert result.finding_funnel.verified_changes == 0
        assert all(finding.confidence == "static" for finding in result.findings)
    engine.dispose()


def test_invalid_python_is_never_marked_valid() -> None:
    valid, message = _syntax_check("python", "def broken(:\n    pass\n")
    assert valid is False
    assert message and "Line 1" in message


# --- Regression: regex rules must not mutate string literals or comments ---

def test_python_xrange_inside_string_literal_is_not_substituted() -> None:
    """
    Regression: xrange() inside a string literal must never be replaced.
    Previously regex rules would match inside string content.
    """
    source = 'doc = "use xrange(n) in Python 2"\n'
    modern, changes, _ = _modernize_python(source)
    # The string content must be unchanged
    assert '"use xrange(n) in Python 2"' in modern, (
        "xrange inside a string literal was mutated — protected-ranges check failed"
    )
    # No changes should have been recorded since no real-code xrange exists
    assert len(changes) == 0, f"Unexpected changes on string-only source: {changes}"


def test_python_xrange_inside_comment_is_not_substituted() -> None:
    """
    Regression: xrange() inside a # comment must never be replaced.
    """
    source = "# This used xrange(n) in Python 2\nx = 1\n"
    modern, changes, _ = _modernize_python(source)
    assert "# This used xrange(n) in Python 2" in modern, (
        "xrange inside a comment was mutated — protected-ranges check failed"
    )
    assert len(changes) == 0, f"Unexpected changes on comment-only source: {changes}"


def test_python_xrange_in_real_code_is_still_substituted() -> None:
    """
    Confirm that real-code xrange() is still correctly replaced even when
    the same file has strings or comments containing the word 'xrange'.
    """
    source = (
        '# old: xrange(n)\n'
        'doc = "use xrange(n) for iteration"\n'
        'for i in xrange(10):\n'
        '    pass\n'
    )
    modern, changes, warnings = _modernize_python(source)
    # Real-code xrange must be substituted
    assert "for i in range(10):" in modern, "Real-code xrange was not replaced"
    # Comment xrange must be untouched
    assert "# old: xrange(n)" in modern, "Comment xrange was mutated"
    # String xrange must be untouched
    assert '"use xrange(n) for iteration"' in modern, "String xrange was mutated"
    # Exactly one change logged (the real-code occurrence)
    assert len(changes) == 1, f"Expected 1 change, got {len(changes)}: {changes}"
    assert any(w.code == "PY2_XRANGE" for w in warnings)
