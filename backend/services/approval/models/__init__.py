"""
MindFlow Approval Service - Data Models
Per DATABASE_SCHEMA.md Section 3.8
"""

# Import shared model stubs first for cross-service foreign key resolution
# These must be imported before Approval models that reference tenants/users tables
from shared.models import TenantStub, UserStub  # noqa: F401

from .workflow import ApprovalWorkflow
from .step import ApprovalStep
from .instance import ApprovalInstance
from .decision import ApprovalDecision
from .delegation import DelegationRule

__all__ = [
    "ApprovalWorkflow",
    "ApprovalStep",
    "ApprovalInstance",
    "ApprovalDecision",
    "DelegationRule",
]
