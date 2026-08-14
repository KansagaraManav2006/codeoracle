"""Notification formatting and delivery facade."""
from utils.formatters import format_currency


class NotificationService:
    def order_confirmed(self, customer_id, order_id, total):
        return "Order %s for %s confirmed at %s" % (order_id, customer_id, format_currency(total))

    def payment_failed(self, customer_id, reason):
        return "Payment failed for %s: %s" % (customer_id, reason)


def send_message(address, message):
    return bool(address and message)
