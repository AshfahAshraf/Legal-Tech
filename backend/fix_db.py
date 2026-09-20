import os
from dotenv import load_dotenv
import sqlalchemy
load_dotenv()
engine = sqlalchemy.create_engine(os.getenv('DATABASE_URL'))
try:
    with engine.connect() as conn:
        try:
            conn.execute(sqlalchemy.text("ALTER TABLE invoices ADD COLUMN payment_method VARCHAR(50);"))
        except Exception as e:
            print("payment_method:", e)
        try:
            conn.execute(sqlalchemy.text("ALTER TABLE invoices ADD COLUMN gpay_number VARCHAR(50);"))
        except Exception as e:
            print("gpay_number:", e)
        try:
            conn.execute(sqlalchemy.text("ALTER TABLE invoices ADD COLUMN upi_id VARCHAR(100);"))
        except Exception as e:
            print("upi_id:", e)
        conn.commit()
        print("Columns added successfully.")
except Exception as e:
    print('Connection error:', e)
