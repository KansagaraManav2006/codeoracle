# modern_python fixture
def calculate_total(prices: list[float], discount: float = 0.0) -> float:
    """Calculates total with optional discount."""
    if discount < 0 or discount > 1.0:
        raise ValueError("Invalid discount range")
    total = sum(prices)
    return total * (1.0 - discount)

class PriceCalculator:
    def __init__(self, tax_rate: float = 0.05):
        self.tax_rate = tax_rate

    async def compute(self, items: list[float]) -> float:
        base = calculate_total(items)
        return base * (1.0 + self.tax_rate)

if __name__ == "__main__":
    calc = PriceCalculator()
    print("Done")
