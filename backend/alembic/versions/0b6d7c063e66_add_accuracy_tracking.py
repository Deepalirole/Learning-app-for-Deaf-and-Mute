"""add accuracy tracking

Revision ID: 0b6d7c063e66
Revises: c750b6173c3a
Create Date: 2026-03-12 23:53:41.252487

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0b6d7c063e66'
down_revision: Union[str, None] = 'c750b6173c3a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("user_stats", schema=None) as batch_op:
        batch_op.add_column(sa.Column("accuracy_sum", sa.Float(), nullable=False, server_default="0.0"))
        batch_op.add_column(sa.Column("accuracy_count", sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    with op.batch_alter_table("user_stats", schema=None) as batch_op:
        batch_op.drop_column("accuracy_count")
        batch_op.drop_column("accuracy_sum")
