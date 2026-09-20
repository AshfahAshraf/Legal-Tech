from pydantic import BaseModel
from typing import Optional

class DocumentResponse(BaseModel):
    id: int
    document_name: str
    document_type: str
    file_path: str

    class Config:
        from_attributes = True

class ClientCreate(BaseModel):
    client_id: str
    full_name: str
    email: str
    phone: str
    alt_phone: Optional[str] = None



class ClientUpdate(BaseModel):
    original_name: Optional[str] = None
    full_name: str
    email: str
    phone: str
    alt_phone: Optional[str] = None

class ClientResponse(BaseModel):
    id: int
    client_id: str
    full_name: str
    email: str
    phone: str
    alt_phone: Optional[str] = None

    class Config:
        from_attributes = True