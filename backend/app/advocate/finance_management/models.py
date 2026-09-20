from sqlalchemy import Column, Integer, String, Float, Boolean, Text, Date, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)

    # ── Advocate (linked to User) ────────────────────────────────────────────
    advocate_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # ── Client Details ───────────────────────────────────────────────────────
    client_name    = Column(String(150), nullable=False)
    case_number    = Column(String(100), nullable=True)
    mobile_number  = Column(String(50),  nullable=True)
    email          = Column(String(150), nullable=True)

    # ── Court / Case Context (new) ───────────────────────────────────────────
    court_type         = Column(String(100), nullable=True)   # e.g. "District Court"
    case_type_category = Column(String(150), nullable=True)   # e.g. "Civil Money Suit"
    suit_value         = Column(Float, default=0.0)           # Subject-matter value (₹)
    efiling_mode       = Column(String(50),  nullable=True)   # Physical / e-Filing / DCMS

    # ── Court Fee (auto-calculated, may be overridden) ───────────────────────
    court_fee_amount          = Column(Float, default=0.0)
    court_fee_case_type       = Column(String(150), nullable=True)   # legacy / display label
    court_fee_jurisdiction    = Column(String(150), nullable=True)
    is_court_fee_overridden   = Column(Boolean, default=False)       # True when advocate changed calc'd fee
    court_fee_override_note   = Column(String(255), nullable=True)   # Reason for override

    # ── Welfare Fund & Stipend Stamps (auto-calculated) ──────────────────────
    vakalatnama_count    = Column(Integer, default=1)
    welfare_fund_amount  = Column(Float, default=0.0)
    stipend_stamp_amount = Column(Float, default=0.0)

    # ── Stamp Duty ───────────────────────────────────────────────────────────
    stamp_duty_doc_type  = Column(String(150), nullable=True)
    stamp_duty_amount    = Column(Float, default=0.0)
    stamp_duty_state     = Column(String(100), nullable=True, default="Kerala")

    # ── Advocate Professional Fee ────────────────────────────────────────────
    advocate_fee_case_type = Column(String(150), nullable=True)
    advocate_fee_amount    = Column(Float, default=0.0)
    advocate_fee_basis     = Column(String(50),  nullable=True)   # Fixed / Per Hearing / Per Stage
    advocate_fee_remarks   = Column(String(255), nullable=True)

    # ── e-Filing / DCMS Charges ──────────────────────────────────────────────
    efiling_charge = Column(Float, default=0.0)

    # ── Miscellaneous Expenses (JSON array stored as Text) ───────────────────
    # Format: [{"type": "...", "description": "...", "amount": 100.0}, ...]
    misc_expenses_json = Column(Text, nullable=True)

    # ── Legacy Paper Filing Fields (kept for backward compat) ────────────────
    filing_cost_pages  = Column(Integer, default=0)
    filing_cost_amount = Column(Float, default=0.0)
    filing_cost_notes  = Column(String(255), nullable=True)

    # ── GST (18% on advocate fee only, optional) ─────────────────────────────
    gstin       = Column(String(20), nullable=True)   # Advocate's GSTIN (optional)
    apply_gst   = Column(Boolean, default=False)
    gst         = Column(Float, default=0.0)

    # ── Totals ───────────────────────────────────────────────────────────────
    subtotal    = Column(Float, default=0.0)
    grand_total = Column(Float, default=0.0)

    # ── Payment Details ───────────────────────────────────────────────────────
    payment_method = Column(String(50),  nullable=True)
    gpay_number    = Column(String(50),  nullable=True)
    upi_id         = Column(String(100), nullable=True)

    # ── Status & Dates ────────────────────────────────────────────────────────
    status   = Column(String(50), default="Pending")  # Pending | Sent | Paid | Overdue
    due_date = Column(Date, nullable=True)
    paid_at  = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # ── Relationships ─────────────────────────────────────────────────────────
    advocate = relationship("User", foreign_keys=[advocate_id])


# ──────────────────────────────────────────────────────────────────────────────
# Expense Entry Model — daily advocate expense tracker per case
# ──────────────────────────────────────────────────────────────────────────────
class ExpenseEntry(Base):
    __tablename__ = "expense_entries"

    id           = Column(Integer, primary_key=True, index=True)
    advocate_id  = Column(Integer, ForeignKey("users.id"), nullable=True)

    case_number  = Column(String(100), nullable=True)
    case_title   = Column(String(255), nullable=True)

    expense_type  = Column(String(100), nullable=False)   # From MISC_EXPENSE_TYPES list
    description   = Column(String(500), nullable=True)
    amount        = Column(Float, nullable=False, default=0.0)
    receipt_no    = Column(String(100), nullable=True)
    expense_date  = Column(Date, nullable=True)

    # Optional: whether this expense was added to an invoice
    invoiced      = Column(Boolean, default=False)
    invoice_id    = Column(Integer, ForeignKey("invoices.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    advocate = relationship("User", foreign_keys=[advocate_id])
    invoice  = relationship("Invoice", foreign_keys=[invoice_id])
