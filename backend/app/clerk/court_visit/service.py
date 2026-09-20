from sqlalchemy.orm import Session
from app.clerk.court_visit.models import ClerkCourtVisit
from app.clerk.court_visit.schemas import CourtVisitCreate, CourtVisitUpdate

def get_court_visits(db: Session):
    return db.query(ClerkCourtVisit).order_by(ClerkCourtVisit.id.desc()).all()

def create_court_visit(db: Session, data: CourtVisitCreate):
    visit = ClerkCourtVisit(**data.dict())
    db.add(visit)
    db.commit()
    db.refresh(visit)
    return visit

def update_court_visit(db: Session, visit_id: int, data: CourtVisitUpdate):
    visit = db.query(ClerkCourtVisit).filter(ClerkCourtVisit.id == visit_id).first()
    if not visit:
        return None
    for k, v in data.dict(exclude_unset=True).items():
        setattr(visit, k, v)
    db.commit()
    db.refresh(visit)
    return visit

def delete_court_visit(db: Session, visit_id: int):
    visit = db.query(ClerkCourtVisit).filter(ClerkCourtVisit.id == visit_id).first()
    if not visit:
        return False
    db.delete(visit)
    db.commit()
    return True
