import os
import sys
import json
from sqlalchemy import create_engine, MetaData, Table, text
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

# Load env variables from backend/.env
backend_env = os.path.join(os.path.dirname(__file__), "backend", ".env")
if os.path.exists(backend_env):
    load_dotenv(backend_env)
else:
    load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("Error: DATABASE_URL not found in environment or backend/.env file.")
    sys.exit(1)

engine = create_engine(DATABASE_URL)
metadata = MetaData()

SEED_FILE = "database_seed.json"

def export_db():
    print(f"Exporting database from {DATABASE_URL}...")
    metadata.reflect(bind=engine)
    data = {}
    with engine.connect() as conn:
        for table_name in metadata.tables:
            # Skip system tables
            if table_name.startswith("alembic") or table_name.startswith("sqlite_"):
                continue
            table = metadata.tables[table_name]
            result = conn.execute(table.select())
            rows = [dict(row._mapping) for row in result]
            # Convert any non-serializable fields (dates/decimals) to serializable types
            for row in rows:
                for k, v in row.items():
                    if hasattr(v, "isoformat"):
                        row[k] = v.isoformat()
                    elif hasattr(v, "to_eng_string"):
                        row[k] = float(v)
                    elif isinstance(v, bytes):
                        row[k] = v.hex()
            data[table_name] = rows
            print(f" - Exported {len(rows)} rows from '{table_name}'")
            
    with open(SEED_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"\n[Success] Database exported to '{SEED_FILE}'. Please commit and push this file to Git!")

def import_db():
    if not os.path.exists(SEED_FILE):
        print(f"Error: Seed file '{SEED_FILE}' not found. Please pull the latest version from Git.")
        sys.exit(1)
        
    print(f"Importing database into {DATABASE_URL}...")
    with open(SEED_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    # Reflect metadata to ensure tables exist
    metadata.reflect(bind=engine)
    
    with engine.begin() as conn:
        # Disable foreign key checks for clean load
        is_mysql = "mysql" in DATABASE_URL.lower()
        if is_mysql:
            conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
            
        for table_name, rows in data.items():
            if table_name not in metadata.tables:
                print(f"Warning: Table '{table_name}' does not exist in target database. Skipping.")
                continue
                
            table = metadata.tables[table_name]
            
            # Clear target table
            conn.execute(table.delete())
            print(f" - Cleared table '{table_name}'")
            
            if rows:
                from sqlalchemy import LargeBinary, BLOB, BINARY, VARBINARY
                binary_cols = [c.name for c in table.columns if isinstance(c.type, (LargeBinary, BLOB, BINARY, VARBINARY))]
                if binary_cols:
                    for row in rows:
                        for col in binary_cols:
                            if col in row and isinstance(row[col], str):
                                try:
                                    row[col] = bytes.fromhex(row[col])
                                except Exception:
                                    pass
                # Convert back string dates to appropriate column types if necessary (SQLAlchemy handles ISO string formats usually)
                conn.execute(table.insert(), rows)
                print(f" - Imported {len(rows)} rows into '{table_name}'")
                
        if is_mysql:
            conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
            
    print("\n[Success] Database successfully imported and seeded! Start your backend server and refresh the app.")

if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in ["export", "import"]:
        print("Usage:")
        print("  python db_sync.py export   # Save database rows to seed file")
        print("  python db_sync.py import   # Load database rows from seed file")
        sys.exit(1)
        
    if sys.argv[1] == "export":
        export_db()
    else:
        import_db()
