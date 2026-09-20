from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import SessionLocal
from .schemas import ConsultationCreate, ConsultationStart, ConsultationReschedule, ConsultationUpdateStatus, ConsultationOut, ConsultationStats
from . import service
from app.utils.google_calendar import generate_google_meet_link

router = APIRouter(prefix="/consultations", tags=["Consultations"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("", response_model=List[ConsultationOut])
def get_consultations(
    client_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    return service.get_consultations(db, client_id=client_id, status=status)

@router.post("/book", response_model=ConsultationOut)
def book_consultation(data: ConsultationCreate, db: Session = Depends(get_db)):
    return service.create_consultation(db, data)

@router.post("/start", response_model=ConsultationOut)
def start_consultation(
    data: ConsultationStart,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    return service.start_instant_consultation(db, data, background_tasks)

@router.put("/{consultation_id}/status", response_model=ConsultationOut)
def update_status(consultation_id: int, data: ConsultationUpdateStatus, db: Session = Depends(get_db)):
    consultation = service.update_consultation_status(db, consultation_id, data.status)
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    return consultation

@router.put("/{consultation_id}/reschedule", response_model=ConsultationOut)
def reschedule(consultation_id: int, data: ConsultationReschedule, db: Session = Depends(get_db)):
    consultation = service.reschedule_consultation(db, consultation_id, data)
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    return consultation

@router.get("/generate-meet-link")
def generate_meet_link(
    client_name: str = Query(...),
    date: str = Query(...),
    time: str = Query(...),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    from app.advocate.tasks.routes import get_current_user
    user_id = None
    if authorization:
        try:
            current_user = get_current_user(authorization=authorization, db=db)
            user_id = current_user.id
        except Exception:
            pass
            
    link = generate_google_meet_link(client_name, date, time, user_id=user_id)
    return {"meeting_link": link}


@router.get("/stats", response_model=ConsultationStats)
def get_stats(
    client_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    return service.get_consultation_stats(db, client_id=client_id)

@router.delete("/{consultation_id}", status_code=204)
def delete_consultation(consultation_id: int, db: Session = Depends(get_db)):
    success = service.delete_consultation(db, consultation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Consultation not found")
    return
