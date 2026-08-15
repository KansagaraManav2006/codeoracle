"""Sales report aggregation."""
from services.pricing import calculate_total
from utils.formatters import format_currency


def summarize_orders(orders):
    paid = [order for order in orders if order.get("status") == "paid"]
    revenue = sum(order.get("totals", {}).get("total", 0) for order in paid)
    return {"paid_orders": len(paid), "revenue": round(revenue, 2), "display_revenue": format_currency(revenue)}


def estimate_cart(lines):
    return calculate_total(lines)
