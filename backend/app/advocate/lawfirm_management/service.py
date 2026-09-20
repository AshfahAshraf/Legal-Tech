from sqlalchemy.orm import Session
from sqlalchemy import func
import re
import json
from fastapi import HTTPException
from .models import Advocate, AssignedCase
from app.advocate.case_management.models import Case
from app.authapp.models import User


from .schemas import (
    AdvocateCreate,
    AdvocateUpdate,
    AssignedCaseCreate
)
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# Get all advocates
def get_all_advocates(db: Session):
    return db.query(Advocate).all()


# Get single advocate
def get_advocate_by_id(
    db: Session,
    advocate_id: int
):
    return db.query(Advocate).filter(
        Advocate.id == advocate_id
    ).first()


# Create advocate
def create_advocate(
    db: Session,
    advocate: AdvocateCreate
):
    advocate_data = advocate.model_dump(
        by_alias=False,
        exclude={"confirm_password"}
    )

    bar_id = advocate_data.get("bar_council_id")
    if advocate_data.get("role") != "Clerk" and bar_id and bar_id.strip():
        clean_bar_id = bar_id.strip()
        if not re.match(r"^[A-Za-z]{1,5}/\d{1,6}/\d{4}$", clean_bar_id):
            raise HTTPException(status_code=400, detail="Invalid Bar Council ID format (e.g., K/1234/2023)")
        existing_bar = db.query(Advocate).filter(
            func.lower(Advocate.bar_council_id) == clean_bar_id.lower()
        ).first()
        if existing_bar:
            raise HTTPException(status_code=400, detail="This Bar Council ID is already registered.")

    password = advocate_data.pop("password", None)

    if password:
        advocate_data["hashed_password"] = pwd_context.hash(password)
        advocate_data["temp_password"] = password

    new_advocate = Advocate(**advocate_data)

    db.add(new_advocate)
    db.commit()
    db.refresh(new_advocate)

    return new_advocate


# Update advocate
def update_advocate(
    db: Session,
    advocate_id: int,
    advocate_data: AdvocateUpdate
):
    advocate = get_advocate_by_id(
        db,
        advocate_id
    )

    if not advocate:
        return None

    update_data = advocate_data.model_dump(
        exclude_unset=True,
        by_alias=False,
        exclude={"confirm_password"}
    )

    bar_id = update_data.get("bar_council_id")
    if update_data.get("role") != "Clerk" and bar_id and bar_id.strip():
        clean_bar_id = bar_id.strip()
        if not re.match(r"^[A-Za-z]{1,5}/\d{1,6}/\d{4}$", clean_bar_id):
            raise HTTPException(status_code=400, detail="Invalid Bar Council ID format (e.g., K/1234/2023)")
        existing_bar = db.query(Advocate).filter(
            func.lower(Advocate.bar_council_id) == clean_bar_id.lower(),
            Advocate.id != advocate_id
        ).first()
        if existing_bar:
            raise HTTPException(status_code=400, detail="This Bar Council ID is already registered.")

    password = update_data.pop("password", None)


    if password:
        advocate.hashed_password = pwd_context.hash(password)
        advocate.temp_password = password

    for key, value in update_data.items():
        setattr(advocate, key, value)

    db.commit()
    db.refresh(advocate)

    return advocate


# Delete advocate
def delete_advocate(
    db: Session,
    advocate_id: int
):
    advocate = get_advocate_by_id(
        db,
        advocate_id
    )

    if not advocate:
        return None

    # Clean up corresponding user record in `users` table if present
    if advocate.email_address or advocate.advocate_name:
        username = (advocate.advocate_name or "").lower().replace(" ", "")
        user_query = db.query(User).filter(
            (User.email == advocate.email_address) |
            (User.username == username)
        )
        for u in user_query.all():
            db.delete(u)

    db.delete(advocate)
    db.commit()

    return {
        "message": "Advocate deleted successfully"
    }


