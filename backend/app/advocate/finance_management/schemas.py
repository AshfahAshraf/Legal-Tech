from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# Schema checks and controls data before saving or sending

class InvoiceBase(BaseModel):
    # Client Details
    client_name: str
    case_number: Optional[str] = None
    mobile_number: Optional[str] = None
    email: Optional[str] = None

    # Payment Details
    payment_method: Optional[str] = None
    gpay_number: Optional[str] = None
    upi_id: Optional[str] = None

    # Court Fee Details
    court_fee_case_type: Optional[str] = None
    court_fee_amount: Optional[float] = 0.0
    court_fee_jurisdiction: Optional[str] = None

    # Stamp Duty Details
    stamp_duty_doc_type: Optional[str] = None
    stamp_duty_amount: Optional[float] = 0.0
    stamp_duty_state: Optional[str] = None

    # Advocate Fee Details
    advocate_fee_case_type: Optional[str] = None
    advocate_fee_amount: Optional[float] = 0.0
    advocate_fee_remarks: Optional[str] = None

    # Filing Cost Details
    filing_cost_pages: Optional[int] = 0
    filing_cost_amount: Optional[float] = 0.0
    filing_cost_notes: Optional[str] = None


class InvoiceCreate(InvoiceBase):
    advocate_id: Optional[int] = None
    status: Optional[str] = "Sent"


class InvoiceUpdateStatus(BaseModel):
    status: str
    gpay_number: Optional[str] = None
    upi_id: Optional[str] = None


class InvoiceOut(InvoiceBase):
    id: int
    advocate_id: Optional[int] = None

    subtotal: float
    gst: float
    grand_total: float

    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class InvoiceStats(BaseModel):
    total_invoiced: float
    total_paid: float
    total_pending: float
    total_overdue: float
    invoice_count: int


# Razorpay Order Create Schema
class CreateOrderSchema(BaseModel):
    amount: float
    invoice_id: int


# Razorpay Payment Verify Schema
class VerifyPaymentSchema(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    invoice_id: int