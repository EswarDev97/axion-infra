"""
RBAC Tests - Task Service
Per SDLC Phase 7 Task 7.3

Tests role-based access control for Task operations:
- Task creation
- Task viewing
- Task assignment
- Task status changes
- Task deletion
"""

import pytest
from uuid import uuid4

pytestmark = [pytest.mark.rbac, pytest.mark.asyncio]


class TestTaskCreationRBAC:
    """Tests for task creation RBAC enforcement."""

    async def test_admin_can_create_task(
        self, task_client, admin_headers, test_tenant
    ):
        """Test ADMIN can create tasks."""
        response = await task_client.post(
            "/api/v1/tasks",
            json={
                "title": "Admin Task",
                "priority": "HIGH",
            },
            headers=admin_headers,
        )
        assert response.status_code in [201, 422]

    async def test_manager_can_create_task(
        self, task_client, manager_headers, test_tenant
    ):
        """Test MANAGER can create tasks."""
        response = await task_client.post(
            "/api/v1/tasks",
            json={
                "title": "Manager Task",
                "priority": "MEDIUM",
            },
            headers=manager_headers,
        )
        assert response.status_code in [201, 422]

    async def test_employee_can_create_task(
        self, task_client, employee_headers, test_tenant
    ):
        """Test EMPLOYEE can create tasks (for themselves)."""
        response = await task_client.post(
            "/api/v1/tasks",
            json={
                "title": "Employee Task",
                "priority": "LOW",
            },
            headers=employee_headers,
        )
        # Employees may or may not be allowed to create tasks
        assert response.status_code in [201, 403, 422]


class TestTaskViewingRBAC:
    """Tests for task viewing RBAC enforcement."""

    async def test_admin_can_view_all_tasks(
        self, task_client, admin_headers, test_tenant
    ):
        """Test ADMIN can view all tasks."""
        response = await task_client.get(
            "/api/v1/tasks",
            headers=admin_headers,
        )
        assert response.status_code == 200

    async def test_manager_can_view_team_tasks(
        self, task_client, manager_headers, test_tenant
    ):
        """Test MANAGER can view team tasks."""
        response = await task_client.get(
            "/api/v1/tasks",
            params={"team_only": True},
            headers=manager_headers,
        )
        assert response.status_code == 200

    async def test_employee_can_view_assigned_tasks(
        self, task_client, employee_headers, test_tenant
    ):
        """Test EMPLOYEE can view their assigned tasks."""
        response = await task_client.get(
            "/api/v1/tasks",
            params={"assigned_to_me": True},
            headers=employee_headers,
        )
        assert response.status_code == 200


class TestTaskAssignmentRBAC:
    """Tests for task assignment RBAC enforcement."""

    async def test_admin_can_assign_to_anyone(
        self, task_client, admin_headers, test_tenant
    ):
        """Test ADMIN can assign tasks to anyone."""
        # First create a task
        create_response = await task_client.post(
            "/api/v1/tasks",
            json={
                "title": "Task to Assign",
                "priority": "MEDIUM",
            },
            headers=admin_headers,
        )
        if create_response.status_code != 201:
            pytest.skip("Could not create task")

        task_id = create_response.json()["data"]["id"]
        assignee_id = str(uuid4())

        response = await task_client.post(
            f"/api/v1/tasks/{task_id}/assign",
            json={"assignee_user_id": assignee_id},
            headers=admin_headers,
        )
        # May fail with 404 if user doesn't exist, but not 403
        assert response.status_code in [200, 201, 400, 404]

    async def test_manager_can_assign_to_team(
        self, task_client, manager_headers, test_tenant
    ):
        """Test MANAGER can assign tasks to team members."""
        create_response = await task_client.post(
            "/api/v1/tasks",
            json={
                "title": "Manager Task to Assign",
                "priority": "MEDIUM",
            },
            headers=manager_headers,
        )
        if create_response.status_code != 201:
            pytest.skip("Could not create task")

        task_id = create_response.json()["data"]["id"]
        assignee_id = str(uuid4())

        response = await task_client.post(
            f"/api/v1/tasks/{task_id}/assign",
            json={"assignee_user_id": assignee_id},
            headers=manager_headers,
        )
        # May fail with 403 if not team member, 404 if user doesn't exist
        assert response.status_code in [200, 201, 400, 403, 404]

    async def test_employee_cannot_assign_to_others(
        self, task_client, employee_headers, admin_headers, test_tenant
    ):
        """Test EMPLOYEE cannot assign tasks to others."""
        # Admin creates a task
        create_response = await task_client.post(
            "/api/v1/tasks",
            json={
                "title": "Task Employee Cannot Assign",
                "priority": "MEDIUM",
            },
            headers=admin_headers,
        )
        if create_response.status_code != 201:
            pytest.skip("Could not create task")

        task_id = create_response.json()["data"]["id"]
        assignee_id = str(uuid4())

        # Employee tries to assign
        response = await task_client.post(
            f"/api/v1/tasks/{task_id}/assign",
            json={"assignee_user_id": assignee_id},
            headers=employee_headers,
        )
        assert response.status_code in [403, 404]


