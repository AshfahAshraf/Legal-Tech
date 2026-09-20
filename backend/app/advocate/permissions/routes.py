from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.database import SessionLocal
from . import service
from .schemas import (
    RoleOut, RoleCreate, RoleUpdate,
    PermissionSchema, UserOut, UserProvision, UserUpdate
)

router = APIRouter(prefix="/permissions", tags=["Permissions & Roles Matrix"])

# DB Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def map_user_to_out(user) -> Dict[str, Any]:
    """Helper to cleanly serialize User model attributes to frontend keys."""
    return {
        "id": user.id,
        "firstName": user.first_name or "",
        "lastName": user.last_name or "",
        "phone": user.phone or "",
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "tempPassword": user.temp_password or "",
        "customPermissions": user.custom_permissions or {},
        "documentAccess": user.document_access or []
    }


# --- ROLES ENDPOINTS ---
# Create an API to get all roles from database

@router.get("/roles", response_model=List[RoleOut])
def list_roles(db: Session = Depends(get_db)):
    return service.get_roles(db)

# hecks role name, if not exists creates it.

@router.post("/roles", response_model=RoleOut)
def create_new_role(data: RoleCreate, db: Session = Depends(get_db)):
    # Check if role with this name already exists
    existing = service.get_role_by_name(db, data.name)
    if existing:
        raise HTTPException(status_code=400, detail=f"Role '{data.name}' already exists!")
    try:
        return service.create_role(db, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# finds a role and updates it.

@router.put("/roles/{role_id}", response_model=RoleOut)
def update_existing_role(role_id: str, data: RoleUpdate, db: Session = Depends(get_db)):
    updated = service.update_role(db, role_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Role not found")
    return updated

# deletes a role from database

@router.delete("/roles/{role_id}")
def delete_existing_role(role_id: str, db: Session = Depends(get_db)):
    success = service.delete_role(db, role_id)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot delete core role or role not found")
    return {"message": "Role deleted successfully"}


# --- PERMISSIONS ENDPOINTS ---

# API shows what each role is allowed to do

@router.get("", response_model=Dict[str, Dict[str, PermissionSchema]])
def get_permissions_matrix(db: Session = Depends(get_db)):
    """Returns default permission configurations grouped by Role Name."""
    return service.get_permissions_matrix(db)

# API changes permissions for a role.

@router.put("/role/{role_name}")
def save_role_permissions(role_name: str, matrix: Dict[str, PermissionSchema], db: Session = Depends(get_db)):
    # Convert Pydantic schemas to standard dicts
    matrix_dict = {
        mod: {"view": act.view, "add": act.add, "edit": act.edit, "delete": act.delete}
        for mod, act in matrix.items()
    }
    success = service.update_role_permissions(db, role_name, matrix_dict)
    if not success:
        raise HTTPException(status_code=404, detail=f"Role '{role_name}' not found")
    return {"message": f"Permissions for role '{role_name}' updated successfully"}


# --- USERS ENDPOINTS ---

# shows all users from database

@router.get("/users", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db)):
    users = service.get_users(db)
    return [map_user_to_out(u) for u in users]

@router.get("/users/{user_id}", response_model=UserOut)
def get_user_details(user_id: int, db: Session = Depends(get_db)):
    user = service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return map_user_to_out(user)


# adds a new user to database

@router.post("/users/provision", response_model=UserOut)
async def provision_new_user(data: UserProvision, db: Session = Depends(get_db)):
    try:
        user = service.provision_user(db, data)
        # Send onboarding email to the client or user
        try:
            from app.utils.email import send_email
            from app.utils.email_templates import build_credentials_email
            subject = f"Your Legal-Tech {data.role} Credentials"
            body = build_credentials_email(
                name=data.firstName or data.role,
                role=data.role,
                login_url="http://localhost:3000/login",
                email=data.email,
                password=data.tempPassword
            )
            await send_email(data.email, subject, body)
        except Exception as email_err:
            print(f"Failed to send email to user {data.email}: {email_err}")

        return map_user_to_out(user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# This API edits a user and returns updated data


@router.put("/users/{user_id}", response_model=UserOut)
def update_user_details(user_id: int, data: UserUpdate, db: Session = Depends(get_db)):
    try:
        updated = service.update_user(db, user_id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return map_user_to_out(updated)


# API checks what active cases will be impacted if user is deleted
@router.get("/users/{user_id}/delete-impact")
def get_delete_impact(user_id: int, db: Session = Depends(get_db)):
    return service.get_user_delete_impact(db, user_id)


# API deletes a user
@router.delete("/users/{user_id}")
def delete_user_account(user_id: int, db: Session = Depends(get_db)):
    try:
        success = service.delete_user(db, user_id)
        if not success:
            raise HTTPException(status_code=400, detail="Cannot delete administrative user or user not found")
        return {"message": "User de-provisioned successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
