"""
MindFlow Backend - Notification Service Client
Client for sending notifications from other services.
"""

from typing import Any, Dict, List, Optional
from uuid import UUID

from .http_client import ServiceClient


# Notification types
NOTIFICATION_TYPE_TASK_ASSIGNED = "TASK_ASSIGNED"
NOTIFICATION_TYPE_TASK_COMPLETED = "TASK_COMPLETED"
NOTIFICATION_TYPE_TASK_DUE_SOON = "TASK_DUE_SOON"
NOTIFICATION_TYPE_TASK_OVERDUE = "TASK_OVERDUE"
NOTIFICATION_TYPE_APPROVAL_REQUIRED = "APPROVAL_REQUIRED"
NOTIFICATION_TYPE_APPROVAL_APPROVED = "APPROVAL_APPROVED"
NOTIFICATION_TYPE_APPROVAL_REJECTED = "APPROVAL_REJECTED"
NOTIFICATION_TYPE_EXPENSE_SUBMITTED = "EXPENSE_SUBMITTED"
NOTIFICATION_TYPE_EXPENSE_APPROVED = "EXPENSE_APPROVED"
NOTIFICATION_TYPE_EXPENSE_REJECTED = "EXPENSE_REJECTED"
NOTIFICATION_TYPE_LEAVE_SUBMITTED = "LEAVE_SUBMITTED"
NOTIFICATION_TYPE_LEAVE_APPROVED = "LEAVE_APPROVED"
NOTIFICATION_TYPE_LEAVE_REJECTED = "LEAVE_REJECTED"
NOTIFICATION_TYPE_TRAINING_ASSIGNED = "TRAINING_ASSIGNED"
NOTIFICATION_TYPE_TRAINING_COMPLETED = "TRAINING_COMPLETED"
NOTIFICATION_TYPE_COMPLAINT_SUBMITTED = "COMPLAINT_SUBMITTED"
NOTIFICATION_TYPE_COMPLAINT_UPDATED = "COMPLAINT_UPDATED"

# Priority levels
PRIORITY_LOW = "LOW"
PRIORITY_NORMAL = "NORMAL"
PRIORITY_HIGH = "HIGH"
PRIORITY_URGENT = "URGENT"


