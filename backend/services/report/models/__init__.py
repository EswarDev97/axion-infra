"""
MindFlow Report Service - Models
"""

# Import shared model stubs first for cross-service foreign key resolution
# These must be imported before Report models that reference tenants/users tables
from shared.models import TenantStub, UserStub  # noqa: F401

from .report import Report, ReportParameter, ReportExecution

__all__ = [
    "Report",
    "ReportParameter",
    "ReportExecution",
]
