"""merge heads

Revision ID: 0ba3aa8fc5bc
Revises: 579525cc1a15, b0002943251c
Create Date: 2026-06-29 14:57:15.733614

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0ba3aa8fc5bc'
down_revision: Union[str, None] = ('579525cc1a15', 'b0002943251c')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
