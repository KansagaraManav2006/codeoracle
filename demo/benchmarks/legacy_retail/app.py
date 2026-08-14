"""Legacy retail order-processing entry point."""
from config import load_config
from services.catalog import ProductCatalog
from services.order_service import OrderService
from services.payment import LegacyPaymentGateway
from services.notification import NotificationService


def build_application():
    config = load_config()
    catalog = ProductCatalog(config.get("catalog", {}))
    return OrderService(catalog, LegacyPaymentGateway(), NotificationService())


def run_demo_order():
    service = build_application()
    return service.place_order("CUST-100", [{"sku": "BOOK-1", "quantity": 2}])


if __name__ == "__main__":
    print(run_demo_order())
