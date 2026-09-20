from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any

class PermissionSchema(BaseModel):
    view: bool = False
    add: bool = False
    edit: bool = False
    delete: bool = False

    class Config:
        from_attributes = True

class RoleOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True

class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = ""

class RoleUpdate(BaseModel):
    name: str
    description: Optional[str] = ""

class UserOut(BaseModel):
    id: Any
    firstName: Optional[str] = Field(None, serialization_alias="firstName")
    lastName: Optional[str] = Field(None, serialization_alias="lastName")
    phone: Optional[str] = Field(None, serialization_alias="phone")
    username: str
    email: str
    role: str
    tempPassword: Optional[str] = Field(None, serialization_alias="tempPassword")
    customPermissions: Dict[str, PermissionSchema] = Field(default_factory=dict, serialization_alias="customPermissions")
    documentAccess: List[Dict[str, Any]] = Field(default_factory=list, serialization_alias="documentAccess")

    class Config:
        from_attributes = True
        populate_by_name = True

class UserProvision(BaseModel):
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    phone: Optional[str] = None
    username: str
    email: str
    role: str
    tempPassword: str

class UserUpdate(BaseModel):
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    phone: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    confirmPassword: Optional[str] = None    
    customPermissions: Optional[Dict[str, PermissionSchema]] = None
    documentAccess: Optional[List[Dict[str, Any]]] = None
