from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# Case Note Schemas
class CaseNoteCreate(BaseModel):
    text: str
    category: Optional[str] = "General Note"
    author: Optional[str] = None


class CaseNoteOut(BaseModel):
    id: int
    case_id: int
    text: str
    category: str
    author: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True



# Document Schema
class DocumentSchema(BaseModel):
    documentType: str
    advocate: str
    file: Optional[str] = None
    url: Optional[str] = None
    password: Optional[str] = None



# Create Case Schema
class CaseCreate(BaseModel):
    caseId: str
    cnrNumber: Optional[str] = None
    caseTitle: str
    caseNo: str
    caseType: str
    caseDes: str

    clientName: str
    contactNumber: str
    altContactNumber: Optional[str] = None
    emailId: str
    clientRole: Optional[str] = None
    clientAddress: Optional[str] = None
    clientDistrict: Optional[str] = None

    courtName: str
    courtType: str

    status: str

    selectedAdvocate: Optional[str] = None
    documents: Optional[List[DocumentSchema]] = []
    nextHearingDate: Optional[str] = None


# Update Case Schema
class CaseUpdate(BaseModel):
    caseId: Optional[str] = None
    cnrNumber: Optional[str] = None
    caseTitle: Optional[str] = None
    caseNo: Optional[str] = None
    caseType: Optional[str] = None
    caseDes: Optional[str] = None

    clientName: Optional[str] = None
    contactNumber: Optional[str] = None
    altContactNumber: Optional[str] = None
    emailId: Optional[str] = None
    clientRole: Optional[str] = None
    clientAddress: Optional[str] = None
    clientDistrict: Optional[str] = None

    courtName: Optional[str] = None
    courtType: Optional[str] = None

    status: Optional[str] = None

    selectedAdvocate: Optional[str] = None
    documents: Optional[List[DocumentSchema]] = []
    nextHearingDate: Optional[str] = None


# Response Schema
class CaseResponse(CaseCreate):
    id: int

    class Config:
        from_attributes = True

# AI Assistant Schema
class AIAssistantRequest(BaseModel):
    query: str
    role: Optional[str] = None
    advocateName: Optional[str] = None
    clientName: Optional[str] = None


from datetime import datetime

class CaseDocumentWorkflowCreate(BaseModel):
    case_id: int
    case_no: str
    case_title: str
    title: str
    document_type: str
    content: Optional[str] = None
    file_url: Optional[str] = None

class CaseDocumentWorkflowUpdate(BaseModel):
    title: Optional[str] = None
    document_type: Optional[str] = None
    content: Optional[str] = None
    file_url: Optional[str] = None

class CaseDocumentWorkflowReview(BaseModel):
    status: str  # 'Approved' or 'Needs Correction'
    senior_feedback: Optional[str] = None

class CaseDocumentWorkflowResponse(BaseModel):
    id: int
    case_id: int
    case_no: str
    case_title: str
    title: str
    document_type: str
    content: Optional[str] = None
    file_url: Optional[str] = None
    junior_id: int
    senior_id: Optional[int] = None
    status: str
    senior_feedback: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AIDocumentHistoryUpdate(BaseModel):
    content: Optional[str] = None
    prompt: Optional[str] = None


class AIDocumentHistoryResponse(BaseModel):
    id: int
    case_id: Optional[int] = None
    case_no: Optional[str] = None
    case_title: Optional[str] = None
    prompt: str
    content: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
