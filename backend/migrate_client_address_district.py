import sys
from sqlalchemy import text
from app.database import engine

def migrate():
    print("Starting database migration for client_address and client_district columns...")
    try:
        with engine.connect() as connection:
            try:
                connection.execute(text("ALTER TABLE case_management_cases ADD COLUMN client_address TEXT DEFAULT NULL"))
                print("Successfully added 'client_address' column.")
            except Exception as e:
                print(f"Note for client_address: {e}")
            
            try:
                connection.execute(text("ALTER TABLE case_management_cases ADD COLUMN client_district VARCHAR(100) DEFAULT NULL"))
                print("Successfully added 'client_district' column.")
            except Exception as e:
                print(f"Note for client_district: {e}")
            
            connection.commit()
            print("Migration completed.")
    except Exception as e:
        print(f"Migration error: {e}")

if __name__ == "__main__":
    migrate()
