"""Existing regression examples for the core pricing rules."""
from services.pricing import calculate_total, discount_for, line_total


def test_line_total():
    assert line_total(10, 3) == 30.0


def test_priority_discount():
    assert discount_for(200, "priority") == 30.0


def test_total_contains_tax():
    result = calculate_total([{"price": 25, "quantity": 2}], tax_rate=0.10)
    assert result["total"] == 55.0