# Create assigned case
def create_assigned_case(
    db: Session,
    case_data: AssignedCaseCreate
):
    case_dict = case_data.model_dump()

    case_dict["assigned_documents"] = json.dumps(
        case_dict.get("assigned_documents", []) if isinstance(case_dict.get("assigned_documents"), (list, dict)) else []
    )
    case_dict["appearances"] = json.dumps(
        case_dict.get("appearances", []) if isinstance(case_dict.get("appearances"), (list, dict)) else []
    )

    # If documents are being assigned, validate that the advocate is already assigned to this case
    raw_docs = case_data.assigned_documents
    advocate_name = case_data.advocate_name
    if raw_docs and advocate_name:
        # Check whether a prior assignment exists for this case + advocate
        case_id_val = case_data.case_id
        case_number_val = (case_data.case_number or "").strip()
        prior = None
        if case_id_val:
            prior = db.query(AssignedCase).filter(
                (AssignedCase.case_id == case_id_val) |
                (
                    AssignedCase.case_id.is_(None) &
                    (AssignedCase.case_number == case_number_val)
                ),
                AssignedCase.advocate_name == advocate_name
            ).first()
        elif case_number_val:
            prior = db.query(AssignedCase).filter(
                AssignedCase.case_number == case_number_val,
                AssignedCase.advocate_name == advocate_name
            ).first()
    # Check for existing assignment to prevent duplicates.
    # IMPORTANT: Filter by BOTH case and advocate_name — different advocates on the
    # same case must each have their own separate AssignedCase record.
    existing = None
    adv_name = (case_data.advocate_name or "").strip()
    if case_data.case_id and adv_name:
        cond = (
            (AssignedCase.case_id == case_data.case_id) &
            (AssignedCase.advocate_name == adv_name)
        )
        if case_data.case_number and case_data.case_number.strip():
            cond = cond | (
                AssignedCase.case_id.is_(None) &
                (AssignedCase.case_number == case_data.case_number.strip()) &
                (AssignedCase.advocate_name == adv_name)
            )
        existing = db.query(AssignedCase).filter(cond).first()
    elif case_data.case_number and case_data.case_number.strip() and adv_name:
        existing = db.query(AssignedCase).filter(
            AssignedCase.case_number == case_data.case_number.strip(),
            AssignedCase.advocate_name == adv_name
        ).first()

    if existing:
        # Update fields instead of inserting a duplicate
        existing.case_id = case_dict.get("case_id", existing.case_id)
        existing.case_name = case_dict.get("case_name") or existing.case_name
        existing.case_title = case_dict.get("case_title") or existing.case_title
        existing.case_number = case_dict.get("case_number", existing.case_number)
        existing.advocate_name = case_dict.get("advocate_name", existing.advocate_name)
        existing.practice_court = case_dict.get("practice_court") or existing.practice_court
        existing.priority = case_dict.get("priority") or existing.priority
        existing.due_date = case_dict.get("due_date") or existing.due_date
        existing.assignment_notes = case_dict.get("assignment_notes") or existing.assignment_notes
        existing.status = case_dict.get("status", existing.status)
        existing.client_name = case_dict.get("client_name") or existing.client_name
        existing.secondary_advocate_name = case_dict.get("secondary_advocate_name", existing.secondary_advocate_name)


        # MERGE documents — add incoming docs not already present (de-duped by filename).
        # This prevents a single-document assignment from wiping out all other documents.
        incoming_docs = json.loads(case_dict.get("assigned_documents", "[]"))
        current_docs = json.loads(existing.assigned_documents or "[]")
        current_files = {d.get("file") for d in current_docs if d.get("file")}
        for doc in incoming_docs:
            if doc.get("file") and doc["file"] not in current_files:
                current_docs.append(doc)
                current_files.add(doc["file"])
        existing.assigned_documents = json.dumps(current_docs)

        db.commit()
        db.refresh(existing)
        existing.assigned_documents = json.loads(existing.assigned_documents or "[]")
        existing.appearances = json.loads(existing.appearances or "[]")
        return existing

    new_case = AssignedCase(
        **case_dict
    )

    db.add(new_case)
    db.commit()
    db.refresh(new_case)

    new_case.assigned_documents = json.loads(
        new_case.assigned_documents or "[]"
    )
    new_case.appearances = json.loads(
        new_case.appearances or "[]"
    )

    return new_case


