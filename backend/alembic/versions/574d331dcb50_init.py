"""init

Revision ID: 574d331dcb50
Revises: 
Create Date: 2026-03-12 23:33:54.464390

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '574d331dcb50'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('last_active', sa.DateTime(), nullable=True),
        sa.Column('reset_token', sa.String(), nullable=True),
        sa.Column('reset_token_expires', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
    )
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_users_email'), ['email'], unique=False)

    op.create_table(
        'lessons',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('level', sa.String(), nullable=False),
        sa.Column('category', sa.String(), nullable=False),
        sa.Column('sign_image_url', sa.String(), nullable=True),
        sa.Column('sign_gif_url', sa.String(), nullable=True),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('order_index', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('lessons', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_lessons_category'), ['category'], unique=False)
        batch_op.create_index(batch_op.f('ix_lessons_level'), ['level'], unique=False)

    op.create_table(
        'user_progress',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('lesson_id', sa.Integer(), nullable=False),
        sa.Column('completed', sa.Boolean(), nullable=False),
        sa.Column('accuracy', sa.Float(), nullable=True),
        sa.Column('attempts', sa.Integer(), nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['lesson_id'], ['lessons.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'lesson_id', name='uq_user_lesson'),
    )
    with op.batch_alter_table('user_progress', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_user_progress_lesson_id'), ['lesson_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_user_progress_user_id'), ['user_id'], unique=False)

    op.create_table(
        'gesture_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('gesture', sa.String(), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('detected_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('gesture_history', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_gesture_history_user_id'), ['user_id'], unique=False)

    op.create_table(
        'user_stats',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('total_lessons', sa.Integer(), nullable=False),
        sa.Column('current_streak', sa.Integer(), nullable=False),
        sa.Column('longest_streak', sa.Integer(), nullable=False),
        sa.Column('total_xp', sa.Integer(), nullable=False),
        sa.Column('avg_accuracy', sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id'),
    )


def downgrade() -> None:
    op.drop_table('user_stats')

    with op.batch_alter_table('gesture_history', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_gesture_history_user_id'))
    op.drop_table('gesture_history')

    with op.batch_alter_table('user_progress', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_user_progress_user_id'))
        batch_op.drop_index(batch_op.f('ix_user_progress_lesson_id'))
    op.drop_table('user_progress')

    with op.batch_alter_table('lessons', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_lessons_level'))
        batch_op.drop_index(batch_op.f('ix_lessons_category'))
    op.drop_table('lessons')

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_users_email'))
    op.drop_table('users')
