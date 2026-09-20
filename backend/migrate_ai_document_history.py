import sys
from sqlalchemy import text
from app.database import engine, Base
from app.advocate.case_management.models import AIDocumentHistory

def migrate():
    print("Starting database migration for ai_document_histories table...")
    try:
        # Create table if it doesn't exist via SQLAlchemy Base metadata
        Base.metadata.create_all(bind=engine, tables=[AIDocumentHistory.__table__])
        print("Successfully ensured 'ai_document_histories' table exists.")
    except Exception as e:
        print(f"Migration error: {e}")

if __name__ == "__main__":
    migrate()