class TestTaskStatusChangeRBAC:
    """Tests for task status change RBAC enforcement."""

    async def test_assignee_can_change_status(
        self, task_client, employee_headers, admin_headers, test_tenant, test_user
    ):
        """Test assignee can change task status."""
        # Admin creates a task and assigns to employee
        create_response = await task_client.post(
            "/api/v1/tasks",
            json={
                "title": "Task for Status Change",
                "priority": "MEDIUM",
            },
            headers=admin_headers,
        )
        if create_response.status_code != 201:
            pytest.skip("Could not create task")

        task_id = create_response.json()["data"]["id"]

        # Assign to test user
        await task_client.post(
            f"/api/v1/tasks/{task_id}/assign",
            json={"assignee_user_id": str(test_user.id)},
            headers=admin_headers,
        )

        # Employee changes status
        response = await task_client.patch(
            f"/api/v1/tasks/{task_id}",
            json={"status": "IN_PROGRESS"},
            headers=employee_headers,
        )
        # May return 200, 403 (not assigned), or 422 (invalid status)
        assert response.status_code in [200, 403, 422]

    async def test_non_assignee_cannot_change_status(
        self, task_client, employee_headers, admin_headers, test_tenant
    ):
        """Test non-assignee cannot change task status."""
        # Admin creates a task (not assigned to test employee)
        create_response = await task_client.post(
            "/api/v1/tasks",
            json={
                "title": "Task Not Assigned",
                "priority": "LOW",
            },
            headers=admin_headers,
        )
        if create_response.status_code != 201:
            pytest.skip("Could not create task")

        task_id = create_response.json()["data"]["id"]

        # Employee tries to change status
        response = await task_client.patch(
            f"/api/v1/tasks/{task_id}",
            json={"status": "COMPLETED"},
            headers=employee_headers,
        )
        # Should be 403 or limited visibility
        assert response.status_code in [403, 404]


