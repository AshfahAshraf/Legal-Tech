"""
Migration script — adds new columns to the existing `invoices` table
and creates the new `expense_entries` table.

Run ONCE from the backend root:
    python -m app.advocate.finance_management.migration_finance

Safe to run multiple times — uses ADD COLUMN IF NOT EXISTS (MySQL 8+).
"""
import os
from sqlalchemy import text
from app.database import SessionLocal, engine
from app.database import Base

# Import both models so Base knows about them
from app.advocate.finance_management.models import Invoice, ExpenseEntry  # noqa: F401


def run():
    # 1. Create the expense_entries table if it does not exist
    Base.metadata.create_all(bind=engine, tables=[ExpenseEntry.__table__])
    print("✅ expense_entries table ready.")

    # 2. Add new columns to invoices if they don't already exist (MySQL 8)
    new_columns = [
        ("court_type",              "VARCHAR(100)"),
        ("case_type_category",      "VARCHAR(150)"),
        ("suit_value",              "FLOAT DEFAULT 0.0"),
        ("efiling_mode",            "VARCHAR(50)"),
        ("is_court_fee_overridden", "TINYINT(1) DEFAULT 0"),
        ("court_fee_override_note", "VARCHAR(255)"),
        ("vakalatnama_count",       "INT DEFAULT 1"),
        ("welfare_fund_amount",     "FLOAT DEFAULT 0.0"),
        ("stipend_stamp_amount",    "FLOAT DEFAULT 0.0"),
        ("advocate_fee_basis",      "VARCHAR(50)"),
        ("efiling_charge",          "FLOAT DEFAULT 0.0"),
        ("misc_expenses_json",      "TEXT"),
        ("gstin",                   "VARCHAR(20)"),
        ("apply_gst",               "TINYINT(1) DEFAULT 0"),
        ("due_date",                "DATE"),
        ("paid_at",                 "DATETIME"),
        ("updated_at",              "DATETIME"),
        ("stamp_duty_state",        "VARCHAR(100) DEFAULT 'Kerala'"),
    ]

    db = SessionLocal()
    try:
        for col_name, col_def in new_columns:
            try:
                db.execute(text(
                    f"ALTER TABLE invoices ADD COLUMN {col_name} {col_def}"
                ))
                db.commit()
                print(f"  ✅ Added column: invoices.{col_name}")
            except Exception as e:
                db.rollback()
                if "Duplicate column name" in str(e) or "already exists" in str(e).lower():
                    print(f"  ⏭  Column already exists: invoices.{col_name}")
                else:
                    print(f"  ⚠️  Could not add invoices.{col_name}: {e}")
    finally:
        db.close()

    print("\n✅ Finance management migration complete.")


if __name__ == "__main__":
    run()
