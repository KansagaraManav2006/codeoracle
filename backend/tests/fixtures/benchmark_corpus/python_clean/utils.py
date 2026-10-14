"""Clean mathematical utility functions with zero dependencies."""

def add(a: float, b: float) -> float:
    """Returns the sum of a and b."""
    return a + b

def multiply(a: float, b: float) -> float:
    """Returns the product of a and b."""
    return a * b

def format_currency(amount: float) -> str:
    """Formats an amount into a USD string."""
    if amount < 0:
        return f"-${abs(amount):.2f}"
    return f"${amount:.2f}"
