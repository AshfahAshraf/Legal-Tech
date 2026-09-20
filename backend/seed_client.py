import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.authapp.models import User
from app.authapp.service import hash_password
from app.advocate.client_management.models import Case

def seed_client_mock_data():
    db = SessionLocal()
    
    # 1. Create a mock Client User
    client_username = "mock_client"
    client = db.query(User).filter_by(username=client_username).first()
    if not client:
        client = User(
            username=client_username,
            email="client@example.com",
            password=hash_password("password123"),
            role="Client"
        )
        db.add(client)
        db.commit()
        print(f"Created mock Client: {client_username}")
    else:
        print(f"Mock Client '{client_username}' already exists.")

    # 2. Add some mock cases for the client
    if client.id:
        existing_case = db.query(Case).filter_by(client_id=client.id).first()
        if not existing_case:
            mock_case = Case(
                client_id=client.id,
                title="Property Dispute",
                description="Dispute over land boundaries.",
                status="Active"
            )
            db.add(mock_case)
            db.commit()
            print("Created mock case for Client.")
        else:
            print("Mock case already exists for this Client.")

    db.close()

if __name__ == "__main__":
    seed_client_mock_data()
