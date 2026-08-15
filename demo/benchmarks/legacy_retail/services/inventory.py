"""Legacy inventory reservation service."""
STOCK = {"BOOK-1": 20, "PEN-2": 100, "BAG-3": 8}


def available(sku):
    return STOCK.get(sku, 0)


def reserve(sku, quantity):
    current = available(sku)
    if quantity <= 0 or quantity > current:
        return False
    STOCK[sku] = current - quantity
    return True


def release(sku, quantity):
    STOCK[sku] = available(sku) + max(0, quantity)
    return STOCK[sku]
