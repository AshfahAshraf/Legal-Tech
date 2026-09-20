from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import date

from app.database import get_db
from .service import get_case_documents
from .models import Client, Case, Hearing, Activity, Document
from .schemas import ClientCreate, ClientUpdate


router = APIRouter(
    prefix="/clients",
    tags=["Clients"]
)


class ClientResponse(BaseModel):
    id: int
    client_id: str
    full_name: str
    email: str
    phone: str
    alt_phone: Optional[str] = None

    class Config:
        from_attributes = True

# Document Response Schema
class DocumentResponse(BaseModel):
    id: int
    document_name: str
    document_type: str
    file_path: str

    class Config:
        from_attributes = True


# Get all clients
@router.get(
    "/",
    response_model=list[ClientResponse]
)
def get_clients(
    db: Session = Depends(get_db)
):
    return db.query(Client).all()


# Get client documents
@router.get(
    "/documents/view",
    response_model=list[DocumentResponse]
)
def view_documents(
    client_id: int,
    advocate_role: str,
    document_type: str = None,
    db: Session = Depends(get_db)
):
    return get_case_documents(
        db=db,
        client_id=client_id,
        advocate_role=advocate_role,
        document_type=document_type
    )


class CaseOut(BaseModel):
    id: int
    case_no: str
    title: str
    client_name: str
    type: str
    court: str
    status: str
    advocate_id: Optional[int]

    class Config:
        from_attributes = True


class HearingOut(BaseModel):
    id: int
    case_no: Optional[str]
    case_title: str
    court: str
    advocate_id: Optional[int]
    advocate_name: Optional[str]
    date: date
    time: str
    status: str

    class Config:
        from_attributes = True


class ActivityOut(BaseModel):
    id: int
    title: str
    timestamp_str: str
    type: Optional[str]
    advocate_id: Optional[int]

    class Config:
        from_attributes = True


class DocumentOut(BaseModel):
    id: int
    filename: str
    case_no: Optional[str]
    advocate_id: Optional[int]

    class Config:
        from_attributes = True


# Get cases
@router.get("/cases", response_model=List[CaseOut])
def get_cases(
    advocate_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Case)
    if advocate_id is not None:
        query = query.filter(Case.advocate_id == advocate_id)
    return query.all()


# Get hearings
@router.get("/hearings", response_model=List[HearingOut])
def get_hearings(
    advocate_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Hearing)
    if advocate_id is not None:
        query = query.filter(Hearing.advocate_id == advocate_id)
    return query.all()


# Get activities
@router.get("/activities", response_model=List[ActivityOut])
def get_activities(
    advocate_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Activity)
    if advocate_id is not None:
        query = query.filter(Activity.advocate_id == advocate_id)
    return query.all()


# Get documents
@router.get("/documents", response_model=List[DocumentOut])
def get_documents(
    advocate_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Document)
    if advocate_id is not None:
        query = query.filter(Document.advocate_id == advocate_id)
    return query.all()


# Create new client
@router.post("/", response_model=ClientResponse)
def create_client(client: ClientCreate, db: Session = Depends(get_db)):
    db_client = db.query(Client).filter(Client.client_id == client.client_id).first()
    if db_client:
        raise HTTPException(status_code=400, detail="Client ID already registered")
    
    new_client = Client(
        client_id=client.client_id,
        full_name=client.full_name,
        email=client.email,
        phone=client.phone
    )
    db.add(new_client)
    db.commit()
    db.refresh(new_client)
    return new_client


# Update client details
@router.put("/{client_id}", response_model=ClientResponse)
def update_client(client_id: str, client: ClientUpdate, db: Session = Depends(get_db)):
    updated_any = False
    
    # 1. Update clients table if found
    db_client = db.query(Client).filter(Client.client_id == client_id).first()
    if db_client:
        db_client.full_name = client.full_name
        db_client.email = client.email
        db_client.phone = client.phone
        if hasattr(db_client, 'alt_phone'):
            db_client.alt_phone = client.alt_phone
        db.commit()
        db.refresh(db_client)
        updated_any = True

    # 2. Update case_management_cases, invoices, and consultations
    if client.original_name:
        from app.advocate.case_management.models import Case as CaseMgmtCase
        from app.advocate.finance_management.models import Invoice
        from app.advocate.consultations.models import Consultation

        # Update Case Management Cases
        case_update_dict = {
            CaseMgmtCase.client_name: client.full_name,
            CaseMgmtCase.contact_number: client.phone,
            CaseMgmtCase.email_id: client.email
        }
        if client.alt_phone is not None:
            case_update_dict[CaseMgmtCase.alt_contact_number] = client.alt_phone

        cases_updated = db.query(CaseMgmtCase).filter(CaseMgmtCase.client_name == client.original_name).update(
            case_update_dict, synchronize_session=False
        )

        # Update Invoices
        db.query(Invoice).filter(Invoice.client_name == client.original_name).update({
            Invoice.client_name: client.full_name
        }, synchronize_session=False)

        # Update Consultations
        db.query(Consultation).filter(Consultation.client_name == client.original_name).update({
            Consultation.client_name: client.full_name
        }, synchronize_session=False)

        db.commit()
        
        if cases_updated > 0:
            updated_any = True

    if not updated_any and not db_client:
        raise HTTPException(status_code=404, detail="Client not found")

    return ClientResponse(
        id=db_client.id if db_client else 1,
        client_id=client_id,
        full_name=client.full_name,
        email=client.email,
        phone=client.phone,
        alt_phone=client.alt_phone
    )


# Delete client
@router.delete("/{client_id}")
def delete_client(client_id: str, db: Session = Depends(get_db)):
    db_client = db.query(Client).filter(Client.client_id == client_id).first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    db.delete(db_client)
    db.commit()
    return {"message": "Client deleted successfully"}