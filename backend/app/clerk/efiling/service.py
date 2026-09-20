from sqlalchemy.orm import Session
from app.clerk.efiling.models import ClerkEFilingRecord
from app.clerk.efiling.schemas import EFilingCreate, EFilingUpdate

def get_efilings(db: Session):
    return db.query(ClerkEFilingRecord).order_by(ClerkEFilingRecord.id.desc()).all()

def create_efiling(db: Session, data: EFilingCreate):
    record = ClerkEFilingRecord(**data.dict())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

def update_efiling(db: Session, efiling_id: int, data: EFilingUpdate):
    record = db.query(ClerkEFilingRecord).filter(ClerkEFilingRecord.id == efiling_id).first()
    if not record:
        return None
    for k, v in data.dict(exclude_unset=True).items():
        setattr(record, k, v)
    db.commit()
    db.refresh(record)
    return record

def delete_efiling(db: Session, efiling_id: int):
    record = db.query(ClerkEFilingRecord).filter(ClerkEFilingRecord.id == efiling_id).first()
    if not record:
        return False
    db.delete(record)
    db.commit()
    return True
