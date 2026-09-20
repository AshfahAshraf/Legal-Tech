from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from app.database import Base
from datetime import datetime

class ClerkEFilingRecord(Base):
    __tablename__ = "clerk_efilings"

    id = Column(Integer, primary_key=True, index=True)
    court_name = Column(String(255), nullable=False)
    case_details = Column(Text, nullable=False)
    uploaded_documents = Column(Text, nullable=True)
    is_validated = Column(Boolean, default=False)
    acknowledgement_number = Column(String(100), nullable=True)
    filing_receipt_url = Column(String(500), nullable=True)
    filing_status = Column(String(50), default="Draft")
    submitted_at = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
