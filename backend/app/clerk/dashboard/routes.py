from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from typing import List

from .schemas import ClerkTaskCreate, ClerkTaskUpdate, ClerkTaskOut
from .service import get_clerk_tasks, create_clerk_task, update_clerk_task, delete_clerk_task
from app.clerk.format_physical_file.models import ClerkPhysicalFile
from app.clerk.court_visit.models import ClerkCourtVisit
from app.clerk.efiling.models import ClerkEFilingRecord

router = APIRouter(
    prefix="/clerk/dashboard",
    tags=["Clerk Dashboard"]
)

@router.get("/tasks", response_model=List[ClerkTaskOut])
def read_tasks(db: Session = Depends(get_db)):
    return get_clerk_tasks(db)

@router.post("/tasks", response_model=ClerkTaskOut, status_code=status.HTTP_201_CREATED)
def add_task(data: ClerkTaskCreate, db: Session = Depends(get_db)):
    return create_clerk_task(db, data)

@router.put("/tasks/{task_id}", response_model=ClerkTaskOut)
def modify_task(task_id: int, data: ClerkTaskUpdate, db: Session = Depends(get_db)):
    updated = update_clerk_task(db, task_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found")
    return updated

@router.delete("/tasks/{task_id}")
def remove_task(task_id: int, db: Session = Depends(get_db)):
    success = delete_clerk_task(db, task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"detail": "Task deleted successfully"}

@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    cabinets_count = db.query(ClerkPhysicalFile.cabinet_location).distinct().count()
    court_visits_count = db.query(ClerkCourtVisit).count()
    efilings_count = db.query(ClerkEFilingRecord).count()

    return {
        "cabinets": cabinets_count,
        "court_visits": court_visits_count,
        "efilings": efilings_count,
        "assigned_tasks": 0,
        "urgent_tasks": 0
    }
