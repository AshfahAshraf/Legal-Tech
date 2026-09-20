from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ClerkTaskBase(BaseModel):
    text: str
    completed: Optional[bool] = False

class ClerkTaskCreate(ClerkTaskBase):
    pass

class ClerkTaskUpdate(BaseModel):
    text: Optional[str] = None
    completed: Optional[bool] = None

class ClerkTaskOut(ClerkTaskBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True
