from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Optional[str] = "Medium"
    due_date: Optional[str] = None
    junior_advocate_id: int
    # Optional case link
    case_id: Optional[int] = None
    case_title: Optional[str] = None
    case_no: Optional[str] = None
    is_pinned: Optional[bool] = False
    workflow_document_id: Optional[int] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = None
    case_id: Optional[int] = None
    case_title: Optional[str] = None
    case_no: Optional[str] = None
    is_pinned: Optional[bool] = None
    workflow_document_id: Optional[int] = None



class TaskStatusUpdate(BaseModel):
    status: str  # todo | progress | review | completed


class TaskMessageCreate(BaseModel):
    message: str
    message_type: Optional[str] = "general"


class TaskMessageOut(BaseModel):
    id: int
    task_id: int
    sender_id: int
    sender_name: Optional[str]
    sender_role: Optional[str]
    message: str
    message_type: str
    created_at: datetime

    class Config:
        from_attributes = True


class TaskOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    priority: str
    status: str
    due_date: Optional[str]
    senior_advocate_id: int
    junior_advocate_id: int
    is_pinned: bool
    case_id: Optional[int]
    case_title: Optional[str]
    case_no: Optional[str]
    senior_name: Optional[str]
    junior_name: Optional[str]
    workflow_document_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    messages: List[TaskMessageOut] = []


    class Config:
        from_attributes = True
