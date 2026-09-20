"""merge heads

Revision ID: 2761e53231b9
Revises: a3c9e1f2b4d7, d4f9a1c2e3b5
Create Date: 2026-08-04 12:22:57.795818

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2761e53231b9'
down_revision: Union[str, None] = ('a3c9e1f2b4d7', 'd4f9a1c2e3b5')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
