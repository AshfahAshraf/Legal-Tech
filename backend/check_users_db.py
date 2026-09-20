from app.database import engine
from sqlalchemy import text
import json

with engine.connect() as conn:
    print("--- ADVOCATES ---")
    res1 = conn.execute(text("SELECT id, advocate_name, email_address, role FROM advocates"))
    print(json.dumps([dict(r._mapping) for r in res1], indent=2))
    
    print("--- USERS ---")
    res2 = conn.execute(text("SELECT id, username, email, role FROM users"))
    print(json.dumps([dict(r._mapping) for r in res2], indent=2))
