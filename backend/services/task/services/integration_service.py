"""
MindFlow Task Service - Integration Service
Cross-module integration for Task → Notification flow.
"""

import logging
from typing import List, Optional
from uuid import UUID

from shared.integrations import (
    get_notification_client,
    NOTIFICATION_TYPE_TASK_ASSIGNED,
    NOTIFICATION_TYPE_TASK_COMPLETED,
    NOTIFICATION_TYPE_TASK_DUE_SOON,
    NOTIFICATION_TYPE_TASK_OVERDUE,
    PRIORITY_NORMAL,
    PRIORITY_HIGH,
    PRIORITY_URGENT,
)

logger = logging.getLogger(__name__)


class TaskIntegrationService:
    """
    Handles cross-module integration for task workflows.

    Workflow:
    1. Task assigned → Notify assignee
    2. Task completed → Notify creator
    3. Task overdue → Notify assignees
    4. Task due soon → Notify assignees
    """

    @staticmethod
    async def on_task_assigned(
        tenant_id: UUID,
        task_id: UUID,
        task_title: str,
        assignee_id: UUID,
        assigner_name: str,
    ) -> None:
        """
        Handle task assignment.

        Notify the assignee about their new task.
        """
        notification_client = get_notification_client()

        try:
            await notification_client.notify_task_assigned(
                tenant_id=tenant_id,
                assignee_id=assignee_id,
                task_id=task_id,
                task_title=task_title,
                assigner_name=assigner_name,
            )
        except Exception as e:
            logger.error(f"Failed to send task assignment notification: {e}")
        finally:
            await notification_client.close()

    @staticmethod
    async def on_task_completed(
        tenant_id: UUID,
        task_id: UUID,
        task_title: str,
        creator_id: UUID,
        completer_name: str,
    ) -> None:
        """
        Handle task completion.

        Notify the task creator that the task was completed.
        """
        notification_client = get_notification_client()

        try:
            await notification_client.notify_task_completed(
                tenant_id=tenant_id,
                creator_id=creator_id,
                task_id=task_id,
                task_title=task_title,
                completer_name=completer_name,
            )
        except Exception as e:
            logger.error(f"Failed to send task completion notification: {e}")
        finally:
            await notification_client.close()

    @staticmethod
    async def on_task_overdue(
        tenant_id: UUID,
        task_id: UUID,
        task_title: str,
        assignee_ids: List[UUID],
    ) -> None:
        """
        Handle overdue task.

        Notify all assignees about the overdue task.
        """
        notification_client = get_notification_client()

        try:
            await notification_client.broadcast_notification(
                tenant_id=tenant_id,
                user_ids=assignee_ids,
                notification_type=NOTIFICATION_TYPE_TASK_OVERDUE,
                title="Task Overdue",
                message=f"Task '{task_title}' is now overdue. Please update the status.",
                entity_type="Task",
                entity_id=task_id,
                action_url=f"/dashboard/tasks/{task_id}",
                priority=PRIORITY_URGENT,
            )
        except Exception as e:
            logger.error(f"Failed to send task overdue notification: {e}")
        finally:
            await notification_client.close()

    @staticmethod
    async def on_task_due_soon(
        tenant_id: UUID,
        task_id: UUID,
        task_title: str,
        due_date: str,
        assignee_ids: List[UUID],
    ) -> None:
        """
        Handle task due soon reminder.

        Notify all assignees about the upcoming deadline.
        """
        notification_client = get_notification_client()

        try:
            await notification_client.broadcast_notification(
                tenant_id=tenant_id,
                user_ids=assignee_ids,
                notification_type=NOTIFICATION_TYPE_TASK_DUE_SOON,
                title="Task Due Soon",
                message=f"Task '{task_title}' is due on {due_date}. Please complete it soon.",
                entity_type="Task",
                entity_id=task_id,
                action_url=f"/dashboard/tasks/{task_id}",
                priority=PRIORITY_HIGH,
            )
        except Exception as e:
            logger.error(f"Failed to send task due soon notification: {e}")
        finally:
            await notification_client.close()