# Get all assigned cases
def get_assigned_cases(db: Session):
    results = (
        db.query(AssignedCase, Advocate.profile_image, Case.case_id, Case.case_no)
        .outerjoin(
            Advocate,
            AssignedCase.advocate_name == Advocate.advocate_name
        )
        .outerjoin(
            Case,
            AssignedCase.case_id == Case.id
        )
        .all()
    )

    assigned_cases = []

    for case, profile_image, case_id_code, case_no in results:
        case.assigned_documents = json.loads(
            case.assigned_documents or "[]"
        )
        case.appearances = json.loads(
            case.appearances or "[]"
        )

        # Add profile image and case_id_code dynamically
        case.profile_image = profile_image
        case.case_id_code = case_id_code or (f"CASE-#{case.case_id}" if case.case_id else None)
        if not case.case_number and case_no:
            case.case_number = case_no

        assigned_cases.append(case)

    return assigned_cases

# Get single assigned case
def get_assigned_case_by_id(
    db: Session,
    case_id: int
):
    result = (
        db.query(AssignedCase, Advocate.profile_image, Case.case_id, Case.case_no)
        .outerjoin(Advocate, AssignedCase.advocate_name == Advocate.advocate_name)
        .outerjoin(Case, AssignedCase.case_id == Case.id)
        .filter(AssignedCase.id == case_id)
        .first()
    )

    if result:
        case, profile_image, case_id_code, case_no = result
        case.assigned_documents = json.loads(
            case.assigned_documents or "[]"
        )
        case.appearances = json.loads(
            case.appearances or "[]"
        )
        case.profile_image = profile_image
        case.case_id_code = case_id_code or (f"CASE-#{case.case_id}" if case.case_id else None)
        if not case.case_number and case_no:
            case.case_number = case_no
        return case

    return None



# Delete assigned case
def delete_assigned_case(
    db: Session,
    case_id: int
):
    assigned_case = db.query(
        AssignedCase
    ).filter(
        AssignedCase.id == case_id
    ).first()

    if not assigned_case:
        return None

    db.delete(assigned_case)
    db.commit()

    return {
        "message": "Assigned case deleted successfully"
    }


# Update assigned case
def update_assigned_case(
    db: Session,
    case_id: int,
    case_data: AssignedCaseCreate
):
    assigned_case = get_assigned_case_by_id(
        db,
        case_id
    )

    if not assigned_case:
        return None

    case_dict = case_data.model_dump(
        exclude_unset=True
    )

    if "assigned_documents" in case_dict and isinstance(case_dict["assigned_documents"], (list, dict)):
        case_dict["assigned_documents"] = json.dumps(
            case_dict.get("assigned_documents", [])
        )
    if "appearances" in case_dict and isinstance(case_dict["appearances"], (list, dict)):
        case_dict["appearances"] = json.dumps(
            case_dict.get("appearances", [])
        )

    for key, value in case_dict.items():
        setattr(assigned_case, key, value)

    if isinstance(assigned_case.assigned_documents, (list, dict)):
        assigned_case.assigned_documents = json.dumps(assigned_case.assigned_documents)
    if isinstance(assigned_case.appearances, (list, dict)):
        assigned_case.appearances = json.dumps(assigned_case.appearances)

    db.commit()
    db.refresh(assigned_case)

    assigned_case.assigned_documents = json.loads(
        assigned_case.assigned_documents or "[]"
    )
    assigned_case.appearances = json.loads(
        assigned_case.appearances or "[]"
    )


    return assigned_case