from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from typing import List

from .schemas import CourtVisitCreate, CourtVisitUpdate, CourtVisitOut
from .service import get_court_visits, create_court_visit, update_court_visit, delete_court_visit

router = APIRouter(
    prefix="/clerk/court-visit",
    tags=["Clerk Court Visit"]
)

@router.get("", response_model=List[CourtVisitOut])
def read_court_visits(db: Session = Depends(get_db)):
    return get_court_visits(db)

@router.post("", response_model=CourtVisitOut, status_code=status.HTTP_201_CREATED)
def add_court_visit(data: CourtVisitCreate, db: Session = Depends(get_db)):
    return create_court_visit(db, data)

@router.put("/{visit_id}", response_model=CourtVisitOut)
def modify_court_visit(visit_id: int, data: CourtVisitUpdate, db: Session = Depends(get_db)):
    updated = update_court_visit(db, visit_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Court visit record not found")
    return updated

@router.delete("/{visit_id}")
def remove_court_visit(visit_id: int, db: Session = Depends(get_db)):
    success = delete_court_visit(db, visit_id)
    if not success:
        raise HTTPException(status_code=404, detail="Court visit record not found")
    return {"detail": "Court visit record deleted successfully"}
