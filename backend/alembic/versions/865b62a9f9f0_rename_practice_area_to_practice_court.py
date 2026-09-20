"""rename practice_area to practice_court

Revision ID: 865b62a9f9f0
Revises: 4c2417c1ca90
Create Date: 2026-07-16 11:09:17.057775
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "865b62a9f9f0"
down_revision: Union[str, None] = "4c2417c1ca90"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("advocates"):
        columns = [c["name"] for c in inspector.get_columns("advocates")]
        if "practice_area" in columns and "practice_court" not in columns:
            op.alter_column(
                "advocates",
                "practice_area",
                new_column_name="practice_court",
                existing_type=sa.String(length=255),
            )
        elif "practice_court" not in columns:
            op.add_column("advocates", sa.Column("practice_court", sa.String(length=255), nullable=True))

    if inspector.has_table("assigned_cases"):
        columns = [c["name"] for c in inspector.get_columns("assigned_cases")]
        if "practice_area" in columns and "practice_court" not in columns:
            op.alter_column(
                "assigned_cases",
                "practice_area",
                new_column_name="practice_court",
                existing_type=sa.String(length=255),
            )
        elif "practice_court" not in columns:
            op.add_column("assigned_cases", sa.Column("practice_court", sa.String(length=255), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("advocates"):
        columns = [c["name"] for c in inspector.get_columns("advocates")]
        if "practice_court" in columns and "practice_area" not in columns:
            op.alter_column(
                "advocates",
                "practice_court",
                new_column_name="practice_area",
                existing_type=sa.String(length=255),
            )

    if inspector.has_table("assigned_cases"):
        columns = [c["name"] for c in inspector.get_columns("assigned_cases")]
        if "practice_court" in columns and "practice_area" not in columns:
            op.alter_column(
                "assigned_cases",
                "practice_court",
                new_column_name="practice_area",
                existing_type=sa.String(length=255),
            )