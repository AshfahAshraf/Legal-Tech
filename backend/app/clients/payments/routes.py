from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import SessionLocal
from .schemas import ClientPaymentOut, ClientPayNow, ClientPaymentSummary
from . import service

router = APIRouter(prefix="/clients/payments", tags=["Client Payments"])


# ── DB dependency ─────────────────────────────────────────────────────────────

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/invoices", response_model=List[ClientPaymentOut])
def list_my_invoices(
    email: str = Query(..., description="Logged-in client email"),
    status: Optional[str] = Query(None, description="Filter by status: Sent | Pending | Paid | Overdue"),
    db: Session = Depends(get_db),
):
    """
    Return all invoices for the client identified by *email*.
    The frontend passes the email decoded from the JWT token.
    """
    return service.get_invoices_for_client(db, email=email, status=status)


@router.get("/invoices/{invoice_id}", response_model=ClientPaymentOut)
def get_my_invoice(
    invoice_id: int,
    email: str = Query(..., description="Logged-in client email"),
    db: Session = Depends(get_db),
):
    """Return a single invoice only if it belongs to the requesting client."""
    invoice = service.get_invoice_by_id_for_client(db, invoice_id, email)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found or access denied.")
    return invoice


@router.put("/invoices/{invoice_id}/pay", response_model=ClientPaymentOut)
def pay_invoice(
    invoice_id: int,
    email: str = Query(..., description="Logged-in client email"),
    data: ClientPayNow = ...,
    db: Session = Depends(get_db),
):
    """
    Mark an invoice as *Paid* and optionally store GPay / UPI details.
    Only the invoice owner (matched by email) can trigger payment.
    """
    invoice = service.pay_invoice(
        db,
        invoice_id=invoice_id,
        email=email,
        gpay_number=data.gpay_number,
        upi_id=data.upi_id,
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found or access denied.")
    return invoice


@router.get("/summary", response_model=ClientPaymentSummary)
def get_summary(
    email: str = Query(..., description="Logged-in client email"),
    db: Session = Depends(get_db),
):
    """Return aggregated payment totals for the client dashboard cards."""
    return service.get_payment_summary(db, email=email)
