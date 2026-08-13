import ast
import re
from typing import List, Optional, Tuple


def validate_python_test_code(code: str, project_relative_paths: Optional[List[str]] = None) -> Tuple[bool, Optional[str]]:
    """Validates Python test code syntax using ast.parse and checks for obvious unsafe calls."""
    try:
        tree = ast.parse(code)
    except SyntaxError as se:
        return False, f"Python SyntaxError at line {se.lineno}: {se.msg}"
    except Exception as e:
        return False, f"Python AST Parse Error: {str(e)}"

    # Security check for dangerous top-level execution
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            func = node.func
            if isinstance(func, ast.Attribute):
                if func.attr in ("system", "popen", "rmtree") and isinstance(func.value, ast.Name) and func.value.id in ("os", "subprocess", "shutil"):
                    return False, f"Unsafe function call detected: {func.attr}"
            elif isinstance(func, ast.Name):
                if func.id in ("eval", "exec") and not any(isinstance(parent, ast.Call) for parent in ast.walk(tree)):
                    # Unsafe eval/exec in generated test code
                    return False, f"Unsafe function call detected: {func.id}"

    return True, None


def validate_javascript_test_code(code: str, project_relative_paths: Optional[List[str]] = None) -> Tuple[bool, Optional[str]]:
    """Validates JavaScript test code using syntax checks and safe patterns."""
    if not code or not code.strip():
        return False, "Empty test code"

    # Check for basic JS syntax errors (unbalanced braces/parentheses)
    stack = []
    pairs = {')': '(', '}': '{', ']': '['}
    in_string = False
    string_char = ''

    for char in code:
        if in_string:
            if char == string_char:
                in_string = False
            continue
        if char in ('"', "'", '`'):
            in_string = True
            string_char = char
            continue
        if char in ('(', '{', '['):
            stack.append(char)
        elif char in (')', '}', ']'):
            if not stack or stack[-1] != pairs[char]:
                return False, f"Unbalanced bracket/parentheses error near '{char}'"
            stack.pop()

    if stack:
        return False, f"Unclosed bracket/parentheses: {stack[-1]}"

    # Security check
    forbidden_patterns = [
        (r"child_process", "Forbidden module child_process"),
        (r"execSync\(", "Forbidden function call execSync"),
        (r"fs\.rmdirSync", "Forbidden filesystem destruction call"),
    ]
    for pattern, reason in forbidden_patterns:
        if re.search(pattern, code):
            return False, f"Unsafe JavaScript code detected: {reason}"

    return True, None
