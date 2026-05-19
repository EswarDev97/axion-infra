"""Add department_id, started_at, completed_at to tasks

Revision ID: 001_dept_time
Revises: None
Create Date: 2026-03-28
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '001_dept_time'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('tasks', sa.Column('department_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('tasks', sa.Column('started_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('tasks', sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index('ix_tasks_department_id', 'tasks', ['department_id'])


def downgrade() -> None:
    op.drop_index('ix_tasks_department_id', table_name='tasks')
    op.drop_column('tasks', 'completed_at')
    op.drop_column('tasks', 'started_at')
    op.drop_column('tasks', 'department_id')
