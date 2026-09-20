from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ClerkPhysicalFileBase(BaseModel):
    file_number: str
    case_number: Optional[str] = None
    client_name: Optional[str] = None
    cabinet_location: Optional[str] = "Cabinet A"
    shelf_index: Optional[str] = "Row 1, Shelf 2"
    notes: Optional[str] = None

class ClerkPhysicalFileCreate(ClerkPhysicalFileBase):
    pass

class ClerkPhysicalFileUpdate(BaseModel):
    file_number: Optional[str] = None
    case_number: Optional[str] = None
    client_name: Optional[str] = None
    cabinet_location: Optional[str] = None
    shelf_index: Optional[str] = None
    notes: Optional[str] = None

class ClerkPhysicalFileOut(ClerkPhysicalFileBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True
