from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Get database URL from .env file
DATABASE_URL = os.getenv("DATABASE_URL")

connect_args = {}
if DATABASE_URL and "sqlite" in DATABASE_URL:
    connect_args = {"check_same_thread": False, "timeout": 30}

# Create database engine
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args
)

# Create session
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base class for models
Base = declarative_base()

from sqlalchemy import event, MetaData
import threading
import json

def export_database_state():
    try:
        metadata = MetaData()
        metadata.reflect(bind=engine)
        data = {}
        with engine.connect() as conn:
            for table_name in metadata.tables:
                if (
                    table_name.startswith("alembic") or
                    table_name.startswith("sqlite_") or
                    table_name == "uploaded_files"
                ):
                    continue
                table = metadata.tables[table_name]
                result = conn.execute(table.select())
                rows = [dict(row._mapping) for row in result]
                for row in rows:
                    for k, v in row.items():
                        if hasattr(v, "isoformat"):
                            row[k] = v.isoformat()
                        elif hasattr(v, "to_eng_string"):
                            row[k] = float(v)
                        elif isinstance(v, bytes):
                            row[k] = None
                data[table_name] = rows
                
        root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        seed_path = os.path.join(root_dir, "database_seed.json")
        with open(seed_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error auto-exporting database state: {e}")

@event.listens_for(SessionLocal, 'after_commit')
def receive_after_commit(session):
    threading.Thread(target=export_database_state).start()

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()