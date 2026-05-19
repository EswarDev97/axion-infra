"""
Task Service Unit Tests
Per SDLC Phase 7 Task 7.1

Tests for:
- TaskService
- TaskStatusService
"""

import pytest
from datetime import date, datetime, timedelta
from uuid import uuid4

pytestmark = [pytest.mark.unit, pytest.mark.asyncio]


class TestTaskService:
    """Tests for TaskService."""

    async def test_create_task(self, db_session, test_tenant, test_user):
        """Test task creation."""
        from services.task.services.task_service import TaskService
        from services.task.models.task_status import TaskStatus
        from services.task.schemas.task import TaskCreate

        # Create status
        status = TaskStatus(
            tenant_id=test_tenant.id,
            name="To Do",
            code="TODO",
            color="#0000FF",
            is_default=True,
            is_completed=False,
            display_order=1,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(status)
        await db_session.commit()

        service = TaskService(db_session)
        task_data = TaskCreate(
            title="Implement login feature",
            description="Implement user login with JWT",
            priority="HIGH",
            status_id=status.id,
            due_date=date.today() + timedelta(days=7),
        )

        task = await service.create(
            tenant_id=test_tenant.id,
            data=task_data,
            user_id=test_user.id,
        )

        assert task.id is not None
        assert task.title == "Implement login feature"
        assert task.priority == "HIGH"

    async def test_get_task_by_id(self, db_session, test_tenant, test_user):
        """Test getting task by ID."""
        from services.task.services.task_service import TaskService
        from services.task.models.task import Task
        from services.task.models.task_status import TaskStatus

        status = TaskStatus(
            tenant_id=test_tenant.id,
            name="In Progress",
            code="IN_PROGRESS",
            color="#FFFF00",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(status)
        await db_session.commit()

        task = Task(
            tenant_id=test_tenant.id,
            title="Test Task",
            priority="MEDIUM",
            status_id=status.id,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(task)
        await db_session.commit()

        service = TaskService(db_session)
        result = await service.get_by_id(
            tenant_id=test_tenant.id,
            id=task.id,
        )

        assert result is not None
        assert result.title == "Test Task"

    async def test_list_tasks(self, db_session, test_tenant, test_user):
        """Test listing tasks."""
        from services.task.services.task_service import TaskService
        from services.task.models.task import Task
        from services.task.models.task_status import TaskStatus

        status = TaskStatus(
            tenant_id=test_tenant.id,
            name="Done",
            code="DONE",
            color="#00FF00",
            is_completed=True,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(status)
        await db_session.commit()

        for i in range(5):
            task = Task(
                tenant_id=test_tenant.id,
                title=f"Task {i+1}",
                priority="MEDIUM",
                status_id=status.id,
                created_by=test_user.id,
                updated_by=test_user.id,
            )
            db_session.add(task)

        await db_session.commit()

        service = TaskService(db_session)
        tasks = await service.list(tenant_id=test_tenant.id)

        assert len(tasks) >= 5

    async def test_update_task(self, db_session, test_tenant, test_user):
        """Test task update."""
        from services.task.services.task_service import TaskService
        from services.task.models.task import Task
        from services.task.models.task_status import TaskStatus
        from services.task.schemas.task import TaskUpdate

        status = TaskStatus(
            tenant_id=test_tenant.id,
            name="Pending",
            code="PENDING",
            color="#808080",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(status)
        await db_session.commit()

        task = Task(
            tenant_id=test_tenant.id,
            title="Old Title",
            description="Old description",
            priority="LOW",
            status_id=status.id,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(task)
        await db_session.commit()

        service = TaskService(db_session)
        update_data = TaskUpdate(
            title="New Title",
            priority="HIGH",
        )

        updated = await service.update(
            tenant_id=test_tenant.id,
            id=task.id,
            data=update_data,
            user_id=test_user.id,
        )

        assert updated.title == "New Title"
        assert updated.priority == "HIGH"

    async def test_assign_task(self, db_session, test_tenant, test_user):
        """Test task assignment."""
        from services.task.services.task_service import TaskService
        from services.task.models.task import Task
        from services.task.models.task_status import TaskStatus

        status = TaskStatus(
            tenant_id=test_tenant.id,
            name="Open",
            code="OPEN",
            color="#0000FF",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(status)
        await db_session.commit()

        task = Task(
            tenant_id=test_tenant.id,
            title="Assignable Task",
            priority="MEDIUM",
            status_id=status.id,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(task)
        await db_session.commit()

        assignee_id = uuid4()
        service = TaskService(db_session)

        await service.assign(
            tenant_id=test_tenant.id,
            task_id=task.id,
            assignee_user_id=assignee_id,
            assigner_id=test_user.id,
        )

        # Verify assignment
        await db_session.refresh(task)
        assignees = [a for a in task.assignees if not a.is_deleted]
        assert len(assignees) >= 1

    async def test_create_subtask(self, db_session, test_tenant, test_user):
        """Test creating a subtask."""
        from services.task.services.task_service import TaskService
        from services.task.models.task import Task
        from services.task.models.task_status import TaskStatus
        from services.task.schemas.task import TaskCreate

        status = TaskStatus(
            tenant_id=test_tenant.id,
            name="Active",
            code="ACTIVE",
            color="#00FFFF",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(status)
        await db_session.commit()

        parent_task = Task(
            tenant_id=test_tenant.id,
            title="Parent Task",
            priority="HIGH",
            status_id=status.id,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(parent_task)
        await db_session.commit()

        service = TaskService(db_session)
        subtask_data = TaskCreate(
            title="Subtask 1",
            priority="MEDIUM",
            status_id=status.id,
            parent_task_id=parent_task.id,
        )

        subtask = await service.create(
            tenant_id=test_tenant.id,
            data=subtask_data,
            user_id=test_user.id,
        )

        assert subtask.parent_task_id == parent_task.id

    async def test_add_comment(self, db_session, test_tenant, test_user):
        """Test adding comment to task."""
        from services.task.services.task_service import TaskService
        from services.task.models.task import Task
        from services.task.models.task_status import TaskStatus
        from services.task.schemas.task_comment import TaskCommentCreate

        status = TaskStatus(
            tenant_id=test_tenant.id,
            name="Review",
            code="REVIEW",
            color="#FF00FF",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(status)
        await db_session.commit()

        task = Task(
            tenant_id=test_tenant.id,
            title="Task with Comments",
            priority="MEDIUM",
            status_id=status.id,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(task)
        await db_session.commit()

        service = TaskService(db_session)
        comment_data = TaskCommentCreate(
            content="This looks good, approved!",
        )

        comment = await service.add_comment(
            tenant_id=test_tenant.id,
            task_id=task.id,
            data=comment_data,
            user_id=test_user.id,
        )

        assert comment.id is not None
        assert comment.content == "This looks good, approved!"

    async def test_soft_delete_task(self, db_session, test_tenant, test_user):
        """Test task soft delete."""
        from services.task.services.task_service import TaskService
        from services.task.models.task import Task
        from services.task.models.task_status import TaskStatus

        status = TaskStatus(
            tenant_id=test_tenant.id,
            name="Closed",
            code="CLOSED",
            color="#FF0000",
            is_completed=True,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(status)
        await db_session.commit()

        task = Task(
            tenant_id=test_tenant.id,
            title="Task to Delete",
            priority="LOW",
            status_id=status.id,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(task)
        await db_session.commit()

        service = TaskService(db_session)
        await service.soft_delete(
            tenant_id=test_tenant.id,
            id=task.id,
            user_id=test_user.id,
            reason="Cancelled by user",
        )

        await db_session.refresh(task)
        assert task.is_deleted is True
        assert task.deletion_reason == "Cancelled by user"


class TestTaskStatusService:
    """Tests for TaskStatusService."""

    async def test_create_status(self, db_session, test_tenant, test_user):
        """Test task status creation."""
        from services.task.services.task_status_service import TaskStatusService
        from services.task.schemas.task_status import TaskStatusCreate

        service = TaskStatusService(db_session)
        status_data = TaskStatusCreate(
            name="New Status",
            code="NEW_STATUS",
            color="#123456",
            is_default=False,
            is_completed=False,
            display_order=10,
        )

        status = await service.create(
            tenant_id=test_tenant.id,
            data=status_data,
            user_id=test_user.id,
        )

        assert status.id is not None
        assert status.name == "New Status"
        assert status.color == "#123456"

    async def test_list_statuses(self, db_session, test_tenant, test_user):
        """Test listing task statuses."""
        from services.task.services.task_status_service import TaskStatusService
        from services.task.models.task_status import TaskStatus

        # Create statuses
        statuses_data = [
            ("To Do", "TODO", "#0000FF", 1, True, False),
            ("In Progress", "IN_PROGRESS", "#FFFF00", 2, False, False),
            ("Done", "DONE", "#00FF00", 3, False, True),
        ]

        for name, code, color, order, is_default, is_completed in statuses_data:
            status = TaskStatus(
                tenant_id=test_tenant.id,
                name=name,
                code=code,
                color=color,
                display_order=order,
                is_default=is_default,
                is_completed=is_completed,
                created_by=test_user.id,
                updated_by=test_user.id,
            )
            db_session.add(status)

        await db_session.commit()

        service = TaskStatusService(db_session)
        statuses = await service.list(tenant_id=test_tenant.id)

        assert len(statuses) >= 3

    async def test_update_status(self, db_session, test_tenant, test_user):
        """Test task status update."""
        from services.task.services.task_status_service import TaskStatusService
        from services.task.models.task_status import TaskStatus
        from services.task.schemas.task_status import TaskStatusUpdate

        status = TaskStatus(
            tenant_id=test_tenant.id,
            name="Old Status",
            code="OLD",
            color="#000000",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(status)
        await db_session.commit()

        service = TaskStatusService(db_session)
        update_data = TaskStatusUpdate(
            name="Updated Status",
            color="#FFFFFF",
        )

        updated = await service.update(
            tenant_id=test_tenant.id,
            id=status.id,
            data=update_data,
            user_id=test_user.id,
        )

        assert updated.name == "Updated Status"
        assert updated.color == "#FFFFFF"

    async def test_get_default_status(self, db_session, test_tenant, test_user):
        """Test getting default status."""
        from services.task.services.task_status_service import TaskStatusService
        from services.task.models.task_status import TaskStatus

        # Create default status
        default_status = TaskStatus(
            tenant_id=test_tenant.id,
            name="Default Status",
            code="DEFAULT",
            color="#AAAAAA",
            is_default=True,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(default_status)
        await db_session.commit()

        service = TaskStatusService(db_session)
        result = await service.get_default(tenant_id=test_tenant.id)

        assert result is not None
        assert result.is_default is True


class TestTaskOriginTracking:
    """Tests for task origin tracking (from mindmap nodes)."""

    async def test_task_from_mindmap(self, db_session, test_tenant, test_user):
        """Test task created from mindmap node."""
        from services.task.models.task import Task
        from services.task.models.task_status import TaskStatus

        status = TaskStatus(
            tenant_id=test_tenant.id,
            name="Backlog",
            code="BACKLOG",
            color="#808080",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(status)
        await db_session.commit()

        mindmap_id = uuid4()
        node_id = uuid4()

        task = Task(
            tenant_id=test_tenant.id,
            title="Task from Mindmap",
            priority="MEDIUM",
            status_id=status.id,
            origin_type="MINDMAP",
            origin_mindmap_id=mindmap_id,
            origin_node_id=node_id,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(task)
        await db_session.commit()
        await db_session.refresh(task)

        assert task.origin_type == "MINDMAP"
        assert task.origin_mindmap_id == mindmap_id
        assert task.origin_node_id == node_id


class TestTaskDependencies:
    """Tests for task dependencies."""

    async def test_create_dependency(self, db_session, test_tenant, test_user):
        """Test creating task dependency."""
        from services.task.models.task import Task
        from services.task.models.task_status import TaskStatus
        from services.task.models.task_dependency import TaskDependency

        status = TaskStatus(
            tenant_id=test_tenant.id,
            name="Planning",
            code="PLANNING",
            color="#FFA500",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(status)
        await db_session.commit()

        task1 = Task(
            tenant_id=test_tenant.id,
            title="Task 1 - Prerequisite",
            priority="HIGH",
            status_id=status.id,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        task2 = Task(
            tenant_id=test_tenant.id,
            title="Task 2 - Dependent",
            priority="HIGH",
            status_id=status.id,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add_all([task1, task2])
        await db_session.commit()

        dependency = TaskDependency(
            tenant_id=test_tenant.id,
            task_id=task2.id,
            depends_on_task_id=task1.id,
            dependency_type="FINISH_TO_START",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(dependency)
        await db_session.commit()
        await db_session.refresh(dependency)

        assert dependency.id is not None
        assert dependency.task_id == task2.id
        assert dependency.depends_on_task_id == task1.id
        assert dependency.dependency_type == "FINISH_TO_START"
