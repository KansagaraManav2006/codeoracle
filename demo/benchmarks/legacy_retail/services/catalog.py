"""Product lookup and availability rules."""


class ProductCatalog:
    def __init__(self, prices=None):
        self.prices = prices or {"BOOK-1": 24.5, "PEN-2": 3.0, "BAG-3": 18.0}

    def price_for(self, sku):
        if sku not in self.prices:
            raise KeyError("Unknown product: %s" % sku)
        return float(self.prices[sku])

    def contains(self, sku):
        return sku in self.prices

    def list_products(self):
        return sorted(self.prices.keys())
