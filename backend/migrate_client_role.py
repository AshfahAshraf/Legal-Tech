import sys
from sqlalchemy import text
from app.database import engine

def migrate():
    print("Starting database migration for client_role column...")
    try:
        with engine.connect() as connection:
            connection.execute(text("ALTER TABLE case_management_cases ADD COLUMN client_role VARCHAR(50) DEFAULT NULL"))
            connection.commit()
            print("Successfully added 'client_role' column to 'case_management_cases' table.")
    except Exception as e:
        if "Duplicate column name" in str(e) or "1060" in str(e):
            print("Column 'client_role' already exists in 'case_management_cases'. Skipping.")
        else:
            print(f"Migration error / note: {e}")

if __name__ == "__main__":
    migrate()
