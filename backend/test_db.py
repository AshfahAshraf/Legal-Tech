import os
from dotenv import load_dotenv
import sqlalchemy
load_dotenv()
engine = sqlalchemy.create_engine(os.getenv('DATABASE_URL'))
try:
  with engine.connect() as conn:
    print(conn.execute(sqlalchemy.text('SHOW TABLES;')).fetchall())
except Exception as e:
  print('Error:', e)
