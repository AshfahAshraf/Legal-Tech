import os
import sys
from sqlalchemy import text
from app.database import engine

def migrate():
    print("Starting migration: adding secondary_advocate_name column to assigned_cases table...")
    with engine.connect() as conn:
        try:
            # Check if column exists
            result = conn.execute(text("SHOW COLUMNS FROM assigned_cases LIKE 'secondary_advocate_name'"))
            column = result.fetchone()
            if not column:
                conn.execute(text("ALTER TABLE assigned_cases ADD COLUMN secondary_advocate_name VARCHAR(255) NULL"))
                conn.commit()
                print("Column 'secondary_advocate_name' added successfully.")
            else:
                print("Column 'secondary_advocate_name' already exists.")
        except Exception as e:
            print(f"Migration error: {e}")
            sys.exit(1)

if __name__ == "__main__":
    migrate()
