"""Customer domain model."""
from utils.validators import is_valid_email


class Customer:
    def __init__(self, customer_id, name, email, tags=[]):
        if not is_valid_email(email):
            raise ValueError("Invalid customer email")
        self.id = customer_id
        self.name = name
        self.email = email
        self.tags = tags

    def is_priority(self):
        return "priority" in self.tags

    def as_dict(self):
        return {"id": self.id, "name": self.name, "email": self.email, "tags": list(self.tags)}
