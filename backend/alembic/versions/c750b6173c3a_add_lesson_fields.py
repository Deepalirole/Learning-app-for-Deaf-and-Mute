"""add lesson fields

Revision ID: c750b6173c3a
Revises: 574d331dcb50
Create Date: 2026-03-12 23:48:40.707110

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c750b6173c3a'
down_revision: Union[str, None] = '574d331dcb50'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("lessons", schema=None) as batch_op:
        batch_op.add_column(sa.Column("xp_reward", sa.Integer(), nullable=False, server_default="10"))
        batch_op.add_column(sa.Column("landmark_hint", sa.String(), nullable=False, server_default=""))

        batch_op.alter_column(
            "sign_image_url",
            existing_type=sa.String(),
            nullable=False,
            server_default="",
        )
        batch_op.alter_column(
            "sign_gif_url",
            existing_type=sa.String(),
            nullable=False,
            server_default="",
        )
        batch_op.alter_column(
            "description",
            existing_type=sa.String(),
            nullable=False,
            server_default="",
        )


def downgrade() -> None:
    with op.batch_alter_table("lessons", schema=None) as batch_op:
        batch_op.alter_column(
            "description",
            existing_type=sa.String(),
            nullable=True,
            server_default=None,
        )
        batch_op.alter_column(
            "sign_gif_url",
            existing_type=sa.String(),
            nullable=True,
            server_default=None,
        )
        batch_op.alter_column(
            "sign_image_url",
            existing_type=sa.String(),
            nullable=True,
            server_default=None,
        )

        batch_op.drop_column("landmark_hint")
        batch_op.drop_column("xp_reward")
