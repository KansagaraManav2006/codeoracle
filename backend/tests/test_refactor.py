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
    engine.dispose()


def test_invalid_python_is_never_marked_valid() -> None:
    valid, message = _syntax_check("python", "def broken(:\n    pass\n")
    assert valid is False
    assert message and "Line 1" in message
