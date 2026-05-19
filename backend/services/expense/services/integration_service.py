"""
MindFlow Expense Service - Integration Service
Cross-module integration for Expense → Approval → Notification flow.
"""

import logging
from typing import Optional
from uuid import UUID

from shared.integrations import (
    get_approval_client,
    get_notification_client,
    NOTIFICATION_TYPE_EXPENSE_SUBMITTED,
    NOTIFICATION_TYPE_EXPENSE_APPROVED,
    NOTIFICATION_TYPE_EXPENSE_REJECTED,
    PRIORITY_NORMAL,
    PRIORITY_HIGH,
)

logger = logging.getLogger(__name__)


class ExpenseIntegrationService:
    """
    Handles cross-module integration for expense workflows.

    Workflow:
    1. Expense submitted → Create approval instance → Notify approver
    2. Expense approved → Notify requester
    3. Expense rejected → Notify requester
    """

    @staticmethod
    async def on_expense_submitted(
        tenant_id: UUID,
        auth_token: str,
        expense_id: UUID,
        expense_title: str,
        total_amount: str,
        submitter_id: UUID,
        submitter_name: str,
        manager_id: Optional[UUID] = None,
    ) -> Optional[dict]:
        """
        Handle expense submission.

        1. Submit to approval service
        2. Notify approver

        Returns approval instance data if successful.
        """
        approval_client = get_approval_client()
        notification_client = get_notification_client()

        try:
            # Get the expense approval workflow
            workflow = await approval_client.get_workflow_by_entity_type(
                tenant_id=tenant_id,
                auth_token=auth_token,
                entity_type="ExpenseRequest",
            )

            if workflow:
                # Submit for approval
                approval_instance = await approval_client.submit_for_approval(
                    tenant_id=tenant_id,
                    auth_token=auth_token,
                    workflow_id=UUID(workflow["id"]),
                    entity_type="ExpenseRequest",
                    entity_id=expense_id,
                )

                # Notify approver if we have one
                if manager_id:
                    await notification_client.notify_expense_submitted(
                        tenant_id=tenant_id,
                        manager_id=manager_id,
                        expense_id=expense_id,
                        expense_title=expense_title,
                        amount=total_amount,
                        submitter_name=submitter_name,
                    )

                return approval_instance
            else:
                logger.warning(
                    f"No approval workflow found for ExpenseRequest in tenant {tenant_id}"
                )
                return None

        except Exception as e:
            logger.error(f"Failed to process expense submission: {e}")
            raise
        finally:
            await approval_client.close()
            await notification_client.close()

    @staticmethod
    async def on_expense_approved(
        tenant_id: UUID,
        expense_id: UUID,
        expense_title: str,
        requester_id: UUID,
        approver_name: str,
    ) -> None:
        """
        Handle expense approval.

        Notify the requester that their expense was approved.
        """
        notification_client = get_notification_client()

        try:
            await notification_client.send_notification(
                tenant_id=tenant_id,
                user_id=requester_id,
                notification_type=NOTIFICATION_TYPE_EXPENSE_APPROVED,
                title="Expense Approved",
                message=f"Your expense '{expense_title}' has been approved by {approver_name}",
                entity_type="ExpenseRequest",
                entity_id=expense_id,
                action_url=f"/dashboard/expenses/{expense_id}",
                priority=PRIORITY_NORMAL,
            )
        except Exception as e:
            logger.error(f"Failed to send expense approval notification: {e}")
        finally:
            await notification_client.close()

    @staticmethod
    async def on_expense_rejected(
        tenant_id: UUID,
        expense_id: UUID,
        expense_title: str,
        requester_id: UUID,
        approver_name: str,
        reason: Optional[str] = None,
    ) -> None:
        """
        Handle expense rejection.

        Notify the requester that their expense was rejected.
        """
        notification_client = get_notification_client()

        try:
            message = f"Your expense '{expense_title}' has been rejected by {approver_name}"
            if reason:
                message += f". Reason: {reason}"

            await notification_client.send_notification(
                tenant_id=tenant_id,
                user_id=requester_id,
                notification_type=NOTIFICATION_TYPE_EXPENSE_REJECTED,
                title="Expense Rejected",
                message=message,
                entity_type="ExpenseRequest",
                entity_id=expense_id,
                action_url=f"/dashboard/expenses/{expense_id}",
                priority=PRIORITY_NORMAL,
            )
        except Exception as e:
            logger.error(f"Failed to send expense rejection notification: {e}")
        finally:
            await notification_client.close()
