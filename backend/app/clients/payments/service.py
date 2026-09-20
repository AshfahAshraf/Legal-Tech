from sqlalchemy.orm import Session
from typing import Optional, List

from app.advocate.finance_management.models import Invoice


# ── Read ────────────────────────────────────────────────────────────────────

def get_invoices_for_client(
    db: Session,
    email: Optional[str] = None,
    client_name: Optional[str] = None,
    status: Optional[str] = None,
) -> List[Invoice]:
    """Return all invoices that belong to the logged-in client."""
    query = db.query(Invoice)

    if email:
        query = query.filter(Invoice.email.ilike(f"%{email}%"))

    if client_name:
        query = query.filter(Invoice.client_name.ilike(f"%{client_name}%"))

    if status:
        query = query.filter(Invoice.status == status)

    return query.order_by(Invoice.created_at.desc()).all()


def get_invoice_by_id_for_client(
    db: Session,
    invoice_id: int,
    email: str,
) -> Optional[Invoice]:
    """Return a single invoice only if it belongs to the requesting client."""
    return (
        db.query(Invoice)
        .filter(Invoice.id == invoice_id, Invoice.email.ilike(f"%{email}%"))
        .first()
    )


# ── Payment ──────────────────────────────────────────────────────────────────

def pay_invoice(
    db: Session,
    invoice_id: int,
    email: str,
    gpay_number: Optional[str] = None,
    upi_id: Optional[str] = None,
) -> Optional[Invoice]:
    """Mark an invoice as Paid and optionally store the payment details."""
    invoice = get_invoice_by_id_for_client(db, invoice_id, email)

    if not invoice:
        return None

    invoice.status = "Paid"

    if gpay_number:
        invoice.gpay_number = gpay_number
    if upi_id:
        invoice.upi_id = upi_id

    db.commit()
    db.refresh(invoice)
    return invoice


# ── Summary ───────────────────────────────────────────────────────────────────

def get_payment_summary(db: Session, email: str) -> dict:
    """Aggregate totals for the client dashboard cards."""
    invoices = get_invoices_for_client(db, email=email)

    paid = [inv for inv in invoices if inv.status.lower() == "paid"]
    due = [inv for inv in invoices if inv.status.lower() in ("sent", "pending", "overdue")]

    return {
        "total_paid": sum(inv.grand_total for inv in paid),
        "total_due": sum(inv.grand_total for inv in due),
        "paid_count": len(paid),
        "due_count": len(due),
    }
