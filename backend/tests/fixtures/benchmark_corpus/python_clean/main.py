"""Application CLI runtime entry point."""
from .service import BillingService

def run_cli() -> None:
    service = BillingService()
    result = service.calculate_total(100.0)
    print(f"Total: {result}")

if __name__ == "__main__":
    run_cli()
