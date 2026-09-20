"""add case_id and fix assigned_cases schema

Revision ID: a3c9e1f2b4d7
Revises: f1a2b3c4d5e6
Create Date: 2026-07-16 11:35:00.000000
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = "a3c9e1f2b4d7"
down_revision: Union[str, None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def column_exists(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col["name"] for col in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    # Add case_id (Integer) to assigned_cases if missing
    if not column_exists("assigned_cases", "case_id"):
        op.add_column(
            "assigned_cases",
            sa.Column("case_id", sa.Integer(), nullable=True),
        )

    # Rename practice_area -> practice_court in assigned_cases if needed
    if column_exists("assigned_cases", "practice_area") and not column_exists("assigned_cases", "practice_court"):
        op.alter_column(
            "assigned_cases",
            "practice_area",
            new_column_name="practice_court",
            existing_type=sa.String(length=100),
        )

    # Rename practice_area -> practice_court in advocates if needed
    if column_exists("advocates", "practice_area") and not column_exists("advocates", "practice_court"):
        op.alter_column(
            "advocates",
            "practice_area",
            new_column_name="practice_court",
            existing_type=sa.String(length=255),
        )

    # Add practice_court to assigned_cases if still missing
    if not column_exists("assigned_cases", "practice_court"):
        op.add_column(
            "assigned_cases",
            sa.Column("practice_court", sa.String(length=100), nullable=True),
        )

    # Add practice_court to advocates if still missing
    if not column_exists("advocates", "practice_court"):
        op.add_column(
            "advocates",
            sa.Column("practice_court", sa.String(length=100), nullable=True),
        )


def downgrade() -> None:
    if column_exists("assigned_cases", "case_id"):
        op.drop_column("assigned_cases", "case_id")
