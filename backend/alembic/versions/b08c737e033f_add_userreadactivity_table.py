"""Add UserReadActivity table

Revision ID: b08c737e033f
Revises: 2925bd5f117f
Create Date: 2026-07-06 10:25:53.714111

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision: str = 'b08c737e033f'
down_revision: Union[str, None] = '2925bd5f117f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table('user_read_activities'):
        op.create_table(
            'user_read_activities',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('activity_id', sa.String(length=150), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['user_id'], ['users.id']),
            sa.PrimaryKeyConstraint('id')
        )

        op.create_index(
            op.f('ix_user_read_activities_activity_id'),
            'user_read_activities',
            ['activity_id'],
            unique=False
        )

        op.create_index(
            op.f('ix_user_read_activities_id'),
            'user_read_activities',
            ['id'],
            unique=False
        )

        op.create_index(
            op.f('ix_user_read_activities_user_id'),
            'user_read_activities',
            ['user_id'],
            unique=False
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table('user_read_activities'):
        op.drop_index(
            op.f('ix_user_read_activities_user_id'),
            table_name='user_read_activities'
        )

        op.drop_index(
            op.f('ix_user_read_activities_id'),
            table_name='user_read_activities'
        )

        op.drop_index(
            op.f('ix_user_read_activities_activity_id'),
            table_name='user_read_activities'
        )

        op.drop_table('user_read_activities')