from sqlalchemy.orm import Session
from .models import User
from .service import hash_password

def create_default_user(db: Session):
    existing_user = db.query(User).filter(
        User.email == "admin@example.com"
    ).first()

    if not existing_user:
        default_user = User(
            username="admin",
            email="admin@example.com",
            password=hash_password("admin123"),
            role="Senior Advocate",
            first_name="Admin",
            last_name="System",
            phone="",
            temp_password="admin123",
            custom_permissions={},
            document_access=[]
        )

        db.add(default_user)
        db.commit()
        print("Default admin created!")