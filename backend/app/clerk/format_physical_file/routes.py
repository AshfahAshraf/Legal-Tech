from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from typing import List

from .schemas import ClerkPhysicalFileCreate, ClerkPhysicalFileUpdate, ClerkPhysicalFileOut
from .service import get_physical_files, get_physical_file, create_physical_file, update_physical_file, delete_physical_file

router = APIRouter(
    prefix="/clerk/format-physical-file",
    tags=["Clerk Format Physical File"]
)

@router.get("/", response_model=List[ClerkPhysicalFileOut])
def read_files(db: Session = Depends(get_db)):
    return get_physical_files(db)

@router.post("/", response_model=ClerkPhysicalFileOut, status_code=status.HTTP_201_CREATED)
def add_file(data: ClerkPhysicalFileCreate, db: Session = Depends(get_db)):
    # Check duplicate file_number
    db_files = get_physical_files(db)
    if any(f.file_number == data.file_number for f in db_files):
        raise HTTPException(status_code=400, detail="File number already registered")
    return create_physical_file(db, data)

@router.put("/{file_id}", response_model=ClerkPhysicalFileOut)
def modify_file(file_id: int, data: ClerkPhysicalFileUpdate, db: Session = Depends(get_db)):
    updated = update_physical_file(db, file_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="File record not found")
    return updated

@router.delete("/{file_id}")
def remove_file(file_id: int, db: Session = Depends(get_db)):
    success = delete_physical_file(db, file_id)
    if not success:
        raise HTTPException(status_code=404, detail="File record not found")
    return {"detail": "File record deleted successfully"}
