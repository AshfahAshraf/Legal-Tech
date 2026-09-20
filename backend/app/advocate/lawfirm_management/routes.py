from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import SessionLocal
from .schemas import (
    AdvocateCreate,
    AdvocateUpdate,
    AdvocateOut,
    AssignedCaseCreate,
    AssignedCaseOut,
    AssignedCaseStatusUpdate,
    CaseAppearanceCreate
)
from .service import (
    get_all_advocates,
    get_advocate_by_id,
    create_advocate,
    update_advocate,
    delete_advocate,
    create_assigned_case,
    get_assigned_cases,
    get_assigned_case_by_id,
    delete_assigned_case,
    update_assigned_case
)

try:
    from .migration_appearances import run_migration
    run_migration()
except Exception as _mig_e:
    pass

router = APIRouter(
    prefix="/lawfirm-management",
    tags=["Law Firm Management"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Get all advocates
@router.get(
    "/",
    response_model=list[AdvocateOut],
    response_model_by_alias=True
)
def get_advocates(db: Session = Depends(get_db)):
    return get_all_advocates(db)


# Add advocate
@router.post(
    "/",
    response_model=AdvocateOut,
    response_model_by_alias=True
)
async def add_advocate(
    advocate: AdvocateCreate,
    db: Session = Depends(get_db)
):
    from app.authapp.models import User
    from .models import Advocate
    from sqlalchemy import func

    # Check if an advocate with this email address or advocate name already exists
    existing_adv = None
    if advocate.email_address and advocate.email_address.strip():
        existing_adv = db.query(Advocate).filter(
            func.lower(Advocate.email_address) == advocate.email_address.strip().lower()
        ).first()

    if not existing_adv and advocate.advocate_name and advocate.advocate_name.strip():
        u_name = advocate.advocate_name.strip().lower()
        existing_adv = db.query(Advocate).filter(
            func.lower(Advocate.advocate_name) == u_name
        ).first()

    if existing_adv:
        # Update existing advocate record instead of erroring or creating duplicate
        adv_data = advocate.model_dump(exclude_unset=True, by_alias=False, exclude={"confirm_password"})
        password = adv_data.pop("password", None)
        if password:
            existing_adv.hashed_password = pwd_context.hash(password)
            existing_adv.temp_password = password
        for k, v in adv_data.items():
            if v is not None:
                setattr(existing_adv, k, v)
        db.commit()
        db.refresh(existing_adv)

        # Sync user record in users table if matching user exists
        try:
            u_rec = db.query(User).filter(
                (User.email == existing_adv.email_address) |
                (User.username == (existing_adv.advocate_name or "").lower().replace(" ", ""))
            ).first()
            if u_rec:
                if existing_adv.email_address:
                    u_rec.email = existing_adv.email_address
                if existing_adv.phone_number:
                    u_rec.phone = existing_adv.phone_number
                if existing_adv.advocate_name:
                    parts = existing_adv.advocate_name.strip().split(" ")
                    u_rec.first_name = parts[0] if parts else u_rec.first_name
                    u_rec.last_name = " ".join(parts[1:]) if len(parts) > 1 else ""
                db.commit()
        except Exception:
            pass

        return existing_adv

    # Otherwise create a new advocate record
    new_adv = create_advocate(db, advocate)

    if advocate.password:
        # Auto-provision the advocate as a user in the `users` table so they can log in immediately
        try:
            from app.advocate.permissions.schemas import UserProvision
            from app.advocate.permissions.service import provision_user
            
            # Extract first and last names
            name_parts = (new_adv.advocate_name or "").strip().split(" ")
            first_name = name_parts[0] if name_parts else "Junior"
            last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else "Advocate"
            
            # Generate username
            username = (new_adv.advocate_name or "").lower().replace(" ", "")
            
            prov_data = UserProvision(
                firstName=first_name,
                lastName=last_name,
                phone=new_adv.phone_number or "",
                username=username,
                email=new_adv.email_address,
                role=new_adv.role or "Junior Advocate",
                tempPassword=advocate.password
            )
            provision_user(db, prov_data)
        except Exception as prov_err:
            print(f"Auto-provisioning failed for advocate {new_adv.email_address}: {prov_err}")

        # Send onboarding credentials email
        try:
            from app.utils.email import send_email
            from app.utils.email_templates import build_credentials_email
            role_label = new_adv.role or "Junior Advocate"
            subject = f"Your {role_label} Credentials"
            body = build_credentials_email(
                name=new_adv.advocate_name,
                role=role_label,
                login_url="http://localhost:3000/login",
                email=new_adv.email_address,
                password=advocate.password
            )
            await send_email(new_adv.email_address, subject, body)
        except Exception as email_err:
            print(f"Failed to send email to advocate {new_adv.email_address}: {email_err}")

    return new_adv


# Assign case
@router.post(
    "/assign-case",
    response_model=AssignedCaseOut
)
def assign_case(
    data: AssignedCaseCreate,
    db: Session = Depends(get_db)
):
    return create_assigned_case(db, data)


# Get all assigned cases
@router.get(
    "/assigned-cases",
    response_model=list[AssignedCaseOut]
)
def fetch_assigned_cases(
    db: Session = Depends(get_db)
):
    return get_assigned_cases(db)


# Get single assigned case
@router.get(
    "/assigned-cases/{case_id}",
    response_model=AssignedCaseOut
)
def fetch_single_assigned_case(
    case_id: int,
    db: Session = Depends(get_db)
):
    assigned_case = get_assigned_case_by_id(
        db,
        case_id
    )

    if not assigned_case:
        raise HTTPException(
            status_code=404,
            detail="Assigned case not found"
        )

    return assigned_case


# Delete assigned case
@router.delete("/assigned-cases/{case_id}")
def remove_assigned_case(
    case_id: int,
    db: Session = Depends(get_db)
):
    deleted = delete_assigned_case(
        db,
        case_id
    )

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Assigned case not found"
        )

    return deleted


# Update assigned case
@router.put(
    "/assigned-cases/{case_id}",
    response_model=AssignedCaseOut
)
def edit_assigned_case(
    case_id: int,
    data: AssignedCaseCreate,
    db: Session = Depends(get_db)
):
    updated = update_assigned_case(
        db,
        case_id,
        data
    )

    if not updated:
        raise HTTPException(
            status_code=404,
            detail="Assigned case not found"
        )

    return updated


# Update assigned case status
@router.put(
    "/assigned-cases/{case_id}/status"
)
def edit_assigned_case_status(
    case_id: int,
    data: AssignedCaseStatusUpdate,
    db: Session = Depends(get_db)
):
    # 1. Update status of AssignedCase in the database
    from .models import AssignedCase
    assigned_case = db.query(AssignedCase).filter(AssignedCase.id == case_id).first()
    if not assigned_case:
        raise HTTPException(
            status_code=404,
            detail="Assigned case not found"
        )
    
    assigned_case.status = data.status
    
    # 2. Find the corresponding case in Case Management table
    from app.advocate.case_management.models import Case
    related_case = db.query(Case).filter(Case.case_no == assigned_case.case_number).first()
    if related_case:
        # Sync status: Active <-> Active, In Progress <-> Pending, Closed <-> Closed
        if data.status == "In Progress":
            related_case.status = "Pending"
        elif data.status == "Closed":
            related_case.status = "Closed"
        else:
            related_case.status = data.status
            
    db.commit()
    db.refresh(assigned_case)
    
    return {"message": "Status updated successfully", "status": assigned_case.status}


# Get single advocate
@router.get(
    "/{advocate_id}",
    response_model=AdvocateOut,
    response_model_by_alias=True
)
def get_advocate(
    advocate_id: int,
    db: Session = Depends(get_db)
):
    advocate = get_advocate_by_id(
        db,
        advocate_id
    )

    if not advocate:
        raise HTTPException(
            status_code=404,
            detail="Advocate not found"
        )

    return advocate


# Update advocate
@router.put(
    "/{advocate_id}",
    response_model=AdvocateOut,
    response_model_by_alias=True
)
def edit_advocate(
    advocate_id: int,
    advocate: AdvocateUpdate,
    db: Session = Depends(get_db)
):
    updated = update_advocate(
        db,
        advocate_id,
        advocate
    )

    if not updated:
        raise HTTPException(
            status_code=404,
            detail="Advocate not found"
        )

    # Sync the corresponding user record in the users table
    try:
        from app.authapp.models import User
        # Match user by old email (before update) or by username derived from name
        user = db.query(User).filter(User.email == updated.email_address).first()
        if not user:
            # fallback: try to match by username derived from advocate name
            username = (updated.advocate_name or "").lower().replace(" ", "")
            user = db.query(User).filter(User.username == username).first()

        if user:
            # Update email
            if updated.email_address:
                user.email = updated.email_address
            # Update phone
            if updated.phone_number:
                user.phone = updated.phone_number
            # Update name parts
            if updated.advocate_name:
                name_parts = (updated.advocate_name or "").strip().split(" ")
                user.first_name = name_parts[0] if name_parts else user.first_name
                user.last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
            db.commit()
            db.refresh(user)
    except Exception as sync_err:
        print(f"Warning: Failed to sync user record for advocate {advocate_id}: {sync_err}")

    return updated


# Delete advocate
@router.delete("/{advocate_id}")
def remove_advocate(
    advocate_id: int,
    db: Session = Depends(get_db)
):
    deleted = delete_advocate(
        db,
        advocate_id
    )

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Advocate not found"
        )

    return deleted


