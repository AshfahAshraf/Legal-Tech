from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from typing import List
import os
import uuid

from .schemas import EFilingCreate, EFilingUpdate, EFilingOut
from .service import get_efilings, create_efiling, update_efiling, delete_efiling

router = APIRouter(
    prefix="/clerk/efiling",
    tags=["Clerk Online Filing"]
)

@router.get("", response_model=List[EFilingOut])
def read_efilings(db: Session = Depends(get_db)):
    return get_efilings(db)

@router.post("", response_model=EFilingOut, status_code=status.HTTP_201_CREATED)
def add_efiling(data: EFilingCreate, db: Session = Depends(get_db)):
    return create_efiling(db, data)

@router.put("/{efiling_id}", response_model=EFilingOut)
def modify_efiling(efiling_id: int, data: EFilingUpdate, db: Session = Depends(get_db)):
    updated = update_efiling(db, efiling_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="e-Filing record not found")
    return updated

@router.delete("/{efiling_id}")
def remove_efiling(efiling_id: int, db: Session = Depends(get_db)):
    success = delete_efiling(db, efiling_id)
    if not success:
        raise HTTPException(status_code=404, detail="e-Filing record not found")
    return {"detail": "e-Filing record deleted successfully"}

@router.post("/upload-document")
async def upload_efiling_doc(file: UploadFile = File(...)):
    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "uploads")
    if not os.path.exists(uploads_dir):
        os.makedirs(uploads_dir)
    
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"efiling_doc_{uuid.uuid4().hex}{file_ext}"
    file_path = os.path.join(uploads_dir, unique_filename)

    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)

    return {"url": f"/uploads/{unique_filename}", "name": file.filename}
