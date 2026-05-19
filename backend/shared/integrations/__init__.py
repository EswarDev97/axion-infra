"""
MindFlow Backend - Cross-Module Integrations
Per PO-030 Task 6.4: Integration patterns for cross-service communication.
"""

from .http_client import ServiceClient, get_service_client
from .notification_client import (
    NotificationClient,
    get_notification_client,
    # Task notification types
    NOTIFICATION_TYPE_TASK_ASSIGNED,
    NOTIFICATION_TYPE_TASK_COMPLETED,
    NOTIFICATION_TYPE_TASK_DUE_SOON,
    NOTIFICATION_TYPE_TASK_OVERDUE,
    # Approval notification types
    NOTIFICATION_TYPE_APPROVAL_REQUIRED,
    NOTIFICATION_TYPE_APPROVAL_APPROVED,
    NOTIFICATION_TYPE_APPROVAL_REJECTED,
    # Expense notification types
    NOTIFICATION_TYPE_EXPENSE_SUBMITTED,
    NOTIFICATION_TYPE_EXPENSE_APPROVED,
    NOTIFICATION_TYPE_EXPENSE_REJECTED,
    # Leave notification types
    NOTIFICATION_TYPE_LEAVE_SUBMITTED,
    NOTIFICATION_TYPE_LEAVE_APPROVED,
    NOTIFICATION_TYPE_LEAVE_REJECTED,
    # Training notification types
    NOTIFICATION_TYPE_TRAINING_ASSIGNED,
    NOTIFICATION_TYPE_TRAINING_COMPLETED,
    # Complaint notification types
    NOTIFICATION_TYPE_COMPLAINT_SUBMITTED,
    NOTIFICATION_TYPE_COMPLAINT_UPDATED,
    # Priority levels
    PRIORITY_LOW,
    PRIORITY_NORMAL,
    PRIORITY_HIGH,
    PRIORITY_URGENT,
)
from .approval_client import ApprovalClient, get_approval_client
from .task_client import TaskClient, get_task_client

__all__ = [
    "ServiceClient",
    "get_service_client",
    "NotificationClient",
    "get_notification_client",
    # Task notification types
    "NOTIFICATION_TYPE_TASK_ASSIGNED",
    "NOTIFICATION_TYPE_TASK_COMPLETED",
    "NOTIFICATION_TYPE_TASK_DUE_SOON",
    "NOTIFICATION_TYPE_TASK_OVERDUE",
    # Approval notification types
    "NOTIFICATION_TYPE_APPROVAL_REQUIRED",
    "NOTIFICATION_TYPE_APPROVAL_APPROVED",
    "NOTIFICATION_TYPE_APPROVAL_REJECTED",
    # Expense notification types
    "NOTIFICATION_TYPE_EXPENSE_SUBMITTED",
    "NOTIFICATION_TYPE_EXPENSE_APPROVED",
    "NOTIFICATION_TYPE_EXPENSE_REJECTED",
    # Leave notification types
    "NOTIFICATION_TYPE_LEAVE_SUBMITTED",
    "NOTIFICATION_TYPE_LEAVE_APPROVED",
    "NOTIFICATION_TYPE_LEAVE_REJECTED",
    # Training notification types
    "NOTIFICATION_TYPE_TRAINING_ASSIGNED",
    "NOTIFICATION_TYPE_TRAINING_COMPLETED",
    # Complaint notification types
    "NOTIFICATION_TYPE_COMPLAINT_SUBMITTED",
    "NOTIFICATION_TYPE_COMPLAINT_UPDATED",
    # Priority levels
    "PRIORITY_LOW",
    "PRIORITY_NORMAL",
    "PRIORITY_HIGH",
    "PRIORITY_URGENT",
    "ApprovalClient",
    "get_approval_client",
    "TaskClient",
    "get_task_client",
]
