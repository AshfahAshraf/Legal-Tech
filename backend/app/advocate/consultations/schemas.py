from pydantic import BaseModel
from datetime import date as date_type, datetime
from typing import Optional

class ConsultationBase(BaseModel):
    client_name: str
    date: date_type
    time: str
    type: str
    issue: Optional[str] = None
    fee: Optional[str] = "₹500"

class ConsultationCreate(ConsultationBase):
    client_id: Optional[int] = None

class ConsultationStart(BaseModel):
    client_name: str
    client_email: Optional[str] = None
    type: str
    date: date_type
    time: str
    meeting_link: Optional[str] = None
    status: Optional[str] = "Pending Client"

class ConsultationReschedule(BaseModel):
    date: date_type
    time: str
    reason: Optional[str] = None
    status: Optional[str] = None

class ConsultationUpdateStatus(BaseModel):
    status: str

class ConsultationOut(BaseModel):
    id: int
    client_id: Optional[int]
    client_name: str
    
    date: date_type
    time: str
    type: str
    meeting_link: Optional[str]
    issue: Optional[str]
    fee: Optional[str]
    status: str
    duration: Optional[str]
    summary: Optional[str]
    reschedule_reason: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class ConsultationStats(BaseModel):
    total_consultations: int
    video_calls: int
    chat_consultations: int
