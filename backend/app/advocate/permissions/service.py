import re
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, List, Any, Optional

from app.authapp.models import User
from app.authapp.service import hash_password
from .models import Role, Permission
from .schemas import RoleCreate, RoleUpdate, UserProvision, UserUpdate


# All system modules that can have permissions configured
BASE_MODULES = [
    "Dashboard",
    "Junior Dashboard",
    "Client Dashboard",
    "Law Firm Management",
    "Client Management",
    "Case Management",
    "Consultations",
    "Finance Management",
    "Calendar",
    "Junior Calendar",
    "Profile",
    "Assigned Cases",
    "Assigned Tasks",
    "Junior Assigned Tasks",
    "Consultation",
    "Case Tracking",
    "Documents",
    "Payments",
    "User Roles",
    "Roles",
    "Users",
    "Permissions",
    "Clerk Dashboard",
    "Next Posting",
    "Court Visit",
    "Physical Filing",
    "Court Order Collection",
    "Client Notice",
    "Document Draft",
    "Format Physical File",
    "Clerk Documents",
    "Leave Management",
    "Junior Leave",
    "Clerk Leave",
    "eCourts Integration",
]

# Default permission matrix for seeding core roles
DEFAULT_ROLE_PERMISSIONS = {
    "senioradvocate": {
        "Dashboard": {"view": True, "add": True, "edit": True, "delete": True},
        "Junior Dashboard": {"view": True, "add": True, "edit": True, "delete": True},
        "Client Dashboard": {"view": True, "add": True, "edit": True, "delete": True},
        "Law Firm Management": {"view": True, "add": True, "edit": True, "delete": True},
        "Client Management": {"view": True, "add": True, "edit": True, "delete": True},
        "Case Management": {"view": True, "add": True, "edit": True, "delete": True},
        "Consultations": {"view": True, "add": True, "edit": True, "delete": True},
        "Finance Management": {"view": True, "add": True, "edit": True, "delete": True},
        "Calendar": {"view": True, "add": True, "edit": True, "delete": True},
        "Junior Calendar": {"view": True, "add": True, "edit": True, "delete": True},
        "Profile": {"view": True, "add": True, "edit": True, "delete": True},
        "Assigned Cases": {"view": True, "add": True, "edit": True, "delete": True},
        "Assigned Tasks": {"view": True, "add": True, "edit": True, "delete": True},
        "Junior Assigned Tasks": {"view": True, "add": True, "edit": True, "delete": True},
        "Consultation": {"view": True, "add": True, "edit": True, "delete": True},
        "Case Tracking": {"view": True, "add": True, "edit": True, "delete": True},
        "Documents": {"view": True, "add": True, "edit": True, "delete": True},
        "Payments": {"view": True, "add": True, "edit": True, "delete": True},
        "User Roles": {"view": True, "add": True, "edit": True, "delete": True},
        "Roles": {"view": True, "add": True, "edit": True, "delete": True},
        "Users": {"view": True, "add": True, "edit": True, "delete": True},
        "Permissions": {"view": True, "add": True, "edit": True, "delete": True},
        "Clerk Dashboard": {"view": True, "add": True, "edit": True, "delete": True},
        "Next Posting": {"view": True, "add": True, "edit": True, "delete": True},
        "Court Visit": {"view": True, "add": True, "edit": True, "delete": True},
        "Physical Filing": {"view": True, "add": True, "edit": True, "delete": True},
        "Court Order Collection": {"view": True, "add": True, "edit": True, "delete": True},
        "Client Notice": {"view": True, "add": True, "edit": True, "delete": True},
        "Document Draft": {"view": True, "add": True, "edit": True, "delete": True},
        "Format Physical File": {"view": True, "add": True, "edit": True, "delete": True},
        "Leave Management": {"view": True, "add": True, "edit": True, "delete": True},
        "Junior Leave": {"view": True, "add": True, "edit": True, "delete": True},
        "Clerk Leave": {"view": True, "add": True, "edit": True, "delete": True},
        "eCourts Integration": {"view": True, "add": True, "edit": True, "delete": True},
    },
    "junioradvocate": {
        "Dashboard": {"view": False, "add": False, "edit": False, "delete": False},
        "Junior Dashboard": {"view": True, "add": False, "edit": False, "delete": False},
        "Client Dashboard": {"view": False, "add": False, "edit": False, "delete": False},
        "Law Firm Management": {"view": True, "add": False, "edit": False, "delete": False},
        "Client Management": {"view": True, "add": True, "edit": True, "delete": False},
        "Case Management": {"view": True, "add": True, "edit": True, "delete": False},
        "Consultations": {"view": True, "add": True, "edit": False, "delete": False},
        "Finance Management": {"view": False, "add": False, "edit": False, "delete": False},
        "Calendar": {"view": False, "add": False, "edit": False, "delete": False},
        "Junior Calendar": {"view": True, "add": True, "edit": True, "delete": False},
        "Profile": {"view": True, "add": False, "edit": True, "delete": False},
        "Assigned Cases": {"view": True, "add": False, "edit": False, "delete": False},
        "Assigned Tasks": {"view": False, "add": False, "edit": False, "delete": False},
        "Junior Assigned Tasks": {"view": True, "add": False, "edit": True, "delete": False},
        "Consultation": {"view": True, "add": False, "edit": False, "delete": False},
        "Case Tracking": {"view": True, "add": False, "edit": False, "delete": False},
        "Documents": {"view": True, "add": False, "edit": False, "delete": False},
        "Payments": {"view": False, "add": False, "edit": False, "delete": False},
        "User Roles": {"view": False, "add": False, "edit": False, "delete": False},
        "Roles": {"view": False, "add": False, "edit": False, "delete": False},
        "Users": {"view": False, "add": False, "edit": False, "delete": False},
        "Permissions": {"view": False, "add": False, "edit": False, "delete": False},
        "Clerk Dashboard": {"view": False, "add": False, "edit": False, "delete": False},
        "Document Draft": {"view": False, "add": False, "edit": False, "delete": False},
        "Format Physical File": {"view": False, "add": False, "edit": False, "delete": False},
        "Leave Management": {"view": False, "add": False, "edit": False, "delete": False},
        "Junior Leave": {"view": True, "add": True, "edit": True, "delete": False},
        "Clerk Leave": {"view": False, "add": False, "edit": False, "delete": False},
        "eCourts Integration": {"view": True, "add": True, "edit": False, "delete": False},
    },
    "client": {
        "Dashboard": {"view": False, "add": False, "edit": False, "delete": False},
        "Junior Dashboard": {"view": False, "add": False, "edit": False, "delete": False},
        "Client Dashboard": {"view": True, "add": False, "edit": False, "delete": False},
        "Law Firm Management": {"view": False, "add": False, "edit": False, "delete": False},
        "Client Management": {"view": False, "add": False, "edit": False, "delete": False},
        "Case Management": {"view": False, "add": False, "edit": False, "delete": False},
        "Consultations": {"view": False, "add": False, "edit": False, "delete": False},
        "Finance Management": {"view": False, "add": False, "edit": False, "delete": False},
        "Calendar": {"view": False, "add": False, "edit": False, "delete": False},
        "Junior Calendar": {"view": False, "add": False, "edit": False, "delete": False},
        "Profile": {"view": True, "add": False, "edit": True, "delete": False},
        "Assigned Cases": {"view": False, "add": False, "edit": False, "delete": False},
        "Assigned Tasks": {"view": False, "add": False, "edit": False, "delete": False},
        "Junior Assigned Tasks": {"view": False, "add": False, "edit": False, "delete": False},
        "Consultation": {"view": True, "add": True, "edit": False, "delete": False},
        "Case Tracking": {"view": True, "add": False, "edit": False, "delete": False},
        "Documents": {"view": True, "add": False, "edit": False, "delete": False},
        "Payments": {"view": True, "add": False, "edit": False, "delete": False},
        "User Roles": {"view": False, "add": False, "edit": False, "delete": False},
        "Roles": {"view": False, "add": False, "edit": False, "delete": False},
        "Users": {"view": False, "add": False, "edit": False, "delete": False},
        "Clerk Dashboard": {"view": False, "add": False, "edit": False, "delete": False},
        "Document Draft": {"view": False, "add": False, "edit": False, "delete": False},
        "Format Physical File": {"view": False, "add": False, "edit": False, "delete": False},
        "Leave Management": {"view": False, "add": False, "edit": False, "delete": False},
        "Junior Leave": {"view": False, "add": False, "edit": False, "delete": False},
        "Clerk Leave": {"view": False, "add": False, "edit": False, "delete": False},
        "eCourts Integration": {"view": False, "add": False, "edit": False, "delete": False},
    },
    "clerk": {
        "Dashboard": {"view": False, "add": False, "edit": False, "delete": False},
        "Junior Dashboard": {"view": False, "add": False, "edit": False, "delete": False},
        "Client Dashboard": {"view": False, "add": False, "edit": False, "delete": False},
        "Clerk Dashboard": {"view": True, "add": True, "edit": True, "delete": True},
        "Law Firm Management": {"view": False, "add": False, "edit": False, "delete": False},
        "Client Management": {"view": False, "add": False, "edit": False, "delete": False},
        "Case Management": {"view": False, "add": False, "edit": False, "delete": False},
        "Consultations": {"view": False, "add": False, "edit": False, "delete": False},
        "Finance Management": {"view": False, "add": False, "edit": False, "delete": False},
        "Calendar": {"view": False, "add": False, "edit": False, "delete": False},
        "Junior Calendar": {"view": False, "add": False, "edit": False, "delete": False},
        "Profile": {"view": True, "add": False, "edit": True, "delete": False},
        "Assigned Cases": {"view": False, "add": False, "edit": False, "delete": False},
        "Assigned Tasks": {"view": True, "add": True, "edit": True, "delete": True},
        "Junior Assigned Tasks": {"view": False, "add": False, "edit": False, "delete": False},
        "Consultation": {"view": False, "add": False, "edit": False, "delete": False},
        "Case Tracking": {"view": False, "add": False, "edit": False, "delete": False},
        "Documents": {"view": False, "add": False, "edit": False, "delete": False},
        "Payments": {"view": False, "add": False, "edit": False, "delete": False},
        "User Roles": {"view": False, "add": False, "edit": False, "delete": False},
        "Roles": {"view": False, "add": False, "edit": False, "delete": False},
        "Users": {"view": False, "add": False, "edit": False, "delete": False},
        "Permissions": {"view": False, "add": False, "edit": False, "delete": False},
        "Client Document Generate": {"view": False, "add": False, "edit": False, "delete": False},
        "Next Posting": {"view": False, "add": False, "edit": False, "delete": False},
        "Court Visit": {"view": True, "add": True, "edit": True, "delete": True},
        "Physical Filing": {"view": False, "add": False, "edit": False, "delete": False},
        "Court Order Collection": {"view": True, "add": True, "edit": True, "delete": True},
        "Client Notice": {"view": True, "add": True, "edit": True, "delete": True},
        "Document Draft": {"view": True, "add": True, "edit": True, "delete": True},
        "Format Physical File": {"view": True, "add": True, "edit": True, "delete": True},
        "Clerk Documents": {"view": True, "add": True, "edit": True, "delete": True},
        "Leave Management": {"view": False, "add": False, "edit": False, "delete": False},
        "Junior Leave": {"view": True, "add": False, "edit": True, "delete": False},
        "Clerk Leave": {"view": True, "add": True, "edit": True, "delete": True},
        "eCourts Integration": {"view": True, "add": True, "edit": False, "delete": False},
    },
}



