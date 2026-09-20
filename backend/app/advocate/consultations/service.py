# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from typing import Optional
from fastapi import BackgroundTasks

from app.utils.email import send_email
from .models import Consultation
from .schemas import ConsultationCreate, ConsultationReschedule, ConsultationStart
from app.authapp.models import User
from app.advocate.case_management.models import Case

def find_user_by_name(db: Session, name: str) -> Optional[User]:
    if not name:
        return None
    
    clean_name = name.lower().replace(" ", "")
    clean_name_underscore = name.lower().replace(" ", "_")
    
    # pyrefly: ignore [missing-import]
    from sqlalchemy import func
    user = db.query(User).filter(
        (User.username.ilike(name)) | 
        (User.email.ilike(name)) |
        (User.username.ilike(clean_name)) |
        (User.username.ilike(clean_name_underscore)) |
        (User.first_name.ilike(name)) |
        (User.last_name.ilike(name)) |
        (func.concat(User.first_name, ' ', User.last_name).ilike(name)) |
        (func.concat(User.first_name, User.last_name).ilike(clean_name))
    ).first()

    if user:
        return user
        
    # Fallback 2: Check Case table (for clients)
    client_case = db.query(Case).filter(
        (Case.client_name.ilike(name)) |
        (Case.client_name.ilike(f"%{name}%"))
    ).first()
    if client_case and client_case.email_id:
        user_by_case_email = db.query(User).filter(User.email.ilike(client_case.email_id)).first()
        if user_by_case_email:
            return user_by_case_email

    return None

def get_consultations(
    db: Session,
    client_id: Optional[int] = None,
    status: Optional[str] = None
):
    query = db.query(Consultation)
    if client_id is not None:
        user = db.query(User).filter(User.id == client_id).first()
        if user:
            clean_username = user.username.replace("_", " ")
            first_name = (user.first_name or "").strip()
            last_name = (user.last_name or "").strip()
            full_name = f"{first_name} {last_name}".strip()

            from sqlalchemy import or_
            filters = [
                (Consultation.client_id == client_id),
                (Consultation.client_name.ilike(user.username)),
                (Consultation.client_name.ilike(clean_username)),
                (Consultation.client_name.ilike(user.username.replace(" ", "")))
            ]
            if first_name:
                filters.append(Consultation.client_name.ilike(first_name))
                filters.append(Consultation.client_name.ilike(f"%{first_name}%"))
            if last_name:
                filters.append(Consultation.client_name.ilike(last_name))
            if full_name:
                filters.append(Consultation.client_name.ilike(full_name))
                filters.append(Consultation.client_name.ilike(f"%{full_name}%"))
            
            client_cases = db.query(Case).filter(
                (Case.email_id.ilike(user.email if user.email else "")) |
                (Case.client_name.ilike(user.username)) |
                (Case.client_name.ilike(clean_username)) |
                (Case.client_name.ilike(first_name if first_name else "___never___")) |
                (Case.client_name.ilike(full_name if full_name else "___never___"))
            ).all()
            for c in client_cases:
                if c.client_name:
                    filters.append(Consultation.client_name.ilike(c.client_name))
                    filters.append(Consultation.client_name.ilike(f"%{c.client_name}%"))

            query = query.filter(or_(*filters))

            # Auto-link unlinked consultations to user.id if matched
            matched_consults = query.all()
            updated_any = False
            for consult in matched_consults:
                if consult.client_id is None:
                    consult.client_id = client_id
                    updated_any = True
            if updated_any:
                try:
                    db.commit()
                except Exception:
                    db.rollback()
        else:
            query = query.filter(Consultation.client_id == client_id)
    
    if status is not None:
        query = query.filter(Consultation.status == status)
    return query.order_by(Consultation.date.desc(), Consultation.time.desc()).all()

def get_consultation_by_id(db: Session, consultation_id: int):
    return db.query(Consultation).filter(Consultation.id == consultation_id).first()

