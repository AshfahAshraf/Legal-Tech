import os
from sqlalchemy import text
from app.database import SessionLocal, engine

def run_migration():
    db = SessionLocal()
    try:
        try:
            db.execute(text("ALTER TABLE assigned_cases ADD COLUMN appearances LONGTEXT NULL"))
            db.commit()
            print("✅ Column 'appearances' added to assigned_cases table.")
        except Exception as e:
            # Column likely already exists
            db.rollback()
    except Exception as err:
        print("Migration note:", err)
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
