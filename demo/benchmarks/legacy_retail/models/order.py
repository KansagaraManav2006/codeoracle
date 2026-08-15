"""Order domain model and state transitions."""
from datetime import datetime


class Order:
    def __init__(self, order_id, customer_id, items):
        self.id = order_id
        self.customer_id = customer_id
        self.items = list(items)
        self.status = "created"
        self.created_at = datetime.utcnow().isoformat()

    def mark_paid(self):
        if self.status != "created":
            raise ValueError("Only a new order can be paid")
        self.status = "paid"

    def as_dict(self):
        return {"id": self.id, "customer_id": self.customer_id, "items": self.items,
                "status": self.status, "created_at": self.created_at}
