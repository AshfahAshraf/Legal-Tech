from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ClientPaymentOut(BaseModel):
    """Schema for returning invoice data to the client portal."""
    id: int
    advocate_id: Optional[int] = None

    # Client Details
    client_name: str
    case_number: Optional[str] = None
    mobile_number: Optional[str] = None
    email: Optional[str] = None

    # Payment Details
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

    # Totals
    subtotal: float
    gst: float
    grand_total: float

    # Status & Date
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class ClientPayNow(BaseModel):
    """Payload sent by the client when confirming a payment."""
    gpay_number: Optional[str] = None
    upi_id: Optional[str] = None


class ClientPaymentSummary(BaseModel):
    """Aggregated totals for the client dashboard."""
    total_paid: float
    total_due: float
    paid_count: int
    due_count: int
