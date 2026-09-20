from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class EFilingBase(BaseModel):
    court_name: str
    case_details: str
    uploaded_documents: Optional[str] = None
    is_validated: Optional[bool] = False
    acknowledgement_number: Optional[str] = None
    filing_receipt_url: Optional[str] = None
    filing_status: Optional[str] = "Draft"
    submitted_at: Optional[str] = None
    notes: Optional[str] = None

class EFilingCreate(EFilingBase):
    pass

class EFilingUpdate(BaseModel):
    court_name: Optional[str] = None
    case_details: Optional[str] = None
    uploaded_documents: Optional[str] = None
    is_validated: Optional[bool] = None
    acknowledgement_number: Optional[str] = None
    filing_receipt_url: Optional[str] = None
    filing_status: Optional[str] = None
    submitted_at: Optional[str] = None
    notes: Optional[str] = None

class EFilingOut(EFilingBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