# -------------------------------
# ROLES SERVICE
# -------------------------------

def get_roles(db: Session) -> List[Role]:
    return db.query(Role).all()


def get_role_by_id(db: Session, role_id: str) -> Optional[Role]:
    return db.query(Role).filter(Role.id == role_id).first()


def get_role_by_name(db: Session, name: str) -> Optional[Role]:
    return db.query(Role).filter(
        func.lower(Role.name) == name.lower()
    ).first()


def create_role(db: Session, data: RoleCreate) -> Role:
    # Generate role ID
    role_id = re.sub(r'[^a-zA-Z0-9]', '', data.name.lower())

    # Check if role ID already exists
    existing_id = get_role_by_id(db, role_id)
    existing_name = get_role_by_name(db, data.name)

    if existing_id or existing_name:
        raise ValueError("Role already exists")

    db_role = Role(
        id=role_id,
        name=data.name.strip(),
        description=data.description.strip() if data.description else ""
    )

    db.add(db_role)
    db.commit()
    db.refresh(db_role)

    # Seed empty permissions for all modules so new role appears in matrix
    for module in BASE_MODULES:
        db_perm = Permission(
            role_id=db_role.id,
            module=module,
            view=False,
            add=False,
            edit=False,
            delete=False
        )
        db.add(db_perm)
    db.commit()

    return db_role


