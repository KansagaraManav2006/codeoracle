"""Billing service that imports from local utils and standard library math."""
import math
from .utils import add, format_currency, multiply

class BillingService:
    def __init__(self, tax_rate: float = 0.05):
        self.tax_rate = tax_rate

    def calculate_total(self, subtotal: float) -> str:
        if subtotal < 0:
            raise ValueError("Subtotal must be non-negative")
        tax = multiply(subtotal, self.tax_rate)
        total = add(subtotal, tax)
        rounded = math.ceil(total * 100.0) / 100.0
        return format_currency(rounded)