def create_consultation(db: Session, data: ConsultationCreate):
# Lookup client if client_id is not provided
    client_id = data.client_id
    if not client_id and data.client_name:
        client = find_user_by_name(db, data.client_name)
        if client:
            client_id = client.id

 

    new_consultation = Consultation(
        client_id=client_id,
        client_name=data.client_name,
       

        date=data.date,
        time=data.time,
        type=data.type,
        issue=data.issue,
        fee=data.fee,
        status="Pending"
    )
    db.add(new_consultation)
    db.commit()
    db.refresh(new_consultation)
    return new_consultation

def reschedule_consultation(db: Session, consultation_id: int, data: ConsultationReschedule):
    from datetime import datetime
    consultation = get_consultation_by_id(db, consultation_id)
    if not consultation:
        return None
    consultation.date = data.date
    consultation.time = data.time
    consultation.reschedule_reason = data.reason
    consultation.status = data.status if data.status else "Rescheduled"
    consultation.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(consultation)
    return consultation

def update_consultation_status(db: Session, consultation_id: int, status: str):
    from datetime import datetime
    consultation = get_consultation_by_id(db, consultation_id)
    if not consultation:
        return None
    if status == "Approved":
        if consultation.status == "Pending Client":
            consultation.reschedule_reason = "Approved by client"
        elif consultation.status == "Pending":
            consultation.reschedule_reason = "Approved by advocate"
        elif consultation.status == "Pending Advocate":
            consultation.reschedule_reason = "Approved client reschedule"
    consultation.status = status
    consultation.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(consultation)
    return consultation

def start_instant_consultation(db: Session, data: ConsultationStart, background_tasks: BackgroundTasks):
    # ── Duplicate time-slot check ──────────────────────────────
    # Block booking if ANY client already has this date + time slot
    existing = db.query(Consultation).filter(
        Consultation.date == data.date,
        Consultation.time == data.time,
    ).first()

    if existing:
        # pyrefly: ignore [missing-import]
        from fastapi import HTTPException
        raise HTTPException(
            status_code=409,
            detail=f"This time slot is already booked for \"{existing.client_name}\". Please choose a different time."
        )
    # ──────────────────────────────────────────────────────────

    # Lookup client ID by client_email or client_name
    client_id = None
    if data.client_email:
        client = db.query(User).filter(User.email.ilike(data.client_email)).first()
        if client:
            client_id = client.id

    if not client_id and data.client_name:
        client = find_user_by_name(db, data.client_name)
        if client:
            client_id = client.id

    new_consultation = Consultation(
        client_id=client_id,
        client_name=data.client_name,
        type=data.type,
        date=data.date,
        time=data.time,
        meeting_link=data.meeting_link,

        status=data.status if data.status else "Pending Client"
    )
    db.add(new_consultation)
    db.commit()
    db.refresh(new_consultation)
    
    # Send Email to client
    if data.client_email:
        subject = "Action Required: Consultation Scheduled"
        
        frontend_url = "http://localhost:3000"
        from app.utils.email_templates import build_consultation_email

        html_body = build_consultation_email(
            client_name=data.client_name,
            advocate_name="Legal Advocate",
            date_str=str(data.date),
            time_str=str(data.time),
            meeting_link=data.meeting_link or "",
            consultation_id=new_consultation.id,
            frontend_url=frontend_url
        )
        
        # fastapi-mail async functions must be awaited in a sync block or wrapped properly.
        # Since we are adding it to BackgroundTasks, we can just pass the async function directly.
        background_tasks.add_task(send_email, to_email=data.client_email, subject=subject, body=html_body)

    return new_consultation

def delete_consultation(db: Session, consultation_id: int) -> bool:
    consultation = get_consultation_by_id(db, consultation_id)
    if not consultation:
        return False
    db.delete(consultation)
    db.commit()
    return True

def get_consultation_stats(db: Session, client_id: Optional[int] = None):
    query = db.query(Consultation)

    if client_id is not None:
        query = query.filter(Consultation.client_id == client_id)
    
    all_consults = query.all()
    
    total = len(all_consults)
    video = len([c for c in all_consults if c.type in ["Video Call", "Video Consultation"]])
    chat = len([c for c in all_consults if c.type in ["Chat", "Chat Consultation"]])
    
    return {
        "total_consultations": total,
        "video_calls": video,
        "chat_consultations": chat
    }