def update_role(
    db: Session,
    role_id: str,
    data: RoleUpdate
) -> Optional[Role]:
    db_role = get_role_by_id(db, role_id)

    if not db_role:
        return None

    # Prevent duplicate names
    existing = get_role_by_name(db, data.name)
    if existing and existing.id != role_id:
        return None

    # Protect core roles from renaming
    if role_id in ["senioradvocate", "junioradvocate", "client"]:
        db_role.description = (
            data.description.strip()
            if data.description else ""
        )
    else:
        db_role.name = data.name.strip()
        db_role.description = (
            data.description.strip()
            if data.description else ""
        )

    db.commit()
    db.refresh(db_role)

    return db_role


def delete_role(db: Session, role_id: str) -> bool:
    # Protect core roles
    if role_id in ["senioradvocate", "junioradvocate", "client"]:
        return False

    db_role = get_role_by_id(db, role_id)

    if not db_role:
        return False

    db.delete(db_role)
    db.commit()

    return True


# -------------------------------
# PERMISSIONS SERVICE
# -------------------------------

def get_permissions_matrix(
    db: Session
) -> Dict[str, Dict[str, Dict[str, bool]]]:
    roles = get_roles(db)
    matrix = {}

    for role in roles:
        matrix[role.name] = {}

        perms = db.query(Permission).filter(
            Permission.role_id == role.id
        ).all()

        for perm in perms:
            matrix[role.name][perm.module] = {
                "view": perm.view,
                "add": perm.add,
                "edit": perm.edit,
                "delete": perm.delete
            }

    return matrix


