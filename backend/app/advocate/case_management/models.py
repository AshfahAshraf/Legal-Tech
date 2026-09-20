
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.mysql import LONGTEXT, LONGBLOB
from app.database import Base
from app.authapp.models import User
from datetime import datetime


class Case(Base):
    __tablename__ = "case_management_cases"

    id = Column(Integer, primary_key=True, index=True)

    case_id = Column(String(100))
    cnr_number = Column(String(100), nullable=True)
    case_title = Column(String(255))
    case_no = Column(String(100))
    case_type = Column(String(100))
    case_description = Column(Text)

    client_name = Column(String(255))
    contact_number = Column(String(50))
    alt_contact_number = Column(String(50), nullable=True)  # Alternative mobile number
    email_id = Column(String(255))
    client_role = Column(String(50), nullable=True)
    client_address = Column(Text, nullable=True)
    client_district = Column(String(100), nullable=True)

    court_name = Column(String(255))
    court_type = Column(String(100))

    status = Column(String(50))
    selected_advocate = Column(String(255), nullable=True)
    documents = Column(LONGTEXT, nullable=True)
    next_hearing_date = Column(String(100), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)

class UploadedFile(Base):
    __tablename__ = "uploaded_files"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    content_type = Column(String(100), nullable=True)
    data = Column(LONGBLOB, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class CaseDocumentWorkflow(Base):
    __tablename__ = "case_document_workflows"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, nullable=False)  # References case_management_cases.id
    case_no = Column(String(100), nullable=False)
    case_title = Column(String(255), nullable=False)

    title = Column(String(255), nullable=False)
    document_type = Column(String(100), nullable=False)  # e.g., 'Petition', 'Affidavit', 'Other'
    content = Column(Text, nullable=True)  # Inline draft text
    file_url = Column(String(500), nullable=True)  # If uploaded

    junior_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    senior_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Status: 'Draft', 'Pending Review', 'Approved', 'Needs Correction'
    status = Column(String(50), default="Draft", nullable=False)
    senior_feedback = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    junior = relationship("User", foreign_keys=[junior_id])
    senior = relationship("User", foreign_keys=[senior_id])


class AIDocumentHistory(Base):
    __tablename__ = "ai_document_histories"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("case_management_cases.id", ondelete="CASCADE"), nullable=True)
    case_no = Column(String(100), nullable=True)
    case_title = Column(String(255), nullable=True)
    prompt = Column(Text, nullable=False)
    content = Column(LONGTEXT, nullable=False)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    case = relationship(Case, backref="ai_document_histories")

    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)


class CaseNote(Base):
    """Internal advocate notes & tasks for a specific case."""
    __tablename__ = "case_notes"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("case_management_cases.id", ondelete="CASCADE"), nullable=False)
    text = Column(Text, nullable=False)
    category = Column(String(100), default="General Note")  # Action Item, Reminder, General Note, Completed
    author = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    case = relationship(Case, backref="notes")

    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)

