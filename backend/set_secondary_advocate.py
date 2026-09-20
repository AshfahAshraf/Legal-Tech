from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text("UPDATE assigned_cases SET secondary_advocate_name = 'thasni' WHERE id = 42"))
    conn.commit()
    print("Updated case 42 secondary_advocate_name to 'thasni'")
