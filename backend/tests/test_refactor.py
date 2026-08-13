from app.refactor.service import JS_RULES, _apply_rules, _modernize_python, _syntax_check


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
    assert modern == "let answer = value === 42;\n"
    assert len(changes) == 2
    assert all(warning.breaking_change for warning in warnings)


def test_invalid_python_is_never_marked_valid() -> None:
    valid, message = _syntax_check("python", "def broken(:\n    pass\n")
    assert valid is False
    assert message and "Line 1" in message
