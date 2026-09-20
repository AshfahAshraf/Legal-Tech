import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.authapp.models import User
from app.authapp.service import hash_password
from app.advocate.consultations.models import Consultation
from datetime import datetime, timedelta

def seed_senior_advocate_mock_data():
    db = SessionLocal()
    
    # 1. Create a mock Senior Advocate
    sa_username = "mock_senior"
    sa = db.query(User).filter_by(username=sa_username).first()
    if not sa:
        sa = User(
            username=sa_username,
            email="mock_senior@example.com",
            password=hash_password("password123"),
            role="Senior Advocate"
        )
        db.add(sa)
        db.commit()
        print(f"Created mock Senior Advocate: {sa_username}")
    else:
        print(f"Mock Senior Advocate '{sa_username}' already exists.")

    # 2. Add some mock consultations
    if sa.id:
        existing_consultation = db.query(Consultation).filter_by(user_id=sa.id).first()
        if not existing_consultation:
            consultation = Consultation(
                user_id=sa.id,
                client_name="John Doe",
                date=datetime.now().date(),
                time=datetime.now().time(),
                status="Scheduled"
            )
            db.add(consultation)
            db.commit()
            print("Created mock consultation for Senior Advocate.")
        else:
            print("Mock consultation already exists for this Senior Advocate.")

    db.close()

if __name__ == "__main__":
    seed_senior_advocate_mock_data()
