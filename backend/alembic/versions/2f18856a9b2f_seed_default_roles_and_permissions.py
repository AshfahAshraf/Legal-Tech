"""seed_default_roles_and_permissions

Revision ID: 2f18856a9b2f
Revises: e30c4a2cea3e
Create Date: 2026-06-23 18:08:07.578229

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2f18856a9b2f'
down_revision: Union[str, None] = 'e30c4a2cea3e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


from sqlalchemy.orm import Session
from app.authapp.models import User
from app.authapp.service import hash_password
from app.advocate.permissions.models import Role, Permission
from app.advocate.permissions.service import DEFAULT_ROLE_PERMISSIONS

def upgrade() -> None:
    bind = op.get_bind()
    db = Session(bind=bind)

    # Check if admin user already exists
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        admin = User(
            username="admin",
            email="admin@example.com",
            password=hash_password("admin123"),
            role="Senior Advocate"
        )
        db.add(admin)

    # Insert default roles and permissions
    role_names = {
        "senioradvocate": "Senior Advocate",
        "junioradvocate": "Junior Advocate",
        "client": "Client"
    }

    for role_id, perms in DEFAULT_ROLE_PERMISSIONS.items():
        role = db.query(Role).filter(Role.id == role_id).first()
        if not role:
            role = Role(id=role_id, name=role_names.get(role_id, role_id), description="Default Role")
            db.add(role)
        
        # We don't delete existing permissions to be non-destructive,
        # but we can add missing ones or just clear and recreate them.
        db.query(Permission).filter(Permission.role_id == role_id).delete()
        for module, actions in perms.items():
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


def downgrade() -> None:
    bind = op.get_bind()
    db = Session(bind=bind)
    
    db.query(Permission).delete()
    db.query(Role).delete()
    db.query(User).filter(User.username == "admin").delete()
    db.commit()
