import os
import sys
from sqlalchemy import inspect, text
from app.database import engine, Base

# Import all model modules so Base.metadata is populated
import app.authapp.models
import app.advocate.tasks.models
import app.advocate.permissions.models
import app.advocate.lawfirm_management.models
import app.advocate.finance_management.models
import app.advocate.consultations.models
import app.advocate.case_management.models
import app.advocate.client_management.models
import app.advocate.leave_management.models


def get_sql_type(column):
    type_str = str(column.type).upper()
    if "LONGTEXT" in type_str:
        return "LONGTEXT"
    elif "LONGBLOB" in type_str:
        return "LONGBLOB"
    elif "VARCHAR" in type_str or "STRING" in type_str:
        length = getattr(column.type, 'length', None) or 255
        return f"VARCHAR({length})"
    elif "TEXT" in type_str:
        return "TEXT"
    elif "INTEGER" in type_str or "INT" in type_str:
        return "INT"
    elif "FLOAT" in type_str:
        return "FLOAT"
    elif "BOOLEAN" in type_str or "BOOL" in type_str:
        return "TINYINT(1)"
    elif "DATETIME" in type_str:
        return "DATETIME"
    elif "DATE" in type_str:
        return "DATE"
    elif "JSON" in type_str:
        return "JSON"
    else:
        return type_str


def sync_schema():
    print("Starting database schema synchronization...")
    inspector = inspect(engine)
    
    # 1. Create missing tables
    Base.metadata.create_all(bind=engine)

    # 2. Check each table for missing columns
    for table_name, table in Base.metadata.tables.items():
        if not inspector.has_table(table_name):
            print(f"Table '{table_name}' was just created.")
            continue

        existing_cols = {col['name'] for col in inspector.get_columns(table_name)}

        for col in table.columns:
            if col.name not in existing_cols:
                sql_type = get_sql_type(col)
                # Primary key / auto_increment columns can be skipped if table exists
                if col.primary_key:
                    continue
                nullable_clause = "NULL" if col.nullable else "NULL" # allow NULL for newly added columns to avoid errors with existing rows
                default_clause = ""
                if col.default is not None and not callable(col.default.arg):
                    default_val = col.default.arg
                    if isinstance(default_val, str):
                        default_clause = f" DEFAULT '{default_val}'"
                    elif isinstance(default_val, bool):
                        default_clause = f" DEFAULT {1 if default_val else 0}"
                    elif isinstance(default_val, (int, float)):
                        default_clause = f" DEFAULT {default_val}"

                alter_sql = f"ALTER TABLE `{table_name}` ADD COLUMN `{col.name}` {sql_type} {nullable_clause}{default_clause}"
                print(f"Adding missing column: `{table_name}`.`{col.name}` ({sql_type})")
                try:
                    with engine.begin() as conn:
                        conn.execute(text(alter_sql))
                    print(f"  [OK] Successfully added `{table_name}`.`{col.name}`")
                except Exception as e:
                    print(f"  [ERROR] Error adding `{table_name}`.`{col.name}`: {e}")

    print("\nDatabase schema synchronization completed successfully.")

if __name__ == "__main__":
    sync_schema()
