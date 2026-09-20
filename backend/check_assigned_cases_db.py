from app.database import engine
from sqlalchemy import text
import json

with engine.connect() as conn:
    res = conn.execute(text("SELECT id, case_id, case_name, case_number, advocate_name, secondary_advocate_name, practice_court, status FROM assigned_cases"))
    rows = [dict(r._mapping) for r in res]
    print(json.dumps(rows, indent=2))
