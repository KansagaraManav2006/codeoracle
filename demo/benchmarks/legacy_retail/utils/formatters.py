"""Presentation helpers retained for compatibility."""


def format_currency(amount, currency="USD"):
    symbols = {"USD": "$", "EUR": "€", "INR": "₹"}
    return "%s%.2f" % (symbols.get(currency, currency + " "), float(amount))


def humanize_status(status):
    return str(status or "unknown").replace("_", " ").title()


def compact_identifier(value):
    return str(value).strip().upper().replace(" ", "-")