def update_role_permissions(
    db: Session,
    role_name: str,
    new_permissions: Dict[str, Any]
) -> bool:
    db_role = get_role_by_name(db, role_name)

    if not db_role:
        return False

    # Delete old permissions
    db.query(Permission).filter(
        Permission.role_id == db_role.id
    ).delete()

    # Insert new permissions
    for module_key, actions in new_permissions.items():
        db_perm = Permission(
            role_id=db_role.id,
            module=module_key,
            view=actions.get("view", False),
            add=actions.get("add", False),
            edit=actions.get("edit", False),
            delete=actions.get("delete", False)
        )
        db.add(db_perm)

    db.commit()

    return True


def seed_roles_and_permissions(db: Session) -> None:
    """
    Idempotent seeder: creates default roles and their permissions
    if they do not already exist. Called at application startup.
    """
    # Remove obsolete Legal Specialist role if it exists in DB
    obsolete_role = db.query(Role).filter((Role.id == "legalspecialist") | (Role.name == "Legal Specialist")).first()
    if obsolete_role:
        db.query(Permission).filter(Permission.role_id == obsolete_role.id).delete()
        db.delete(obsolete_role)
        db.commit()

    # Remove obsolete Online e-Filing & Task Assignment module permissions if existing in DB
    db.query(Permission).filter(Permission.module.in_(["Online e-Filing", "Task Assignment"])).delete(synchronize_session=False)
    db.commit()

    core_roles = [
        {"id": "senioradvocate", "name": "Senior Advocate", "description": "Full system access"},
        {"id": "junioradvocate", "name": "Junior Advocate", "description": "Limited access"},
        {"id": "client",         "name": "Client",          "description": "Client access"},
        {"id": "clerk",           "name": "Clerk",            "description": "Clerk access"},
    ]

    for role_data in core_roles:
        existing = get_role_by_id(db, role_data["id"])
        if not existing:
            db_role = Role(
                id=role_data["id"],
                name=role_data["name"],
                description=role_data["description"]
            )
            db.add(db_role)
            db.commit()
            db.refresh(db_role)
        else:
            db_role = existing

        # Seed permissions for this role if not yet created
        default_perms = DEFAULT_ROLE_PERMISSIONS.get(role_data["id"], {})
        for module in BASE_MODULES:
            exists = db.query(Permission).filter(
                Permission.role_id == db_role.id,
                Permission.module == module
            ).first()
            actions = default_perms.get(
                module,
                {"view": False, "add": False, "edit": False, "delete": False}
            )
            if not exists:
                db_perm = Permission(
                    role_id=db_role.id,
                    module=module,
                    view=actions["view"],
                    add=actions["add"],
                    edit=actions["edit"],
                    delete=actions["delete"]
                )
                db.add(db_perm)
            elif role_data["id"] in ["clerk", "senioradvocate"] and actions.get("view"):
                exists.view = True
                exists.add = actions.get("add", True)
                exists.edit = actions.get("edit", True)
                exists.delete = actions.get("delete", True)

    # Clean up any obsolete permissions not in BASE_MODULES
    db.query(Permission).filter(~Permission.module.in_(BASE_MODULES)).delete(synchronize_session=False)
    db.commit()


