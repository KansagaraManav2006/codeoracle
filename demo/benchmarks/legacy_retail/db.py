"""Small in-memory persistence adapter used by the demonstration."""
ORDERS = {}
CUSTOMERS = {}


def save_order(order):
    ORDERS[order["id"]] = dict(order)
    return ORDERS[order["id"]]


def get_order(order_id):
    return ORDERS.get(order_id)


def save_customer(customer):
    CUSTOMERS[customer["id"]] = dict(customer)
    return CUSTOMERS[customer["id"]]


def clear_all():
    ORDERS.clear()
    CUSTOMERS.clear()
