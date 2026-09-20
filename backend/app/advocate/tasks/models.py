from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from app.database import Base
from datetime import datetime


class Task(Base):
    __tablename__ = "advocate_tasks"

    id = Column(Integer, primary_key=True, index=True)

    # Core task info
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(String(50), default="Medium")  # Low, Medium, High, Urgent

    # Status: todo, progress, review, completed
    status = Column(String(50), default="todo")

    # Pin status
    is_pinned = Column(Boolean, default=False)

    # Deadline / time limit
    due_date = Column(String(100), nullable=True)

    # Assigned users (IDs)
    senior_advocate_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    junior_advocate_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Optional case linkage
    case_id = Column(Integer, nullable=True)           # FK to case_management_cases.id (nullable for standalone)
    case_title = Column(String(255), nullable=True)    # Denormalised for quick display
    case_no = Column(String(100), nullable=True)
    workflow_document_id = Column(Integer, nullable=True) # Optional link to case_document_workflows.id


    # Snapshot names for display (avoids extra joins on every load)
    senior_name = Column(String(255), nullable=True)
    junior_name = Column(String(255), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class TaskMessage(Base):
    """Chat / progress messages attached to a Task."""
    __tablename__ = "advocate_task_messages"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("advocate_tasks.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sender_name = Column(String(255), nullable=True)
    sender_role = Column(String(100), nullable=True)
    message = Column(Text, nullable=False)
    # Optional tag: progress | completed | todo | review | general
    message_type = Column(String(50), default="general")
    created_at = Column(DateTime, default=datetime.utcnow)
