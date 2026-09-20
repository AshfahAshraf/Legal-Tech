from app.database import engine
from sqlalchemy import text
import json

with engine.connect() as conn:
    res = conn.execute(text("SELECT id, advocate_name, profile_image, email_address FROM advocates"))
    rows = [dict(r._mapping) for r in res]
    print(json.dumps(rows, indent=2))
