from sqlalchemy import Column, Integer, String, Text, Date, ForeignKey, DateTime, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base
from app.authapp.models import User


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)

    # Applicant details
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    applicant_name = Column(String(150), nullable=False)
    applicant_role = Column(String(50), nullable=False)  # Junior Advocate / Clerk / etc.

    # Leave Details
    leave_type = Column(String(100), nullable=False)  # Emergency Leave, Sick Leave, Floater Leave
    subject = Column(String(255), nullable=True)  # Small subject/summary
    description = Column(Text, nullable=False)  # Reason / Detailed description
    from_date = Column(Date, nullable=False)
    to_date = Column(Date, nullable=False)
    total_days = Column(Float, default=1.0)
    is_half_day = Column(String(50), nullable=True)  # "None", "First Half", "Second Half"

    # Status & Approval
    status = Column(String(50), default="Pending", nullable=False)  # Pending, Approved, Rejected, Cancelled
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approver_name = Column(String(150), nullable=True)
    rejection_reason = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    applicant = relationship("User", foreign_keys=[user_id])
    approver = relationship("User", foreign_keys=[approved_by_id])


class LeaveBalance(Base):
    __tablename__ = "leave_balances"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    financial_year = Column(String(20), default="FY 2026-27")

    # Leave Allocations & Used Counters
    emergency_leave_total = Column(Float, default=6.0)
    emergency_leave_used = Column(Float, default=0.0)

    sick_leave_total = Column(Float, default=4.0)
    sick_leave_used = Column(Float, default=0.0)

    floater_leave_total = Column(Float, default=2.0)
    floater_leave_used = Column(Float, default=0.0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])
