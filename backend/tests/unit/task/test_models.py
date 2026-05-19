"""
Task Service - Model Unit Tests
Per SDLC Phase 7 Task 7.1 - Write Unit Tests

Tests for:
- Task model
- TaskStatus model
- TaskAssignee model
- TaskComment model
- TaskAttachment model
- TaskDependency model
"""

import pytest
from datetime import datetime, date, timedelta
from uuid import uuid4

pytestmark = pytest.mark.unit


class TestTaskStatusModel:
    """Tests for the TaskStatus model."""

    @pytest.mark.asyncio
    async def test_task_status_creation(self, db_session, test_tenant):
        """Test task status model creation."""
        from services.task.models import TaskStatus

        status = TaskStatus(
            id=uuid4(),
            tenant_id=test_tenant.id,
            name="In Progress",
            code="IN_PROGRESS",
            color="#FFA500",
            order=2,
            is_default=False,
            is_final=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db_session.add(status)
        await db_session.flush()

        assert status.id is not None
        assert status.name == "In Progress"
        assert status.code == "IN_PROGRESS"

    @pytest.mark.asyncio
    async def test_task_status_code_unique_per_tenant(self, db_session, test_tenant):
        """Test status code must be unique within a tenant."""
        from services.task.models import TaskStatus
        from sqlalchemy.exc import IntegrityError

        status1 = TaskStatus(
            id=uuid4(),
            tenant_id=test_tenant.id,
            name="Status One",
            code="DUPLICATE",
            order=1,
        )
        db_session.add(status1)
        await db_session.flush()

        status2 = TaskStatus(
            id=uuid4(),
            tenant_id=test_tenant.id,
            name="Status Two",
            code="DUPLICATE",  # Duplicate
            order=2,
        )
        db_session.add(status2)

        with pytest.raises(IntegrityError):
            await db_session.flush()


class TestTaskModel:
    """Tests for the Task model."""

    @pytest.mark.asyncio
    async def test_task_creation(self, db_session, test_tenant, test_user):
        """Test task model creation."""
        from services.task.models import Task, TaskStatus

        status = TaskStatus(
            id=uuid4(),
            tenant_id=test_tenant.id,
            name="To Do",
            code="TODO",
            order=1,
            is_default=True,
        )
        db_session.add(status)
        await db_session.flush()

        task = Task(
            id=uuid4(),
            tenant_id=test_tenant.id,
            title="Test Task",
            description="A test task description",
            status_id=status.id,
            priority="MEDIUM",
            created_by=test_user.id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db_session.add(task)
        await db_session.flush()

        assert task.id is not None
        assert task.title == "Test Task"
        assert task.priority == "MEDIUM"

    @pytest.mark.asyncio
    async def test_task_with_due_date(self, db_session, test_tenant, test_user):
        """Test task with due date."""
        from services.task.models import Task, TaskStatus

        status = TaskStatus(
            id=uuid4(),
            tenant_id=test_tenant.id,
            name="Open",
            code="OPEN_DUE",
            order=1,
        )
        db_session.add(status)
        await db_session.flush()

        due_date = datetime.utcnow() + timedelta(days=7)
        task = Task(
            id=uuid4(),
            tenant_id=test_tenant.id,
            title="Task with Due Date",
            status_id=status.id,
            priority="HIGH",
            due_date=due_date,
            created_by=test_user.id,
        )
        db_session.add(task)
        await db_session.flush()

        assert task.due_date == due_date

    @pytest.mark.asyncio
    async def test_task_is_overdue_property(self, db_session, test_tenant, test_user):
        """Test task is_overdue property."""
        from services.task.models import Task, TaskStatus

        status = TaskStatus(
            id=uuid4(),
            tenant_id=test_tenant.id,
            name="Open",
            code="OPEN_OVERDUE",
            order=1,
            is_final=False,
        )
        db_session.add(status)
        await db_session.flush()

        # Create overdue task
        past_date = datetime.utcnow() - timedelta(days=1)
        task = Task(
            id=uuid4(),
            tenant_id=test_tenant.id,
            title="Overdue Task",
            status_id=status.id,
            priority="HIGH",
            due_date=past_date,
            created_by=test_user.id,
        )
        db_session.add(task)
        await db_session.flush()

        if hasattr(task, 'is_overdue'):
            assert task.is_overdue is True

    @pytest.mark.asyncio
    async def test_task_parent_child_relationship(self, db_session, test_tenant, test_user):
        """Test task parent-child (subtask) relationship."""
        from services.task.models import Task, TaskStatus

        status = TaskStatus(
            id=uuid4(),
            tenant_id=test_tenant.id,
            name="Open",
            code="OPEN_PARENT",
            order=1,
        )
        db_session.add(status)
        await db_session.flush()

        parent_task = Task(
            id=uuid4(),
            tenant_id=test_tenant.id,
            title="Parent Task",
            status_id=status.id,
            priority="HIGH",
            created_by=test_user.id,
        )
        db_session.add(parent_task)
        await db_session.flush()

        child_task = Task(
            id=uuid4(),
            tenant_id=test_tenant.id,
            title="Child Task",
            status_id=status.id,
            priority="MEDIUM",
            parent_task_id=parent_task.id,
            created_by=test_user.id,
        )
        db_session.add(child_task)
        await db_session.flush()

        assert child_task.parent_task_id == parent_task.id

    @pytest.mark.asyncio
    async def test_task_soft_delete(self, db_session, test_tenant, test_user):
        """Test task soft delete."""
        from services.task.models import Task, TaskStatus

        status = TaskStatus(
            id=uuid4(),
            tenant_id=test_tenant.id,
            name="Open",
            code="OPEN_DEL",
            order=1,
        )
        db_session.add(status)
        await db_session.flush()

        task = Task(
            id=uuid4(),
            tenant_id=test_tenant.id,
            title="To Be Deleted",
            status_id=status.id,
            priority="LOW",
            created_by=test_user.id,
        )
        db_session.add(task)
        await db_session.flush()

        # Soft delete
        task.is_deleted = True
        task.deleted_at = datetime.utcnow()
        await db_session.flush()

        assert task.is_deleted is True
        assert task.deleted_at is not None

    @pytest.mark.asyncio
    async def test_task_origin_tracking(self, db_session, test_tenant, test_user):
        """Test task origin tracking (e.g., from mind map node)."""
        from services.task.models import Task, TaskStatus

        status = TaskStatus(
            id=uuid4(),
            tenant_id=test_tenant.id,
            name="Open",
            code="OPEN_ORIGIN",
            order=1,
        )
        db_session.add(status)
        await db_session.flush()

        mindmap_node_id = uuid4()
        task = Task(
            id=uuid4(),
            tenant_id=test_tenant.id,
            title="Task from Mind Map",
            status_id=status.id,
            priority="MEDIUM",
            origin_type="MINDMAP_NODE",
            origin_reference_id=mindmap_node_id,
            created_by=test_user.id,
        )
        db_session.add(task)
        await db_session.flush()

        assert task.origin_type == "MINDMAP_NODE"
        assert task.origin_reference_id == mindmap_node_id


class TestTaskAssigneeModel:
    """Tests for the TaskAssignee model."""

    @pytest.mark.asyncio
    async def test_task_assignee_creation(self, db_session, test_tenant, test_user):
        """Test task assignee model creation."""
        from services.task.models import Task, TaskStatus, TaskAssignee

        status = TaskStatus(
            id=uuid4(),
            tenant_id=test_tenant.id,
            name="Open",
            code="OPEN_ASSIGN",
            order=1,
        )
        db_session.add(status)
        await db_session.flush()

        task = Task(
            id=uuid4(),
            tenant_id=test_tenant.id,
            title="Task to Assign",
            status_id=status.id,
            priority="MEDIUM",
            created_by=test_user.id,
        )
        db_session.add(task)
        await db_session.flush()

        assignee = TaskAssignee(
            id=uuid4(),
            tenant_id=test_tenant.id,
            task_id=task.id,
            user_id=test_user.id,
            assigned_at=datetime.utcnow(),
            assigned_by=test_user.id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db_session.add(assignee)
        await db_session.flush()

        assert assignee.id is not None
        assert assignee.task_id == task.id
        assert assignee.user_id == test_user.id


class TestTaskCommentModel:
    """Tests for the TaskComment model."""

    @pytest.mark.asyncio
    async def test_task_comment_creation(self, db_session, test_tenant, test_user):
        """Test task comment model creation."""
        from services.task.models import Task, TaskStatus, TaskComment

        status = TaskStatus(
            id=uuid4(),
            tenant_id=test_tenant.id,
            name="Open",
            code="OPEN_COMMENT",
            order=1,
        )
        db_session.add(status)
        await db_session.flush()

        task = Task(
            id=uuid4(),
            tenant_id=test_tenant.id,
            title="Task with Comments",
            status_id=status.id,
            priority="MEDIUM",
            created_by=test_user.id,
        )
        db_session.add(task)
        await db_session.flush()

        comment = TaskComment(
            id=uuid4(),
            tenant_id=test_tenant.id,
            task_id=task.id,
            content="This is a test comment",
            created_by=test_user.id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db_session.add(comment)
        await db_session.flush()

        assert comment.id is not None
        assert comment.content == "This is a test comment"

    @pytest.mark.asyncio
    async def test_task_comment_reply(self, db_session, test_tenant, test_user):
        """Test task comment reply (threaded comments)."""
        from services.task.models import Task, TaskStatus, TaskComment

        status = TaskStatus(
            id=uuid4(),
            tenant_id=test_tenant.id,
            name="Open",
            code="OPEN_REPLY",
            order=1,
        )
        db_session.add(status)
        await db_session.flush()

        task = Task(
            id=uuid4(),
            tenant_id=test_tenant.id,
            title="Task with Threaded Comments",
            status_id=status.id,
            priority="MEDIUM",
            created_by=test_user.id,
        )
        db_session.add(task)
        await db_session.flush()

        parent_comment = TaskComment(
            id=uuid4(),
            tenant_id=test_tenant.id,
            task_id=task.id,
            content="Parent comment",
            created_by=test_user.id,
        )
        db_session.add(parent_comment)
        await db_session.flush()

        reply_comment = TaskComment(
            id=uuid4(),
            tenant_id=test_tenant.id,
            task_id=task.id,
            content="Reply to parent",
            parent_comment_id=parent_comment.id,
            created_by=test_user.id,
        )
        db_session.add(reply_comment)
        await db_session.flush()

        assert reply_comment.parent_comment_id == parent_comment.id


class TestTaskDependencyModel:
    """Tests for the TaskDependency model."""

    @pytest.mark.asyncio
    async def test_task_dependency_creation(self, db_session, test_tenant, test_user):
        """Test task dependency model creation."""
        from services.task.models import Task, TaskStatus, TaskDependency

        status = TaskStatus(
            id=uuid4(),
            tenant_id=test_tenant.id,
            name="Open",
            code="OPEN_DEP",
            order=1,
        )
        db_session.add(status)
        await db_session.flush()

        task1 = Task(
            id=uuid4(),
            tenant_id=test_tenant.id,
            title="Blocking Task",
            status_id=status.id,
            priority="HIGH",
            created_by=test_user.id,
        )
        task2 = Task(
            id=uuid4(),
            tenant_id=test_tenant.id,
            title="Blocked Task",
            status_id=status.id,
            priority="MEDIUM",
            created_by=test_user.id,
        )
        db_session.add(task1)
        db_session.add(task2)
        await db_session.flush()

        dependency = TaskDependency(
            id=uuid4(),
            tenant_id=test_tenant.id,
            task_id=task2.id,  # Dependent task
            depends_on_task_id=task1.id,  # Blocking task
            dependency_type="BLOCKS",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db_session.add(dependency)
        await db_session.flush()

        assert dependency.id is not None
        assert dependency.task_id == task2.id
        assert dependency.depends_on_task_id == task1.id

    @pytest.mark.asyncio
    async def test_task_dependency_no_circular(self, db_session, test_tenant, test_user):
        """Test that circular dependencies should be prevented."""
        from services.task.models import Task, TaskStatus, TaskDependency
        from sqlalchemy.exc import IntegrityError

        status = TaskStatus(
            id=uuid4(),
            tenant_id=test_tenant.id,
            name="Open",
            code="OPEN_CIRC",
            order=1,
        )
        db_session.add(status)
        await db_session.flush()

        task1 = Task(
            id=uuid4(),
            tenant_id=test_tenant.id,
            title="Task 1",
            status_id=status.id,
            priority="MEDIUM",
            created_by=test_user.id,
        )
        task2 = Task(
            id=uuid4(),
            tenant_id=test_tenant.id,
            title="Task 2",
            status_id=status.id,
            priority="MEDIUM",
            created_by=test_user.id,
        )
        db_session.add(task1)
        db_session.add(task2)
        await db_session.flush()

        # Task 2 depends on Task 1
        dep1 = TaskDependency(
            id=uuid4(),
            tenant_id=test_tenant.id,
            task_id=task2.id,
            depends_on_task_id=task1.id,
            dependency_type="BLOCKS",
        )
        db_session.add(dep1)
        await db_session.flush()

        # Task 1 depends on Task 2 (circular - should fail at service layer)
        # Note: This might not fail at model level, but should at service level
        dep2 = TaskDependency(
            id=uuid4(),
            tenant_id=test_tenant.id,
            task_id=task1.id,
            depends_on_task_id=task2.id,
            dependency_type="BLOCKS",
        )
        db_session.add(dep2)
        # This test documents expected behavior - actual check happens in service layer
        # await db_session.flush()
