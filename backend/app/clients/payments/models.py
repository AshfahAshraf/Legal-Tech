# Re-export the shared Invoice model so service.py can import from here
# without redefining a duplicate SQLAlchemy mapping on the same table.
from app.advocate.finance_management.models import Invoice as ClientPayment

__all__ = ["ClientPayment"]
