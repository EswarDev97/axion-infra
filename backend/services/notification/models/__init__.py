"""
MindFlow Notification Service - Data Models
Per DATABASE_SCHEMA.md Section 3.9
"""

# Import shared model stubs first for cross-service foreign key resolution
# These must be imported before Notification models that reference tenants/users tables
from shared.models import TenantStub, UserStub  # noqa: F401

from .notification import Notification
from .preference import NotificationPreference

__all__ = [
    "Notification",
    "NotificationPreference",
]
