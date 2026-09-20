from sqlalchemy import Column, Integer, String, Date, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Consultation(Base):
    __tablename__ = "consultations"

    id = Column(Integer, primary_key=True, index=True)

    # Client info (linked to User model if user is registered, or string for guest clients)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    client_name = Column(String(150), nullable=False)

  

    # Schedule details
    date = Column(Date, nullable=False)
    time = Column(String(50), nullable=False)  # E.g., "11:00 AM"
    type = Column(String(100), nullable=False)  # "Video Call", "Chat", "Person to Person"
    meeting_link = Column(String(500), nullable=True)

    # Legal matters
    issue = Column(String(255), nullable=True)  # E.g. "Civil Dispute"
    fee = Column(String(50), nullable=True, default="₹500")

    # Status
    status = Column(String(50), nullable=False, default="Pending")  # "Pending", "Approved", "Rescheduled", "Completed", "Scheduled"

    # Completion details
    duration = Column(String(50), nullable=True)  # E.g., "30 mins"
    summary = Column(String(500), nullable=True)  # Consultation notes summary

    # Reschedule notes
    reschedule_reason = Column(String(500), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)

    # Relationships
    client = relationship("User", foreign_keys=[client_id])
