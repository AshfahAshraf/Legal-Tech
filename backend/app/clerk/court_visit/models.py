from sqlalchemy import Column, Integer, String, Text, DateTime
from app.database import Base
from datetime import datetime

class ClerkCourtVisit(Base):
    __tablename__ = "clerk_court_visits"

    id = Column(Integer, primary_key=True, index=True)
    court_name = Column(String(255), nullable=False)
    court_hall = Column(String(100), nullable=True)
    judge_name = Column(String(255), nullable=True)
    purpose_of_visit = Column(String(255), nullable=True)
    visit_status = Column(String(50), default="Pending")  # Pending, In Court, Completed
    check_in_time = Column(String(100), nullable=True)
    check_out_time = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    visit_date = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
