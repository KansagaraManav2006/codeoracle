"""Adapter around an old callback-oriented payment provider."""


class LegacyPaymentGateway:
    def charge(self, customer_id, amount):
        if not customer_id or amount <= 0:
            return {"ok": False, "reason": "invalid payment"}
        return {"ok": True, "transaction_id": "TX-%s-%d" % (customer_id, int(amount * 100))}


def refund(transaction_id, amount):
    if not transaction_id:
        raise ValueError("Transaction is required")
    return {"ok": amount > 0, "transaction_id": transaction_id, "amount": amount}
