"""
MindFlow Backend - Approval Service Client
Client for submitting entities for approval from other services.
"""

from typing import Any, Dict, Optional
from uuid import UUID

from .http_client import ServiceClient


class ApprovalClient:
    """Client for approval-service API calls."""

    def __init__(self):
        self.client = ServiceClient("approval")

    async def close(self) -> None:
        """Close the HTTP client."""
        await self.client.close()

    async def submit_for_approval(
        self,
        tenant_id: UUID,
        auth_token: str,
        workflow_id: UUID,
        entity_type: str,
        entity_id: UUID,
    ) -> Dict[str, Any]:
        """
        Submit an entity for approval.

        Args:
            tenant_id: Tenant UUID
            auth_token: JWT auth token
            workflow_id: Approval workflow to use
            entity_type: Type of entity (e.g., "ExpenseRequest", "LeaveRequest")
            entity_id: ID of the entity to approve

        Returns:
            Created approval instance data
        """
        payload = {
            "workflow_id": str(workflow_id),
            "entity_type": entity_type,
            "entity_id": str(entity_id),
        }

        response = await self.client.post(
            "/api/v1/approval/instances",
            json=payload,
            tenant_id=tenant_id,
            auth_token=auth_token,
        )

        if response.status_code >= 400:
            raise Exception(f"Failed to submit for approval: {response.text}")

        return response.json()

    async def get_approval_instance(
        self,
        tenant_id: UUID,
        auth_token: str,
        instance_id: UUID,
    ) -> Optional[Dict[str, Any]]:
        """Get an approval instance by ID."""
        response = await self.client.get(
            f"/api/v1/approval/instances/{instance_id}",
            tenant_id=tenant_id,
            auth_token=auth_token,
        )

        if response.status_code == 404:
            return None
        if response.status_code >= 400:
            raise Exception(f"Failed to get approval instance: {response.text}")

        return response.json()

    async def get_pending_instance_for_entity(
        self,
        tenant_id: UUID,
        auth_token: str,
        entity_type: str,
        entity_id: UUID,
    ) -> Optional[Dict[str, Any]]:
        """Get pending approval instance for an entity."""
        response = await self.client.get(
            "/api/v1/approval/instances",
            params={
                "entity_type": entity_type,
                "entity_id": str(entity_id),
                "status": "PENDING",
            },
            tenant_id=tenant_id,
            auth_token=auth_token,
        )

        if response.status_code >= 400:
            raise Exception(f"Failed to get approval instance: {response.text}")

        data = response.json()
        items = data.get("items", [])
        return items[0] if items else None

    async def cancel_approval(
        self,
        tenant_id: UUID,
        auth_token: str,
        instance_id: UUID,
    ) -> Dict[str, Any]:
        """Cancel an approval instance."""
        response = await self.client.post(
            f"/api/v1/approval/instances/{instance_id}/cancel",
            tenant_id=tenant_id,
            auth_token=auth_token,
        )

        if response.status_code >= 400:
            raise Exception(f"Failed to cancel approval: {response.text}")

        return response.json()

    async def get_workflow_by_entity_type(
        self,
        tenant_id: UUID,
        auth_token: str,
        entity_type: str,
    ) -> Optional[Dict[str, Any]]:
        """Get the default workflow for an entity type."""
        response = await self.client.get(
            "/api/v1/approval/workflows",
            params={
                "entity_type": entity_type,
                "is_active": "true",
            },
            tenant_id=tenant_id,
            auth_token=auth_token,
        )

        if response.status_code >= 400:
            raise Exception(f"Failed to get workflows: {response.text}")

        data = response.json()
        items = data.get("items", [])
        return items[0] if items else None


def get_approval_client() -> ApprovalClient:
    """Get an approval client instance."""
    return ApprovalClient()
