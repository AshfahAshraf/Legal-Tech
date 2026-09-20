import os
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv
import sqlalchemy

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    print("DATABASE_URL not found!")
    exit(1)

engine = sqlalchemy.create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        # Check if the column already exists
        result = conn.execute(sqlalchemy.text("SHOW COLUMNS FROM advocates LIKE 'temp_password';")).fetchall()
        if not result:
            print("Adding temp_password column to advocates table...")
            conn.execute(sqlalchemy.text("ALTER TABLE advocates ADD COLUMN temp_password VARCHAR(255) NULL;"))
            conn.commit()
            print("Column temp_password added successfully!")
        else:
            print("Column temp_password already exists in advocates table.")
except Exception as e:
    print('Error:', e)
