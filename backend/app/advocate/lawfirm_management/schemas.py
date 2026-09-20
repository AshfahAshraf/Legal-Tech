from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class AdvocateBase(BaseModel):
    advocate_name: Optional[str] = Field(None, alias="advocateName")
    bar_council_id: Optional[str] = Field(None, alias="barCouncilId")
    phone_number: Optional[str] = Field(None, alias="phoneNumber")
    email_address: Optional[str] = Field(None, alias="emailAddress")
    city: Optional[str] = None
    status: Optional[str] = "Active"
    role: Optional[str] = Field("Junior Advocate", alias="role")

    # Extended fields
    gender: Optional[str] = Field(None, alias="gender")
    practice_court: Optional[str] = Field(None, alias="practiceCourt")    
    state: Optional[str] = Field(None, alias="state")
    pincode: Optional[str] = Field(None, alias="pincode")
    chambers_address: Optional[str] = Field(None, alias="chambersAddress")
    profile_image: Optional[str] = Field(None, alias="profileImage")
    years_of_experience: Optional[int] = Field(None, alias="yearsOfExperience")
    temp_password: Optional[str] = Field(None, alias="tempPassword")

    
    class Config:
        populate_by_name = True
        from_attributes = True


class AdvocateCreate(AdvocateBase):
    password: Optional[str] = Field(None, alias="password")
    confirm_password: Optional[str] = Field(None, alias="confirmPassword")

class AdvocateUpdate(AdvocateBase):
    password: Optional[str] = Field(None, alias="password")
    confirm_password: Optional[str] = Field(None, alias="confirmPassword")


class AdvocateOut(AdvocateBase):
    id: int

    class Config:
        populate_by_name = True
        from_attributes = True


class CaseAppearanceCreate(BaseModel):
    appearance_date: Optional[str] = Field(None, alias="appearanceDate")
    advocate_name: Optional[str] = Field(None, alias="advocateName")
    court_bench: Optional[str] = Field(None, alias="courtBench")
    stage: Optional[str] = Field(None, alias="stage")
    summary: Optional[str] = Field(None, alias="summary")
    next_date: Optional[str] = Field(None, alias="nextDate")

    class Config:
        populate_by_name = True
        from_attributes = True


class AssignedCaseCreate(BaseModel):
    case_id: Optional[int] = None
    case_name: Optional[str] = None
    case_number: Optional[str] = None
    case_title: Optional[str] = None
    advocate_name: Optional[str] = None
    practice_court: Optional[str] = None    
    priority: Optional[str] = None
    due_date: Optional[str] = None
    assignment_notes: Optional[str] = None
    status: Optional[str] = "Active"
    assigned_documents: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    appearances: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    client_name: Optional[str] = None
    secondary_advocate_name: Optional[str] = Field(None, alias="secondaryAdvocateName")

    class Config:
        populate_by_name = True
        from_attributes = True

class AssignedCaseOut(AssignedCaseCreate):

    id: int
    profile_image: Optional[str] = Field(None, alias="profileImage")
    case_id_code: Optional[str] = Field(None, alias="caseIdCode")



    class Config:
        from_attributes = True
        populate_by_name = True

class AssignedCaseStatusUpdate(BaseModel):
    status: str