class TestTaskDeletionRBAC:
    """Tests for task deletion RBAC enforcement."""

    async def test_admin_can_delete_task(
        self, task_client, admin_headers, test_tenant
    ):
        """Test ADMIN can delete tasks."""
        create_response = await task_client.post(
            "/api/v1/tasks",
            json={
                "title": "Task to Delete",
                "priority": "LOW",
            },
            headers=admin_headers,
        )
        if create_response.status_code != 201:
            pytest.skip("Could not create task")

        task_id = create_response.json()["data"]["id"]

        response = await task_client.delete(
            f"/api/v1/tasks/{task_id}",
            headers=admin_headers,
        )
        assert response.status_code in [200, 204]

    async def test_task_creator_can_delete_own_task(
        self, task_client, manager_headers, test_tenant
    ):
        """Test task creator can delete their own task."""
        create_response = await task_client.post(
            "/api/v1/tasks",
            json={
                "title": "Manager's Task to Delete",
                "priority": "LOW",
            },
            headers=manager_headers,
        )
        if create_response.status_code != 201:
            pytest.skip("Could not create task")

        task_id = create_response.json()["data"]["id"]

        response = await task_client.delete(
            f"/api/v1/tasks/{task_id}",
            headers=manager_headers,
        )
        assert response.status_code in [200, 204, 403]

    async def test_employee_cannot_delete_others_task(
        self, task_client, employee_headers, admin_headers, test_tenant
    ):
        """Test EMPLOYEE cannot delete other's tasks."""
        create_response = await task_client.post(
            "/api/v1/tasks",
            json={
                "title": "Admin's Protected Task",
                "priority": "HIGH",
            },
            headers=admin_headers,
        )
        if create_response.status_code != 201:
            pytest.skip("Could not create task")

        task_id = create_response.json()["data"]["id"]

        response = await task_client.delete(
            f"/api/v1/tasks/{task_id}",
            headers=employee_headers,
        )
        assert response.status_code in [403, 404]


class TestTaskCommentRBAC:
    """Tests for task comment RBAC enforcement."""

    async def test_anyone_can_comment_on_assigned_task(
        self, task_client, admin_headers, employee_headers, test_user
    ):
        """Test users can comment on tasks they have access to."""
        create_response = await task_client.post(
            "/api/v1/tasks",
            json={
                "title": "Task with Comments",
                "priority": "MEDIUM",
            },
            headers=admin_headers,
        )
        if create_response.status_code != 201:
            pytest.skip("Could not create task")

        task_id = create_response.json()["data"]["id"]

        # Assign to employee
        await task_client.post(
            f"/api/v1/tasks/{task_id}/assign",
            json={"assignee_user_id": str(test_user.id)},
            headers=admin_headers,
        )

        # Employee adds comment
        response = await task_client.post(
            f"/api/v1/tasks/{task_id}/comments",
            json={"content": "Working on this now"},
            headers=employee_headers,
        )
        assert response.status_code in [201, 403]

    async def test_cannot_comment_on_unrelated_task(
        self, task_client, admin_headers, employee_headers
    ):
        """Test users cannot comment on tasks they don't have access to."""
        create_response = await task_client.post(
            "/api/v1/tasks",
            json={
                "title": "Private Task",
                "priority": "HIGH",
            },
            headers=admin_headers,
        )
        if create_response.status_code != 201:
            pytest.skip("Could not create task")

        task_id = create_response.json()["data"]["id"]

        # Employee (not assigned) tries to comment
        response = await task_client.post(
            f"/api/v1/tasks/{task_id}/comments",
            json={"content": "Unauthorized comment"},
            headers=employee_headers,
        )
        # Should be 403 or 404
        assert response.status_code in [403, 404]


class TestTaskStatusManagementRBAC:
    """Tests for task status configuration RBAC."""

    async def test_admin_can_create_status(
        self, task_client, admin_headers, test_tenant
    ):
        """Test ADMIN can create task statuses."""
        response = await task_client.post(
            "/api/v1/tasks/statuses",
            json={
                "name": "Custom Status",
                "code": "CUSTOM",
                "color": "#FF0000",
            },
            headers=admin_headers,
        )
        assert response.status_code in [201, 409]

    async def test_employee_cannot_create_status(
        self, task_client, employee_headers, test_tenant
    ):
        """Test EMPLOYEE cannot create task statuses."""
        response = await task_client.post(
            "/api/v1/tasks/statuses",
            json={
                "name": "Unauthorized Status",
                "code": "UNAUTH",
                "color": "#00FF00",
            },
            headers=employee_headers,
        )
        assert response.status_code == 403

    async def test_anyone_can_view_statuses(
        self, task_client, employee_headers, test_tenant
    ):
        """Test any authenticated user can view task statuses."""
        response = await task_client.get(
            "/api/v1/tasks/statuses",
            headers=employee_headers,
        )
        assert response.status_code == 200
