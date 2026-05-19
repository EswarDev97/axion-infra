"""
MindFlow Complaint Service - Data Models
Per DATABASE_SCHEMA.md Section 3.7
"""

# Import shared model stubs first for cross-service foreign key resolution
# These must be imported before Complaint models that reference tenants/users tables
from shared.models import TenantStub, UserStub  # noqa: F401

from .category import ComplaintCategory
from .sla_config import SLAConfiguration
from .escalation_rule import EscalationRule
from .complaint import Complaint
from .complaint_action import ComplaintAction
from .complaint_attachment import ComplaintAttachment
from .client import Client

__all__ = [
    "ComplaintCategory",
    "SLAConfiguration",
    "EscalationRule",
    "Complaint",
    "ComplaintAction",
    "ComplaintAttachment",
    "Client",
]
