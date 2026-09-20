from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CourtVisitBase(BaseModel):
    court_name: str
    court_hall: Optional[str] = None
    judge_name: Optional[str] = None
    purpose_of_visit: Optional[str] = None
    visit_status: Optional[str] = "Pending"
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    notes: Optional[str] = None
    visit_date: Optional[str] = None

class CourtVisitCreate(CourtVisitBase):
    pass

class CourtVisitUpdate(BaseModel):
    court_name: Optional[str] = None
    court_hall: Optional[str] = None
    judge_name: Optional[str] = None
    purpose_of_visit: Optional[str] = None
    visit_status: Optional[str] = None
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    notes: Optional[str] = None
    visit_date: Optional[str] = None

class CourtVisitOut(CourtVisitBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
