"""Utility functions for string formatting and data normalization."""
import re
from calculator import add, divide


def format_currency(amount, symbol="$"):
    """Formats numeric amount as currency string."""
    try:
        val = float(amount)
        if val < 0:
            return f"-{symbol}{abs(val):.2f}"
        return f"{symbol}{val:.2f}"
    except (ValueError, TypeError):
        return f"{symbol}0.00"


def calculate_average_price(total_price, item_count):
    """Calculates average price per item using calculator module."""
    if item_count <= 0:
        return 0.0
    return round(divide(total_price, item_count), 2)


def is_valid_identifier(name):
    """Checks if a string is a valid alphanumeric identifier."""
    if not name or not isinstance(name, str):
        return False
    return bool(re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", name))
