from sqlalchemy.orm import Session
from .models import ClerkPhysicalFile
from .schemas import ClerkPhysicalFileCreate, ClerkPhysicalFileUpdate

def get_physical_files(db: Session):
    return db.query(ClerkPhysicalFile).all()

def get_physical_file(db: Session, file_id: int):
    return db.query(ClerkPhysicalFile).filter(ClerkPhysicalFile.id == file_id).first()

def create_physical_file(db: Session, data: ClerkPhysicalFileCreate):
    db_file = ClerkPhysicalFile(
        file_number=data.file_number,
        case_number=data.case_number,
        client_name=data.client_name,
        cabinet_location=data.cabinet_location,
        shelf_index=data.shelf_index,
        notes=data.notes
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    return db_file

def update_physical_file(db: Session, file_id: int, data: ClerkPhysicalFileUpdate):
    db_file = db.query(ClerkPhysicalFile).filter(ClerkPhysicalFile.id == file_id).first()
    if not db_file:
        return None
    for field, value in data.dict(exclude_unset=True).items():
        setattr(db_file, field, value)
    db.commit()
    db.refresh(db_file)
    return db_file

def delete_physical_file(db: Session, file_id: int):
    db_file = db.query(ClerkPhysicalFile).filter(ClerkPhysicalFile.id == file_id).first()
    if not db_file:
        return False
    db.delete(db_file)
    db.commit()
    return True