# Add court appearance entry for assigned case
@router.post("/assigned-cases/{case_id}/appearances", response_model=AssignedCaseOut)
def add_assigned_case_appearance(
    case_id: int,
    data: CaseAppearanceCreate,
    db: Session = Depends(get_db)
):
    import json
    from .models import AssignedCase
    assigned_case = db.query(AssignedCase).filter(AssignedCase.id == case_id).first()
    if not assigned_case:
        raise HTTPException(
            status_code=404,
            detail="Assigned case not found"
        )
    
    current_appearances = json.loads(assigned_case.appearances or "[]")
    new_entry = {
        "appearanceDate": data.appearance_date,
        "advocateName": data.advocate_name,
        "courtBench": data.court_bench,
        "stage": data.stage,
        "summary": data.summary,
        "nextDate": data.next_date
    }
    current_appearances.append(new_entry)
    assigned_case.appearances = json.dumps(current_appearances)
    
    if data.next_date:
        assigned_case.due_date = data.next_date
        
    db.commit()
    db.refresh(assigned_case)
    
    assigned_case.assigned_documents = json.loads(assigned_case.assigned_documents or "[]")
    assigned_case.appearances = json.loads(assigned_case.appearances or "[]")
    return assigned_case


# Update a court appearance entry
@router.put("/assigned-cases/{case_id}/appearances/{index}", response_model=AssignedCaseOut)
def edit_assigned_case_appearance(
    case_id: int,
    index: int,
    data: CaseAppearanceCreate,
    db: Session = Depends(get_db)
):
    import json
    from .models import AssignedCase
    assigned_case = db.query(AssignedCase).filter(AssignedCase.id == case_id).first()
    if not assigned_case:
        raise HTTPException(status_code=404, detail="Assigned case not found")
    
    current_appearances = json.loads(assigned_case.appearances or "[]")
    if index < 0 or index >= len(current_appearances):
        raise HTTPException(status_code=404, detail="Appearance entry index out of bounds")
        
    current_appearances[index] = {
        "appearanceDate": data.appearance_date,
        "advocateName": data.advocate_name,
        "courtBench": data.court_bench,
        "stage": data.stage,
        "summary": data.summary,
        "nextDate": data.next_date
    }
    assigned_case.appearances = json.dumps(current_appearances)
    
    if data.next_date:
        assigned_case.due_date = data.next_date
        
    db.commit()
    db.refresh(assigned_case)
    
    assigned_case.assigned_documents = json.loads(assigned_case.assigned_documents or "[]")
    assigned_case.appearances = json.loads(assigned_case.appearances or "[]")
    return assigned_case


# Delete a court appearance entry
@router.delete("/assigned-cases/{case_id}/appearances/{index}", response_model=AssignedCaseOut)
def delete_assigned_case_appearance(
    case_id: int,
    index: int,
    db: Session = Depends(get_db)
):
    import json
    from .models import AssignedCase
    assigned_case = db.query(AssignedCase).filter(AssignedCase.id == case_id).first()
    if not assigned_case:
        raise HTTPException(status_code=404, detail="Assigned case not found")
    
    current_appearances = json.loads(assigned_case.appearances or "[]")
    if index < 0 or index >= len(current_appearances):
        raise HTTPException(status_code=404, detail="Appearance entry index out of bounds")
        
    current_appearances.pop(index)
    assigned_case.appearances = json.dumps(current_appearances)
    
    db.commit()
    db.refresh(assigned_case)
    
    assigned_case.assigned_documents = json.loads(assigned_case.assigned_documents or "[]")
    assigned_case.appearances = json.loads(assigned_case.appearances or "[]")
    return assigned_case