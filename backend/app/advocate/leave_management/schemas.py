from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime


class LeaveApplySchema(BaseModel):
    leave_type: str  # Emergency Leave, Sick Leave, Floater Leave
    subject: Optional[str] = None
    description: Optional[str] = ""
    from_date: date
    to_date: date
    total_days: Optional[float] = None
    is_half_day: Optional[str] = "None"


class LeaveStatusUpdateSchema(BaseModel):
    status: str  # Approved / Rejected
    rejection_reason: Optional[str] = None


class LeaveOutSchema(BaseModel):
    id: int
    user_id: int
    applicant_name: str
    applicant_role: str
    leave_type: str
    subject: Optional[str] = None
    description: Optional[str] = ""
    from_date: date
    to_date: date
    total_days: float
    is_half_day: Optional[str] = None
    status: str
    approved_by_id: Optional[int] = None
    approver_name: Optional[str] = None
    rejection_reason: Optional[str] = None
    reassigned_cases_count: Optional[int] = 0
    reassigned_details: Optional[List[str]] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LeaveBalanceItem(BaseModel):
    total: float
    used: float
    remaining: float


class LeaveBalanceOutSchema(BaseModel):
    financial_year: str
    emergency_leave: LeaveBalanceItem
    sick_leave: LeaveBalanceItem
    floater_leave: LeaveBalanceItem

    class Config:
        from_attributes = True
