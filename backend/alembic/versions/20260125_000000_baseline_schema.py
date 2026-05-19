"""Baseline schema - stamps existing database state

Revision ID: 20260125_000000
Revises: None
Create Date: 2026-01-25

This is the BASELINE migration that documents the existing database schema.
All 58 tables were created via direct SQL scripts on 2026-01-25.

DO NOT MODIFY THIS FILE.
All future schema changes must be new migrations.

Tables included in baseline:
==============================================================================
AUTH SERVICE (7 tables):
- tenants
- users
- roles
- permissions
- role_permissions
- user_tenant_roles
- sessions

HR SERVICE (9 tables):
- departments
- positions
- employees
- leave_types
- leave_balances
- leave_requests
- attendance_records
- payroll_references
- candidates

TASK SERVICE (6 tables):
- tasks
- task_statuses
- task_assignees
- task_comments
- task_attachments
- task_dependencies

EXPENSE SERVICE (5 tables):
- expense_categories
- expense_requests
- expense_items
- expense_receipts
- payment_records

APPROVAL SERVICE (5 tables):
- approval_workflows
- approval_steps
- approval_instances
- approval_decisions
- delegation_rules

COMPLAINT SERVICE (6 tables):
- complaint_categories
- sla_configurations
- escalation_rules
- complaints
- complaint_actions
- complaint_attachments

TRAINING SERVICE (10 tables):
- courses
- training_content
- training_sessions
- enrollments
- training_attendance
- exams
- exam_questions
- exam_attempts
- exam_responses
- certificates

MINDMAP SERVICE (4 tables):
- mind_map_templates
- mind_maps
- mind_map_nodes
- node_attachments

NOTIFICATION SERVICE (2 tables):
- notifications
- notification_preferences

REPORT SERVICE (3 tables):
- reports
- report_parameters
- report_executions

STORAGE SERVICE (1 table):
- file_metadata

TOTAL: 58 tables
==============================================================================
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '20260125_000000'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    This is a BASELINE migration - tables already exist.
    No operations needed. This migration just stamps the baseline.
    """
    pass


def downgrade() -> None:
    """
    DANGER: Downgrading from baseline would DROP ALL TABLES.
    This is intentionally left as pass to prevent data loss.

    If you need to drop all tables, do it manually with full awareness.
    """
    pass
