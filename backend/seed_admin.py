import sys
import os
from datetime import date, datetime, timedelta

# Add the parent directory of backend/app to Python path to allow absolute imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, Base, engine
from app.authapp.models import User
from app.authapp.service import hash_password
from app.advocate.permissions.models import Role, Permission
from app.advocate.permissions.service import DEFAULT_ROLE_PERMISSIONS

def seed_admin_and_permissions():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    print("Checking and seeding roles and permissions...")

    # Insert default roles and permissions
    role_names = {
        "senioradvocate": "Senior Advocate",
        "junioradvocate": "Junior Advocate",
        "client": "Client",
        "lawfirm": "Law Firm Admin"
    }

    for role_id, perms in DEFAULT_ROLE_PERMISSIONS.items():
        role = db.query(Role).filter_by(id=role_id).first()
        if not role:
            role = Role(id=role_id, name=role_names.get(role_id, role_id), description="Default Role")
            db.add(role)
            db.commit()
            print(f"Created role: {role.name}")
        
        # Check permissions for the role
        for module, actions in perms.items():
            perm = db.query(Permission).filter_by(role_id=role_id, module=module).first()
            if not perm:
                perm = Permission(
                    role_id=role_id,
                    module=module,
                    view=actions.get("view", False),
                    add=actions.get("add", False),
                    edit=actions.get("edit", False),
                    delete=actions.get("delete", False)
                )
                db.add(perm)
                db.commit()
                print(f"Created permission for {role_id} on module {module}")

    # Insert default admin user only if it doesn't exist
    admin = db.query(User).filter_by(username="admin").first()
    if not admin:
        admin = User(
            username="admin",
            email="admin@example.com",
            password=hash_password("admin123"),
            role="Senior Advocate"
        )
        db.add(admin)
        db.commit()
        print("Created default admin user.")
    else:
        print("Default admin user already exists.")

    db.close()
    print("Admin and roles seeding completed successfully.")

if __name__ == "__main__":
    seed_admin_and_permissions()
