"""
MindFlow Backend - Task Service Client
Client for creating tasks from other services (e.g., Mind Map → Task).
"""

from datetime import date
from typing import Any, Dict, Optional
from uuid import UUID

from .http_client import ServiceClient


class TaskClient:
    """Client for task-service API calls."""

    def __init__(self):
        self.client = ServiceClient("task")

    async def close(self) -> None:
        """Close the HTTP client."""
        await self.client.close()

    async def create_task(
        self,
        tenant_id: UUID,
        auth_token: str,
        title: str,
        created_by: UUID,
        description: Optional[str] = None,
        assignee_id: Optional[UUID] = None,
        due_date: Optional[date] = None,
        priority: str = "MEDIUM",
        origin_type: str = "MANUAL",
        origin_reference_id: Optional[UUID] = None,
    ) -> Dict[str, Any]:
        """
        Create a task in task-service.

        Args:
            tenant_id: Tenant UUID
            auth_token: JWT auth token
            title: Task title
            created_by: User ID creating the task
            description: Task description
            assignee_id: User ID to assign the task to
            due_date: Task due date
            priority: Task priority (LOW, MEDIUM, HIGH, CRITICAL)
            origin_type: Origin of task (MANUAL, MINDMAP, APPROVAL, etc.)
            origin_reference_id: Reference ID to origin entity

        Returns:
            Created task data
        """
        payload = {
            "title": title,
            "priority": priority,
            "origin_type": origin_type,
        }

        if description:
            payload["description"] = description
        if assignee_id:
            payload["assignee_id"] = str(assignee_id)
        if due_date:
            payload["due_date"] = due_date.isoformat()
        if origin_reference_id:
            payload["origin_reference_id"] = str(origin_reference_id)

        response = await self.client.post(
            "/api/v1/tasks",
            json=payload,
            tenant_id=tenant_id,
            auth_token=auth_token,
        )

        if response.status_code >= 400:
            raise Exception(f"Failed to create task: {response.text}")

        return response.json()

    async def get_task(
        self,
        tenant_id: UUID,
        auth_token: str,
        task_id: UUID,
    ) -> Optional[Dict[str, Any]]:
        """Get a task by ID."""
        response = await self.client.get(
            f"/api/v1/tasks/{task_id}",
            tenant_id=tenant_id,
            auth_token=auth_token,
        )

        if response.status_code == 404:
            return None
        if response.status_code >= 400:
            raise Exception(f"Failed to get task: {response.text}")

        return response.json()

    async def update_task(
        self,
        tenant_id: UUID,
        auth_token: str,
        task_id: UUID,
        updates: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Update a task."""
        response = await self.client.put(
            f"/api/v1/tasks/{task_id}",
            json=updates,
            tenant_id=tenant_id,
            auth_token=auth_token,
        )

        if response.status_code >= 400:
            raise Exception(f"Failed to update task: {response.text}")

        return response.json()


def get_task_client() -> TaskClient:
    """Get a task client instance."""
    return TaskClient()