# -------------------------------
# USERS SERVICE
# -------------------------------

def get_users(db: Session) -> List[User]:
    return db.query(User).all()


def get_user_by_id(
    db: Session,
    user_id: int
) -> Optional[User]:
    return db.query(User).filter(
        User.id == user_id
    ).first()


def get_user_by_username(
    db: Session,
    username: str
) -> Optional[User]:
    return db.query(User).filter(
        User.username == username
    ).first()


def get_user_by_email(
    db: Session,
    email: str
) -> Optional[User]:
    return db.query(User).filter(
        User.email == email
    ).first()


def provision_user(
    db: Session,
    data: UserProvision
) -> User:
    existing = db.query(User).filter(
        (User.username == data.username) |
        (User.email == data.email)
    ).first()

    if existing:
        raise ValueError(
            "Username or Email already exists"
        )

    default_docs = [
        {
            "docId": "doc_1",
            "name": "Smith v. State - Case Brief.pdf",
            "type": "Case File",
            "view": True,
            "upload": True,
            "edit": False,
            "delete": False
        },
        {
            "docId": "doc_2",
            "name": "Land Title Deed - John Doe.pdf",
            "type": "Property Document",
            "view": True,
            "upload": False,
            "edit": False,
            "delete": False
        },
        {
            "docId": "doc_3",
            "name": "Consultation Agreement - TechCorp.pdf",
            "type": "Contract",
            "view": True,
            "upload": True,
            "edit": True,
            "delete": False
        },
        {
            "docId": "doc_4",
            "name": "Divorce Decree - Final.pdf",
            "type": "Court Order",
            "view": False,
            "upload": False,
            "edit": False,
            "delete": False
        }
    ]

    db_user = User(
        username=data.username.strip(),
        email=data.email.strip(),
        password=hash_password(data.tempPassword),
        role=data.role,
        first_name=data.firstName.strip()
        if data.firstName else "",
        last_name=data.lastName.strip()
        if data.lastName else "",
        phone=data.phone.strip()
        if data.phone else "",
        temp_password=data.tempPassword,
        custom_permissions={},
        document_access=default_docs
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user


def update_user(
    db: Session,
    user_id: int,
    data: UserUpdate
) -> Optional[User]:
    db_user = get_user_by_id(db, user_id)

    if not db_user:
        return None

    if data.firstName is not None:
        db_user.first_name = data.firstName

    if data.lastName is not None:
        db_user.last_name = data.lastName

    if data.phone is not None:
        db_user.phone = data.phone

    if data.username is not None:
        existing = get_user_by_username(
            db, data.username
        )
        if existing and existing.id != user_id:
            raise ValueError(
                "Username already exists"
            )
        db_user.username = data.username

    if data.email is not None:
        existing = get_user_by_email(
            db, data.email
        )
        if existing and existing.id != user_id:
            raise ValueError(
                "Email already exists"
            )
        db_user.email = data.email

    if data.password:
        if data.password != data.confirmPassword:
            raise ValueError("Passwords do not match")

        db_user.temp_password = data.password
        db_user.password = hash_password(data.password)
        
    if data.customPermissions is not None:
        db_user.custom_permissions = {
            mod: {
                "view": act.view,
                "add": act.add,
                "edit": act.edit,
                "delete": act.delete
            }
            for mod, act in data.customPermissions.items()
        }

    if data.documentAccess is not None:
        db_user.document_access = data.documentAccess

    db.commit()
    db.refresh(db_user)

    return db_user



def get_user_delete_impact(db: Session, user_id: int) -> dict:
    """
    Returns a summary of active/in-progress cases linked to a user
    BEFORE deletion, so the frontend can warn the admin.
    Does NOT modify any data.
    """
    from sqlalchemy import text

    db_user = get_user_by_id(db, user_id)
    if not db_user:
        return {"has_impact": False, "assigned_cases": [], "cases": [], "total": 0}

    completed_statuses = ("Completed", "Closed", "Resolved", "completed", "closed", "resolved")
    not_completed = "AND LOWER(status) NOT IN ('completed', 'closed', 'resolved')"

    # --- assigned_cases: match by advocate name OR client name ---
    full_name = f"{db_user.first_name or ''} {db_user.last_name or ''}".strip()
    username = db_user.username or ""

    assigned_rows = db.execute(text(f"""
        SELECT case_name, case_number, case_title, status, client_name, advocate_name
        FROM assigned_cases
        WHERE (
            advocate_name LIKE :name
            OR client_name LIKE :name
            OR advocate_name LIKE :uname
            OR client_name LIKE :uname
        )
        {not_completed}
        LIMIT 20
    """), {"name": f"%{full_name}%", "uname": f"%{username}%"}).fetchall()

    assigned_cases = [
        {
            "case_name": r[0] or r[2] or "Unnamed Case",
            "case_number": r[1] or "—",
            "status": r[3] or "Active",
            "client_name": r[4] or "",
            "advocate_name": r[5] or "",
        }
        for r in assigned_rows
    ]

    # --- cases table: match by advocate_id FK ---
    case_rows = db.execute(text(f"""
        SELECT title, case_no, status, client_name
        FROM cases
        WHERE advocate_id = :uid
        {not_completed}
        LIMIT 20
    """), {"uid": user_id}).fetchall()

    cases = [
        {
            "title": r[0] or "Unnamed Case",
            "case_no": r[1] or "—",
            "status": r[2] or "Open",
            "client_name": r[3] or "",
        }
        for r in case_rows
    ]

    total = len(assigned_cases) + len(cases)

    return {
        "has_impact": total > 0,
        "assigned_cases": assigned_cases,
        "cases": cases,
        "total": total,
        "user_name": full_name or username,
        "user_role": db_user.role or "",
    }


def delete_user(
    db: Session,
    user_id: int
) -> bool:

    # Protect admin user
    if user_id == 1:
        return False

    db_user = get_user_by_id(db, user_id)

    if not db_user:
        return False

    from sqlalchemy import text

    # Nullify / remove all FK references to this user before deletion
    db.execute(text("DELETE FROM activities WHERE advocate_id = :uid"), {"uid": user_id})
    db.execute(text("DELETE FROM advocate_task_messages WHERE user_id = :uid"), {"uid": user_id})
    db.execute(text("UPDATE advocate_tasks SET senior_advocate_id = NULL WHERE senior_advocate_id = :uid"), {"uid": user_id})
    db.execute(text("UPDATE advocate_tasks SET junior_advocate_id = NULL WHERE junior_advocate_id = :uid"), {"uid": user_id})
    db.execute(text("UPDATE case_document_workflows SET junior_id = NULL WHERE junior_id = :uid"), {"uid": user_id})
    db.execute(text("UPDATE case_document_workflows SET senior_id = NULL WHERE senior_id = :uid"), {"uid": user_id})
    db.execute(text("UPDATE cases SET advocate_id = NULL WHERE advocate_id = :uid"), {"uid": user_id})
    db.execute(text("UPDATE consultations SET client_id = NULL WHERE client_id = :uid"), {"uid": user_id})
    db.execute(text("UPDATE consultations SET advocate_id = NULL WHERE advocate_id = :uid"), {"uid": user_id})
    db.execute(text("UPDATE documents SET advocate_id = NULL WHERE advocate_id = :uid"), {"uid": user_id})
    db.execute(text("UPDATE hearings SET advocate_id = NULL WHERE advocate_id = :uid"), {"uid": user_id})
    db.execute(text("UPDATE invoices SET advocate_id = NULL WHERE advocate_id = :uid"), {"uid": user_id})
    db.commit()

    from sqlalchemy.exc import IntegrityError
    try:
        db.delete(db_user)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ValueError("Cannot delete user: unexpected foreign key constraint.")

    return True



# -------------------------------
# AUTHORIZATION SERVICE
# -------------------------------

def check_user_permission(
    db: Session,
    user_id: int,
    module: str,
    action: str
) -> bool:
    user = get_user_by_id(db, user_id)

    if not user:
        return False

    # Check custom permissions
    custom_perms = user.custom_permissions or {}

    if module in custom_perms:
        if action in custom_perms[module]:
            return bool(
                custom_perms[module][action]
            )

    # Check role permissions: users may store role by name OR by id
    role = get_role_by_id(db, user.role) or get_role_by_name(db, user.role)

    if not role:
        return False

    perm = db.query(Permission).filter(
        Permission.role_id == role.id,
        Permission.module == module
    ).first()

    if not perm:
        return False

    return bool(
        getattr(perm, action, False)
    )