from sqlalchemy.orm import Session  
# Used to connect and work with database

from typing import Optional, List
from .models import Invoice
from .schemas import InvoiceCreate

# gets invoice list and filters

def get_invoices(
    db: Session,
    advocate_id: Optional[int] = None,
    status: Optional[str] = None,
    client_name: Optional[str] = None,
    email: Optional[str] = None
) -> List[Invoice]:
    query = db.query(Invoice)

    if advocate_id is not None:
        query = query.filter(Invoice.advocate_id == advocate_id)

    if status is not None:
        query = query.filter(Invoice.status == status)

    if client_name is not None:
        query = query.filter(Invoice.client_name.ilike(f"%{client_name}%"))

    if email is not None:
        query = query.filter(Invoice.email.ilike(f"%{email}%"))

    return query.order_by(Invoice.created_at.desc()).all()

# get one invoice using ID.

def get_invoice_by_id(db: Session, invoice_id: int) -> Optional[Invoice]:
    return db.query(Invoice).filter(Invoice.id == invoice_id).first()


def create_invoice(db: Session, data: InvoiceCreate) -> Invoice:
    # Calculate totals
    subtotal = (
        (data.court_fee_amount or 0.0) +
        (data.stamp_duty_amount or 0.0) +
        (data.advocate_fee_amount or 0.0) +
        (data.filing_cost_amount or 0.0)
    )

    gst = round((data.advocate_fee_amount or 0.0) * 0.18, 2)
    grand_total = subtotal + gst

    new_invoice = Invoice(
        advocate_id=data.advocate_id,
        client_name=data.client_name,
        case_number=data.case_number,
        mobile_number=data.mobile_number,
        email=data.email,

        # Payment details
        payment_method=data.payment_method,
        gpay_number=data.gpay_number,
        upi_id=data.upi_id,

        # Court fee
        court_fee_case_type=data.court_fee_case_type,
        court_fee_amount=data.court_fee_amount,
        court_fee_jurisdiction=data.court_fee_jurisdiction,

        # Stamp duty
        stamp_duty_doc_type=data.stamp_duty_doc_type,
        stamp_duty_amount=data.stamp_duty_amount,
        stamp_duty_state=data.stamp_duty_state,

        # Advocate fee
        advocate_fee_case_type=data.advocate_fee_case_type,
        advocate_fee_amount=data.advocate_fee_amount,
        advocate_fee_remarks=data.advocate_fee_remarks,

        # Filing cost
        filing_cost_pages=data.filing_cost_pages,
        filing_cost_amount=data.filing_cost_amount,
        filing_cost_notes=data.filing_cost_notes,

        # Totals
        subtotal=subtotal,
        gst=gst,
        grand_total=grand_total,

        # Status
        status=data.status or "Sent"
    )

    db.add(new_invoice)
    db.commit()
    db.refresh(new_invoice)

    return new_invoice

# find invoice and change its status.

def update_invoice_status(db: Session, invoice_id: int, status: str) -> Optional[Invoice]:
    invoice = get_invoice_by_id(db, invoice_id)

    if not invoice:
        return None

    invoice.status = status
    db.commit()
    db.refresh(invoice)

    return invoice

# deletes an invoice

def delete_invoice(db: Session, invoice_id: int) -> bool:
    invoice = get_invoice_by_id(db, invoice_id)

    if not invoice:
        return False

    db.delete(invoice)
    db.commit()

    return True

# invoice report/summary

def get_invoice_stats(db: Session, advocate_id: Optional[int] = None) -> dict:
    query = db.query(Invoice)

    if advocate_id is not None:
        query = query.filter(Invoice.advocate_id == advocate_id)

    invoices = query.all()

    total_invoiced = sum(inv.grand_total for inv in invoices)
    total_paid = sum(inv.grand_total for inv in invoices if inv.status.lower() == "paid")
    total_pending = sum(inv.grand_total for inv in invoices if inv.status.lower() in ("pending", "sent"))
    total_overdue = sum(inv.grand_total for inv in invoices if inv.status.lower() == "overdue")

    return {
        "total_invoiced": total_invoiced,
        "total_paid": total_paid,
        "total_pending": total_pending,
        "total_overdue": total_overdue,
        "invoice_count": len(invoices)
    }