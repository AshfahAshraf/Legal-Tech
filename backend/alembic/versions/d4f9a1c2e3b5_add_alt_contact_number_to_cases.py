"""add alt_contact_number to case_management_cases

Revision ID: d4f9a1c2e3b5
Revises: 094733d59160
Create Date: 2026-08-03 13:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = 'd4f9a1c2e3b5'
down_revision: Union[str, None] = '094733d59160'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def column_exists(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col["name"] for col in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    if not column_exists('case_management_cases', 'alt_contact_number'):
        op.add_column(
            'case_management_cases',
            sa.Column('alt_contact_number', sa.String(50), nullable=True)
        )


def downgrade() -> None:
    if column_exists('case_management_cases', 'alt_contact_number'):
        op.drop_column('case_management_cases', 'alt_contact_number')
