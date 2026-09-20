"""merge heads

Revision ID: 9a1a6178c11c
Revises: 2f18856a9b2f, 9bb3f37a044b
Create Date: 2026-06-24 10:05:50.774276

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9a1a6178c11c'
down_revision: Union[str, None] = ('2f18856a9b2f', '9bb3f37a044b')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
