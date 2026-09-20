import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.authapp.models import User
from app.authapp.service import hash_password
from app.advocate.finance_management.models import Invoice

def seed_lawfirm_mock_data():
    db = SessionLocal()
    
    # 1. Create a mock Law Firm User
    lf_username = "mock_lawfirm"
    lf = db.query(User).filter_by(username=lf_username).first()
    if not lf:
        lf = User(
            username=lf_username,
            email="lawfirm@example.com",
            password=hash_password("password123"),
            role="Law Firm Admin"
        )
        db.add(lf)
        db.commit()
        print(f"Created mock Law Firm: {lf_username}")
    else:
        print(f"Mock Law Firm '{lf_username}' already exists.")

    # 2. Add some mock invoices
    if lf.id:
        existing_invoice = db.query(Invoice).filter_by(user_id=lf.id).first()
        if not existing_invoice:
            invoice = Invoice(
                user_id=lf.id,
                client_name="Corporate Client A",
                amount=50000.0,
                status="Pending"
            )
            db.add(invoice)
            db.commit()
            print("Created mock invoice for Law Firm.")
        else:
            print("Mock invoice already exists for this Law Firm.")

    db.close()

if __name__ == "__main__":
    seed_lawfirm_mock_data()
