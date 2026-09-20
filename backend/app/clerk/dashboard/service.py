from sqlalchemy.orm import Session
from .models import ClerkTask
from .schemas import ClerkTaskCreate, ClerkTaskUpdate

def get_clerk_tasks(db: Session):
    return db.query(ClerkTask).all()

def create_clerk_task(db: Session, data: ClerkTaskCreate):
    db_task = ClerkTask(
        text=data.text,
        completed=data.completed
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

def update_clerk_task(db: Session, task_id: int, data: ClerkTaskUpdate):
    db_task = db.query(ClerkTask).filter(ClerkTask.id == task_id).first()
    if not db_task:
        return None
    if data.text is not None:
        db_task.text = data.text
    if data.completed is not None:
        db_task.completed = data.completed
    db.commit()
    db.refresh(db_task)
    return db_task

def delete_clerk_task(db: Session, task_id: int):
    db_task = db.query(ClerkTask).filter(ClerkTask.id == task_id).first()
    if not db_task:
        return False
    db.delete(db_task)
    db.commit()
    return True
