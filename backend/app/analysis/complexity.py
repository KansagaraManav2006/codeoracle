import ast
from typing import Any
from app.analysis.models import ComplexitySummary


def get_complexity_rating(score: int) -> str:
    """Classifies cyclomatic complexity score into standard rating tiers."""
    if score <= 5:
        return "low"
    elif score <= 10:
        return "medium"
    elif score <= 20:
        return "high"
    else:
        return "critical"


def calculate_python_ast_complexity(node: ast.AST) -> int:
    """
    Calculates cyclomatic complexity for a Python AST node (function/method/module).
    Base score: 1.
    Increments for control flow branches, exception handlers, boolean operators, and comprehensions.
    """
    complexity = 1

    for child in ast.walk(node):
        # Skip top-level node itself if walk visits it
        if child is node:
            continue

        if isinstance(child, (ast.If, ast.For, ast.AsyncFor, ast.While, ast.ExceptHandler, ast.With, ast.AsyncWith)):
            complexity += 1
        elif isinstance(child, ast.BoolOp):
            # len(values) - 1 decision points for 'and' / 'or'
            complexity += max(len(child.values) - 1, 1)
        elif isinstance(child, (ast.ListComp, ast.SetComp, ast.DictComp, ast.GeneratorExp)):
            complexity += len(child.generators)
            for gen in child.generators:
                complexity += len(gen.ifs)
        elif hasattr(ast, "Match") and isinstance(child, ast.Match):  # Python 3.10+ match
            complexity += len(child.cases)

    return complexity


def calculate_javascript_treesitter_complexity(node: Any) -> int:
    """
    Calculates cyclomatic complexity for a tree-sitter JavaScript AST node.
    Base score: 1.
    Increments for branch nodes and boolean operators.
    """
    complexity = 1

    BRANCH_TYPES = {
        "if_statement",
        "ternary_expression",
        "for_statement",
        "for_in_statement",
        "while_statement",
        "do_statement",
        "catch_clause",
        "switch_case",
    }

    # Helper function for recursive traversal
    def traverse(n: Any) -> None:
        nonlocal complexity
        if n is None:
            return

        ntype = n.type
        if ntype in BRANCH_TYPES:
            complexity += 1
        elif ntype == "binary_expression":
            # Check for logical operators &&, ||, ??
            for c in n.children:
                if c.type in ("&&", "||", "??"):
                    complexity += 1
                    break

        for child in n.children:
            traverse(child)

    # Traverse child nodes of given function/module root
    for child in node.children:
        traverse(child)

    return complexity


def summarize_module_complexity(symbol_complexities: list[int]) -> ComplexitySummary:
    """Summarizes overall complexity for a module based on its functions and methods."""
    if not symbol_complexities:
        return ComplexitySummary(cyclomatic_complexity=1, rating="low", hotspots_count=0)

    max_comp = max(symbol_complexities)
    hotspots = sum(1 for c in symbol_complexities if c > 10)
    rating = get_complexity_rating(max_comp)

    return ComplexitySummary(
        cyclomatic_complexity=max_comp,
        rating=rating,
        hotspots_count=hotspots,
    )
