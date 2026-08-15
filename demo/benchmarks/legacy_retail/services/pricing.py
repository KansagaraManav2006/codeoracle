"""Pricing, discount and tax calculations."""


def line_total(unit_price, quantity):
    if quantity <= 0:
        raise ValueError("Quantity must be positive")
    return round(float(unit_price) * int(quantity), 2)


def discount_for(subtotal, customer_type="standard"):
    if customer_type == "priority" and subtotal >= 100:
        return round(subtotal * 0.15, 2)
    if subtotal >= 250:
        return round(subtotal * 0.10, 2)
    if subtotal >= 100:
        return round(subtotal * 0.05, 2)
    return 0.0


def calculate_total(lines, tax_rate=0.08, customer_type="standard"):
    subtotal = round(sum(line_total(item["price"], item["quantity"]) for item in lines), 2)
    discount = discount_for(subtotal, customer_type)
    taxable = subtotal - discount
    tax = round(taxable * tax_rate, 2)
    return {"subtotal": subtotal, "discount": discount, "tax": tax, "total": round(taxable + tax, 2)}