class NotificationClient:
    """Client for notification-service API calls."""

    def __init__(self):
        self.client = ServiceClient("notification")

    async def close(self) -> None:
        """Close the HTTP client."""
        await self.client.close()

    async def send_notification(
        self,
        tenant_id: UUID,
        user_id: UUID,
        notification_type: str,
        title: str,
        message: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[UUID] = None,
        action_url: Optional[str] = None,
        priority: str = PRIORITY_NORMAL,
    ) -> Dict[str, Any]:
        """
        Send a notification to a user.

        Args:
            tenant_id: Tenant UUID
            user_id: User to notify
            notification_type: Type of notification
            title: Notification title
            message: Notification message
            entity_type: Related entity type
            entity_id: Related entity ID
            action_url: URL for notification action
            priority: Notification priority

        Returns:
            Created notification data
        """
        payload = {
            "user_id": str(user_id),
            "type": notification_type,
            "title": title,
            "message": message,
            "priority": priority,
        }

        if entity_type:
            payload["entity_type"] = entity_type
        if entity_id:
            payload["entity_id"] = str(entity_id)
        if action_url:
            payload["action_url"] = action_url

        response = await self.client.post(
            "/api/v1/notifications",
            json=payload,
            tenant_id=tenant_id,
        )

        if response.status_code >= 400:
            raise Exception(f"Failed to send notification: {response.text}")

        return response.json()

    async def broadcast_notification(
        self,
        tenant_id: UUID,
        user_ids: List[UUID],
        notification_type: str,
        title: str,
        message: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[UUID] = None,
        action_url: Optional[str] = None,
        priority: str = PRIORITY_NORMAL,
    ) -> List[Dict[str, Any]]:
        """
        Broadcast a notification to multiple users.

        Args:
            tenant_id: Tenant UUID
            user_ids: List of users to notify
            notification_type: Type of notification
            title: Notification title
            message: Notification message
            entity_type: Related entity type
            entity_id: Related entity ID
            action_url: URL for notification action
            priority: Notification priority

        Returns:
            List of created notification data
        """
        payload = {
            "user_ids": [str(uid) for uid in user_ids],
            "type": notification_type,
            "title": title,
            "message": message,
            "priority": priority,
        }

        if entity_type:
            payload["entity_type"] = entity_type
        if entity_id:
            payload["entity_id"] = str(entity_id)
        if action_url:
            payload["action_url"] = action_url

        response = await self.client.post(
            "/api/v1/notifications/broadcast",
            json=payload,
            tenant_id=tenant_id,
        )

        if response.status_code >= 400:
            raise Exception(f"Failed to broadcast notification: {response.text}")

        return response.json()

    # Convenience methods for common notification types

    async def notify_task_assigned(
        self,
        tenant_id: UUID,
        assignee_id: UUID,
        task_id: UUID,
        task_title: str,
        assigner_name: str,
    ) -> Dict[str, Any]:
        """Send task assigned notification."""
        return await self.send_notification(
            tenant_id=tenant_id,
            user_id=assignee_id,
            notification_type=NOTIFICATION_TYPE_TASK_ASSIGNED,
            title="New Task Assigned",
            message=f"{assigner_name} assigned you a new task: {task_title}",
            entity_type="Task",
            entity_id=task_id,
            action_url=f"/dashboard/tasks/{task_id}",
            priority=PRIORITY_NORMAL,
        )

    async def notify_task_completed(
        self,
        tenant_id: UUID,
        creator_id: UUID,
        task_id: UUID,
        task_title: str,
        completer_name: str,
    ) -> Dict[str, Any]:
        """Send task completed notification."""
        return await self.send_notification(
            tenant_id=tenant_id,
            user_id=creator_id,
            notification_type=NOTIFICATION_TYPE_TASK_COMPLETED,
            title="Task Completed",
            message=f"{completer_name} completed task: {task_title}",
            entity_type="Task",
            entity_id=task_id,
            action_url=f"/dashboard/tasks/{task_id}",
            priority=PRIORITY_LOW,
        )

    async def notify_approval_required(
        self,
        tenant_id: UUID,
        approver_id: UUID,
        instance_id: UUID,
        entity_type: str,
        entity_title: str,
        requester_name: str,
    ) -> Dict[str, Any]:
        """Send approval required notification."""
        return await self.send_notification(
            tenant_id=tenant_id,
            user_id=approver_id,
            notification_type=NOTIFICATION_TYPE_APPROVAL_REQUIRED,
            title="Approval Required",
            message=f"{requester_name} submitted {entity_type}: {entity_title} for your approval",
            entity_type="ApprovalInstance",
            entity_id=instance_id,
            action_url=f"/dashboard/approvals/{instance_id}",
            priority=PRIORITY_HIGH,
        )

    async def notify_approval_approved(
        self,
        tenant_id: UUID,
        requester_id: UUID,
        instance_id: UUID,
        entity_type: str,
        entity_title: str,
        approver_name: str,
    ) -> Dict[str, Any]:
        """Send approval approved notification."""
        return await self.send_notification(
            tenant_id=tenant_id,
            user_id=requester_id,
            notification_type=NOTIFICATION_TYPE_APPROVAL_APPROVED,
            title="Request Approved",
            message=f"Your {entity_type} '{entity_title}' was approved by {approver_name}",
            entity_type="ApprovalInstance",
            entity_id=instance_id,
            action_url=f"/dashboard/approvals/{instance_id}",
            priority=PRIORITY_NORMAL,
        )

    async def notify_approval_rejected(
        self,
        tenant_id: UUID,
        requester_id: UUID,
        instance_id: UUID,
        entity_type: str,
        entity_title: str,
        approver_name: str,
        reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Send approval rejected notification."""
        message = f"Your {entity_type} '{entity_title}' was rejected by {approver_name}"
        if reason:
            message += f". Reason: {reason}"

        return await self.send_notification(
            tenant_id=tenant_id,
            user_id=requester_id,
            notification_type=NOTIFICATION_TYPE_APPROVAL_REJECTED,
            title="Request Rejected",
            message=message,
            entity_type="ApprovalInstance",
            entity_id=instance_id,
            action_url=f"/dashboard/approvals/{instance_id}",
            priority=PRIORITY_NORMAL,
        )

    async def notify_expense_submitted(
        self,
        tenant_id: UUID,
        manager_id: UUID,
        expense_id: UUID,
        expense_title: str,
        amount: str,
        submitter_name: str,
    ) -> Dict[str, Any]:
        """Send expense submitted notification."""
        return await self.send_notification(
            tenant_id=tenant_id,
            user_id=manager_id,
            notification_type=NOTIFICATION_TYPE_EXPENSE_SUBMITTED,
            title="Expense Submitted for Approval",
            message=f"{submitter_name} submitted expense: {expense_title} ({amount})",
            entity_type="ExpenseRequest",
            entity_id=expense_id,
            action_url=f"/dashboard/expenses/{expense_id}",
            priority=PRIORITY_NORMAL,
        )

    async def notify_leave_submitted(
        self,
        tenant_id: UUID,
        manager_id: UUID,
        leave_id: UUID,
        leave_type: str,
        start_date: str,
        end_date: str,
        submitter_name: str,
    ) -> Dict[str, Any]:
        """Send leave request submitted notification."""
        return await self.send_notification(
            tenant_id=tenant_id,
            user_id=manager_id,
            notification_type=NOTIFICATION_TYPE_LEAVE_SUBMITTED,
            title="Leave Request Submitted",
            message=f"{submitter_name} requested {leave_type} leave from {start_date} to {end_date}",
            entity_type="LeaveRequest",
            entity_id=leave_id,
            action_url=f"/dashboard/hr/leave/{leave_id}",
            priority=PRIORITY_NORMAL,
        )


def get_notification_client() -> NotificationClient:
    """Get a notification client instance."""
    return NotificationClient()
