"""Central order orchestration with intentionally coupled legacy responsibilities."""
from db import save_order
from models.order import Order
from services.inventory import reserve, release
from services.pricing import calculate_total


class OrderService:
    def __init__(self, catalog, payment_gateway, notifier):
        self.catalog = catalog
        self.payment_gateway = payment_gateway
        self.notifier = notifier

    def place_order(self, customer_id, requested_items):
        lines = []
        reserved = []
        try:
            for item in requested_items:
                sku = item["sku"]
                quantity = int(item.get("quantity", 1))
                if not self.catalog.contains(sku) or not reserve(sku, quantity):
                    raise ValueError("Product unavailable: %s" % sku)
                reserved.append((sku, quantity))
                lines.append({"sku": sku, "quantity": quantity, "price": self.catalog.price_for(sku)})
            totals = calculate_total(lines)
            order = Order("ORD-%s-%d" % (customer_id, len(lines)), customer_id, lines)
            payment = self.payment_gateway.charge(customer_id, totals["total"])
            if not payment.get("ok"):
                raise ValueError(payment.get("reason", "payment rejected"))
            order.mark_paid()
            record = order.as_dict()
            record["totals"] = totals
            record["transaction_id"] = payment["transaction_id"]
            save_order(record)
            record["message"] = self.notifier.order_confirmed(customer_id, order.id, totals["total"])
            return record
        except:
            for sku, quantity in reserved:
                release(sku, quantity)
            raise
