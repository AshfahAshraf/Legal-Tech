"""add meeting_link to consultations"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import mysql

revision: str = "2925bd5f117f"
down_revision: Union[str, None] = "0ba3aa8fc5bc"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    columns = [column["name"] for column in inspector.get_columns("consultations")]

    if "meeting_link" not in columns:
        op.add_column(
            "consultations",
            sa.Column("meeting_link", sa.String(length=500), nullable=True)
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    columns = [column["name"] for column in inspector.get_columns("consultations")]

    if "meeting_link" in columns:
        op.drop_column("consultations", "meeting_link")

    op.add_column(
        "advocates",
        sa.Column("languages_known", mysql.VARCHAR(length=200), nullable=True)
    )
    op.add_column(
        "advocates",
        sa.Column("law_firm_name", mysql.VARCHAR(length=100), nullable=True)
    )