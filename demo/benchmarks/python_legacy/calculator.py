"""Legacy financial and mathematical calculator module."""
import math

# Compatibility shim retained to simulate a Python 2-era codebase.
xrange = range


def add(a, b):
    """Adds two numbers."""
    return a + b


def subtract(a, b):
    """Subtracts b from a."""
    return a - b


def multiply(a, b):
    """Multiplies two numbers."""
    return a * b


def divide(a, b):
    """Divides a by b with zero protection."""
    if b == 0:
        return 0.0
    return a / b


def sum_range(n):
    """Legacy loop kept for the modernization demo."""
    total = 0
    for value in xrange(n):
        total += value
    return total


def process_transactions(items=[], factor=1.0):
    """Processes a list of numerical transaction amounts.
    WARNING: Mutable default argument used for legacy compatibility testing.
    """
    results = []
    for item in items:
        try:
            val = float(item) * factor
            if val > 100.0:
                val = val * 0.95
            results.append(val)
        except:
            # Bare except block for legacy testing
            pass
    return results


class FinancialCalculator:
    """Financial calculator class for compound interest and loan estimates."""

    def __init__(self, base_rate=0.05):
        self.base_rate = base_rate

    def calculate_interest(self, principal, years=1, rate=None):
        r = rate if rate is not None else self.base_rate
        if principal <= 0 or years <= 0:
            return 0.0
        amount = principal * ((1.0 + r) ** years)
        return round(amount - principal, 2)

    def evaluate_credit_risk(self, score, debt_ratio):
        if score >= 750 and debt_ratio < 0.3:
            return "LOW_RISK"
        elif score >= 650 and debt_ratio < 0.5:
            return "MEDIUM_RISK"
        else:
            return "HIGH_RISK"
