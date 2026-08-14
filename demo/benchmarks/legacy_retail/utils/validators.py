"""Input validation shared by domain modules."""
import re


EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def is_valid_email(value):
    return bool(value and EMAIL_PATTERN.match(str(value)))


def is_valid_identifier(value):
    return bool(value and re.match(r"^[A-Z]+-[A-Z0-9]+$", str(value)))


def require_fields(payload, required):
    return [field for field in required if payload.get(field) in (None, "")]
