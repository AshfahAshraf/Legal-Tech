"""add practice_court column to assigned_cases and advocates if missing

Revision ID: f1a2b3c4d5e6
Revises: 865b62a9f9f0
Create Date: 2026-07-16 11:20:00.000000
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect, text

revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, None] = "865b62a9f9f0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def column_exists(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col["name"] for col in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    # Add practice_court to assigned_cases if missing
    if not column_exists("assigned_cases", "practice_court"):
        op.add_column(
            "assigned_cases",
            sa.Column("practice_court", sa.String(length=100), nullable=True),
        )

    # Add practice_court to advocates if missing
    if not column_exists("advocates", "practice_court"):
        op.add_column(
            "advocates",
            sa.Column("practice_court", sa.String(length=100), nullable=True),
        )


def downgrade() -> None:
    if column_exists("assigned_cases", "practice_court"):
        op.drop_column("assigned_cases", "practice_court")

    if column_exists("advocates", "practice_court"):
        op.drop_column("advocates", "practice_court")
