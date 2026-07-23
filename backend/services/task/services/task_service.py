"""
MindFlow Task Service - Task Business Logic
Per API_CONTRACT.md Section 8.3.1
"""

import secrets
import string
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Optional, Set, Tuple
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from shared.exceptions import (
    ResourceAlreadyExistsException,
    ResourceNotFoundException,
    ResourceStateConflictException,
    BusinessRuleViolationException,
)
from shared.schemas import PaginationParams

from ..models import (
    Task,
    TaskStatus,
    TaskAssignee,
    TaskComment,
    TaskAttachment,
    TaskDependency,
)
from ..schemas.task import TaskFilters


class TaskService:
    """Task management service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    def _generate_task_number(self) -> str:
        """Generate a human-friendly task number, e.g. TASK-12345678."""
        random_part = ''.join(secrets.choice(string.digits) for _ in range(8))
        return f"TASK-{random_part}"

    # ==================== Task CRUD ====================

    async def create_task(
        self,
        tenant_id: UUID,
        title: str,
        created_by: UUID,
        description: Optional[str] = None,
        status_id: Optional[UUID] = None,
        priority: str = "MEDIUM",
        department_id: Optional[UUID] = None,
        parent_task_id: Optional[UUID] = None,
        expected_completion_date: Optional[date] = None,
        estimated_hours: Optional[Decimal] = None,
        tags: List[str] = None,
        assignee_ids: List[UUID] = None,
        origin_type: str = "MANUAL",
        origin_reference_id: Optional[UUID] = None
    ) -> Task:
        """Create a new task."""
        # Get default status if not provided
        if not status_id:
            stmt = select(TaskStatus).where(
                TaskStatus.tenant_id == tenant_id,
                TaskStatus.is_default == True,
                TaskStatus.is_active == True
            )
            result = await self.db.execute(stmt)
            default_status = result.scalar_one_or_none()
            if default_status:
                status_id = default_status.id
            else:
                raise BusinessRuleViolationException(
                    "No default task status configured"
                )

        # Validate status exists
        stmt = select(TaskStatus).where(
            TaskStatus.id == status_id,
            TaskStatus.tenant_id == tenant_id
        )
        result = await self.db.execute(stmt)
        if not result.scalar_one_or_none():
            raise ResourceNotFoundException("TaskStatus", str(status_id))

        # Validate parent task if provided
        if parent_task_id:
            stmt = select(Task).where(
                Task.id == parent_task_id,
                Task.tenant_id == tenant_id,
                Task.is_deleted == False
            )
            result = await self.db.execute(stmt)
            if not result.scalar_one_or_none():
                raise ResourceNotFoundException("ParentTask", str(parent_task_id))

        task = Task(
            tenant_id=tenant_id,
            task_number=self._generate_task_number(),
            title=title,
            description=description,
            status_id=status_id,
            priority=priority,
            department_id=department_id,
            parent_task_id=parent_task_id,
            expected_completion_date=expected_completion_date,
            estimated_hours=estimated_hours,
            tags=tags or [],
            origin_type=origin_type,
            origin_reference_id=origin_reference_id,
            created_by=created_by,
            updated_by=created_by
        )
        self.db.add(task)
        await self.db.flush()

        # Add assignees
        if assignee_ids:
            for emp_id in assignee_ids:
                assignee = TaskAssignee(
                    tenant_id=tenant_id,
                    task_id=task.id,
                    user_id=emp_id,
                    role="ASSIGNEE",
                    assigned_by=created_by
                )
                self.db.add(assignee)

        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(Task).where(Task.id == task.id).options(
            selectinload(Task.status),
            selectinload(Task.assignees),
            selectinload(Task.subtasks),
            selectinload(Task.parent_task)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def get_task(
        self,
        task_id: UUID,
        tenant_id: UUID
    ) -> Task:
        """Get task by ID."""
        stmt = select(Task).where(
            Task.id == task_id,
            Task.tenant_id == tenant_id,
            Task.is_deleted == False
        ).options(
            selectinload(Task.status),
            selectinload(Task.assignees),
            selectinload(Task.subtasks),
            selectinload(Task.parent_task)
        )
        result = await self.db.execute(stmt)
        task = result.scalar_one_or_none()

        if not task:
            raise ResourceNotFoundException("Task", str(task_id))

        return task

    async def list_tasks(
        self,
        tenant_id: UUID,
        pagination: PaginationParams,
        filters: Optional[TaskFilters] = None
    ) -> Tuple[List[Task], int]:
        """List tasks with pagination and filters."""
        base_query = select(Task).where(
            Task.tenant_id == tenant_id,
            Task.is_deleted == False
        )

        if filters:
            if filters.status_id:
                base_query = base_query.where(Task.status_id == filters.status_id)
            if filters.priority:
                base_query = base_query.where(Task.priority == filters.priority)
            if filters.parent_task_id:
                base_query = base_query.where(
                    Task.parent_task_id == filters.parent_task_id
                )
            if filters.department_id:
                base_query = base_query.where(Task.department_id == filters.department_id)
            if filters.is_overdue:
                today = date.today()
                base_query = base_query.where(
                    Task.expected_completion_date < today,
                    Task.actual_completion_date.is_(None)
                )
            if filters.tags:
                # Tasks containing any of the specified tags
                for tag in filters.tags:
                    base_query = base_query.where(
                        Task.tags.contains([tag])
                    )
            if filters.search:
                search_term = f"%{filters.search}%"
                base_query = base_query.where(
                    or_(
                        Task.title.ilike(search_term),
                        Task.description.ilike(search_term)
                    )
                )
            if filters.start_date:
                base_query = base_query.where(
                    Task.expected_completion_date >= filters.start_date
                )
            if filters.end_date:
                base_query = base_query.where(
                    Task.expected_completion_date <= filters.end_date
                )
            if filters.assignee_id:
                # Join with assignees
                base_query = base_query.join(TaskAssignee).where(
                    TaskAssignee.user_id == filters.assignee_id
                )

        # Count
        count_stmt = select(func.count()).select_from(base_query.subquery())
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0

        # Paginate
        stmt = base_query.options(
            selectinload(Task.status),
            selectinload(Task.assignees),
            selectinload(Task.subtasks)
        ).offset(pagination.offset).limit(pagination.page_size)

        if pagination.sort_by == "priority":
            # Custom priority sort
            priority_order = {"URGENT": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
            if pagination.sort_order == "asc":
                stmt = stmt.order_by(Task.priority.asc())
            else:
                stmt = stmt.order_by(Task.priority.desc())
        elif hasattr(Task, pagination.sort_by):
            order_col = getattr(Task, pagination.sort_by)
            if pagination.sort_order == "desc":
                stmt = stmt.order_by(order_col.desc())
            else:
                stmt = stmt.order_by(order_col.asc())

        result = await self.db.execute(stmt)
        tasks = list(result.scalars().unique().all())

        return tasks, total

    async def update_task(
        self,
        task_id: UUID,
        tenant_id: UUID,
        updated_by: UUID,
        title: Optional[str] = None,
        description: Optional[str] = None,
        status_id: Optional[UUID] = None,
        priority: Optional[str] = None,
        department_id: Optional[UUID] = None,
        expected_completion_date: Optional[date] = None,
        actual_completion_date: Optional[date] = None,
        estimated_hours: Optional[Decimal] = None,
        actual_hours: Optional[Decimal] = None,
        tags: Optional[List[str]] = None,
        assignee_ids: Optional[List[UUID]] = None
    ) -> Task:
        """Update task."""
        task = await self.get_task(task_id, tenant_id)

        if title is not None:
            task.title = title
        if description is not None:
            task.description = description
        if status_id is not None and status_id != task.status_id:
            # Validate status transition
            stmt = select(TaskStatus).where(
                TaskStatus.id == status_id,
                TaskStatus.tenant_id == tenant_id
            )
            result = await self.db.execute(stmt)
            new_status = result.scalar_one_or_none()
            if not new_status:
                raise ResourceNotFoundException("TaskStatus", str(status_id))

            # Check if transition is allowed
            if not task.status.can_transition_to(new_status.code):
                raise ResourceStateConflictException(
                    f"Cannot transition from {task.status.code} to {new_status.code}",
                    current_state=task.status.code,
                    target_state=new_status.code
                )

            task.status_id = status_id

            # Set completion date if moving to terminal status
            if new_status.is_terminal and not task.actual_completion_date:
                task.actual_completion_date = date.today()

        if department_id is not None:
            task.department_id = department_id
        if priority is not None:
            task.priority = priority
        if expected_completion_date is not None:
            task.expected_completion_date = expected_completion_date
        if actual_completion_date is not None:
            task.actual_completion_date = actual_completion_date
        if estimated_hours is not None:
            task.estimated_hours = estimated_hours
        if actual_hours is not None:
            task.actual_hours = actual_hours
        if tags is not None:
            task.tags = tags

        # Update assignees if provided
        if assignee_ids is not None:
            # Remove existing assignees
            stmt = select(TaskAssignee).where(
                TaskAssignee.task_id == task_id,
                TaskAssignee.tenant_id == tenant_id
            )
            result = await self.db.execute(stmt)
            for existing in result.scalars().all():
                await self.db.delete(existing)

            # Add new assignees
            for emp_id in assignee_ids:
                assignee = TaskAssignee(
                    tenant_id=tenant_id,
                    task_id=task_id,
                    user_id=emp_id,
                    role="ASSIGNEE",
                    assigned_by=updated_by
                )
                self.db.add(assignee)

        task.updated_by = updated_by
        task.updated_at = datetime.now(timezone.utc)

        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(Task).where(Task.id == task.id).options(
            selectinload(Task.status),
            selectinload(Task.assignees),
            selectinload(Task.subtasks),
            selectinload(Task.parent_task)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def start_task(
        self,
        task_id: UUID,
        tenant_id: UUID,
        user_id: UUID
    ) -> Task:
        """Start a task - sets status to In Progress and records start time."""
        task = await self.get_task(task_id, tenant_id)

        # Validate the task hasn't already been started
        if task.started_at:
            raise BusinessRuleViolationException(
                "Task has already been started"
            )

        # Find the 'In Progress' status
        stmt = select(TaskStatus).where(
            TaskStatus.tenant_id == tenant_id,
            TaskStatus.code == "IN_PROGRESS",
            TaskStatus.is_active == True
        )
        result = await self.db.execute(stmt)
        in_progress_status = result.scalar_one_or_none()
        if not in_progress_status:
            raise BusinessRuleViolationException(
                "No 'In Progress' status configured"
            )

        # Validate transition
        if not task.status.can_transition_to(in_progress_status.code):
            raise ResourceStateConflictException(
                f"Cannot transition from {task.status.code} to {in_progress_status.code}",
                current_state=task.status.code,
                target_state=in_progress_status.code
            )

        task.status_id = in_progress_status.id
        task.started_at = datetime.now(timezone.utc)
        task.updated_by = user_id
        task.updated_at = datetime.now(timezone.utc)

        await self.db.commit()

        stmt = select(Task).where(Task.id == task.id).options(
            selectinload(Task.status),
            selectinload(Task.assignees),
            selectinload(Task.subtasks),
            selectinload(Task.parent_task)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def complete_task(
        self,
        task_id: UUID,
        tenant_id: UUID,
        user_id: UUID
    ) -> Task:
        """Complete a task - sets status to Completed and records completion time."""
        task = await self.get_task(task_id, tenant_id)

        # Find the 'Completed' status
        stmt = select(TaskStatus).where(
            TaskStatus.tenant_id == tenant_id,
            TaskStatus.code == "COMPLETED",
            TaskStatus.is_active == True
        )
        result = await self.db.execute(stmt)
        completed_status = result.scalar_one_or_none()
        if not completed_status:
            raise BusinessRuleViolationException(
                "No 'Completed' status configured"
            )

        # Validate transition
        if not task.status.can_transition_to(completed_status.code):
            raise ResourceStateConflictException(
                f"Cannot transition from {task.status.code} to {completed_status.code}",
                current_state=task.status.code,
                target_state=completed_status.code
            )

        now = datetime.now(timezone.utc)
        task.status_id = completed_status.id
        task.completed_at = now
        task.actual_completion_date = date.today()

        # Calculate actual hours if started_at is set
        if task.started_at:
            delta = now - task.started_at
            task.actual_hours = Decimal(str(round(delta.total_seconds() / 3600, 2)))

        task.updated_by = user_id
        task.updated_at = now

        await self.db.commit()

        stmt = select(Task).where(Task.id == task.id).options(
            selectinload(Task.status),
            selectinload(Task.assignees),
            selectinload(Task.subtasks),
            selectinload(Task.parent_task)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def delete_task(
        self,
        task_id: UUID,
        tenant_id: UUID,
        deleted_by: UUID,
        reason: Optional[str] = None
    ) -> None:
        """Soft delete task."""
        task = await self.get_task(task_id, tenant_id)

        task.is_deleted = True
        task.deleted_at = datetime.now(timezone.utc)
        task.deletion_reason = reason
        task.updated_by = deleted_by
        task.updated_at = datetime.now(timezone.utc)

        await self.db.commit()

    async def get_department_tasks(
        self,
        department_id: UUID,
        tenant_id: UUID,
        pagination: PaginationParams
    ) -> Tuple[List[Task], int]:
        """Get tasks for a specific department."""
        base_query = select(Task).where(
            Task.tenant_id == tenant_id,
            Task.department_id == department_id,
            Task.is_deleted == False
        )

        # Count
        count_stmt = select(func.count()).select_from(base_query.subquery())
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0

        # Paginate
        stmt = base_query.options(
            selectinload(Task.status),
            selectinload(Task.assignees)
        ).offset(pagination.offset).limit(pagination.page_size)
        stmt = stmt.order_by(Task.created_at.desc())

        result = await self.db.execute(stmt)
        tasks = list(result.scalars().unique().all())

        return tasks, total

    # ==================== Subtasks ====================

    async def get_subtasks(
        self,
        task_id: UUID,
        tenant_id: UUID,
        pagination: PaginationParams
    ) -> Tuple[List[Task], int]:
        """Get subtasks of a task."""
        await self.get_task(task_id, tenant_id)

        base_query = select(Task).where(
            Task.parent_task_id == task_id,
            Task.tenant_id == tenant_id,
            Task.is_deleted == False
        )

        # Count
        count_stmt = select(func.count()).select_from(base_query.subquery())
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0

        # Paginate
        stmt = base_query.options(
            selectinload(Task.status),
            selectinload(Task.assignees)
        ).offset(pagination.offset).limit(pagination.page_size)

        result = await self.db.execute(stmt)
        tasks = list(result.scalars().all())

        return tasks, total

    # ==================== Assignees ====================

    async def add_assignee(
        self,
        task_id: UUID,
        user_id: UUID,
        tenant_id: UUID,
        assigned_by: UUID,
        role: str = "ASSIGNEE"
    ) -> TaskAssignee:
        """Add assignee to task."""
        await self.get_task(task_id, tenant_id)

        # Check if already assigned
        stmt = select(TaskAssignee).where(
            TaskAssignee.task_id == task_id,
            TaskAssignee.user_id == user_id,
            TaskAssignee.tenant_id == tenant_id
        )
        result = await self.db.execute(stmt)
        if result.scalar_one_or_none():
            raise ResourceAlreadyExistsException(
                "TaskAssignee",
                f"{task_id}:{user_id}"
            )

        assignee = TaskAssignee(
            tenant_id=tenant_id,
            task_id=task_id,
            user_id=user_id,
            role=role,
            assigned_by=assigned_by
        )
        self.db.add(assignee)
        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(TaskAssignee).where(TaskAssignee.id == assignee.id).options(
            selectinload(TaskAssignee.task)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def remove_assignee(
        self,
        task_id: UUID,
        user_id: UUID,
        tenant_id: UUID
    ) -> None:
        """Remove assignee from task."""
        stmt = select(TaskAssignee).where(
            TaskAssignee.task_id == task_id,
            TaskAssignee.user_id == user_id,
            TaskAssignee.tenant_id == tenant_id
        )
        result = await self.db.execute(stmt)
        assignee = result.scalar_one_or_none()

        if not assignee:
            raise ResourceNotFoundException("TaskAssignee")

        await self.db.delete(assignee)
        await self.db.commit()

    async def get_assignees(
        self,
        task_id: UUID,
        tenant_id: UUID
    ) -> List[TaskAssignee]:
        """Get all assignees for a task."""
        await self.get_task(task_id, tenant_id)

        stmt = select(TaskAssignee).where(
            TaskAssignee.task_id == task_id,
            TaskAssignee.tenant_id == tenant_id
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    # ==================== Comments ====================

    async def add_comment(
        self,
        task_id: UUID,
        content: str,
        tenant_id: UUID,
        created_by: UUID,
        parent_id: Optional[UUID] = None,
        is_internal: bool = False
    ) -> TaskComment:
        """Add comment to task."""
        await self.get_task(task_id, tenant_id)

        # Validate parent comment if provided
        if parent_id:
            stmt = select(TaskComment).where(
                TaskComment.id == parent_id,
                TaskComment.task_id == task_id,
                TaskComment.tenant_id == tenant_id,
                TaskComment.is_deleted == False
            )
            result = await self.db.execute(stmt)
            if not result.scalar_one_or_none():
                raise ResourceNotFoundException("ParentComment", str(parent_id))

        comment = TaskComment(
            tenant_id=tenant_id,
            task_id=task_id,
            content=content,
            parent_id=parent_id,
            is_internal=is_internal,
            created_by=created_by,
            updated_by=created_by
        )
        self.db.add(comment)
        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(TaskComment).where(TaskComment.id == comment.id).options(
            selectinload(TaskComment.task),
            selectinload(TaskComment.replies)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def update_comment(
        self,
        comment_id: UUID,
        task_id: UUID,
        content: str,
        tenant_id: UUID,
        updated_by: UUID
    ) -> TaskComment:
        """Update task comment."""
        stmt = select(TaskComment).where(
            TaskComment.id == comment_id,
            TaskComment.task_id == task_id,
            TaskComment.tenant_id == tenant_id,
            TaskComment.is_deleted == False
        )
        result = await self.db.execute(stmt)
        comment = result.scalar_one_or_none()

        if not comment:
            raise ResourceNotFoundException("TaskComment", str(comment_id))

        comment.content = content
        comment.updated_by = updated_by
        comment.updated_at = datetime.now(timezone.utc)

        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(TaskComment).where(TaskComment.id == comment.id).options(
            selectinload(TaskComment.task),
            selectinload(TaskComment.replies)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def delete_comment(
        self,
        comment_id: UUID,
        task_id: UUID,
        tenant_id: UUID
    ) -> None:
        """Soft delete task comment."""
        stmt = select(TaskComment).where(
            TaskComment.id == comment_id,
            TaskComment.task_id == task_id,
            TaskComment.tenant_id == tenant_id,
            TaskComment.is_deleted == False
        )
        result = await self.db.execute(stmt)
        comment = result.scalar_one_or_none()

        if not comment:
            raise ResourceNotFoundException("TaskComment", str(comment_id))

        comment.is_deleted = True
        comment.deleted_at = datetime.now(timezone.utc)

        await self.db.commit()

    async def get_comments(
        self,
        task_id: UUID,
        tenant_id: UUID,
        pagination: PaginationParams
    ) -> Tuple[List[TaskComment], int]:
        """Get comments for a task."""
        await self.get_task(task_id, tenant_id)

        base_query = select(TaskComment).where(
            TaskComment.task_id == task_id,
            TaskComment.tenant_id == tenant_id,
            TaskComment.is_deleted == False,
            TaskComment.parent_id.is_(None)  # Top-level only
        )

        # Count
        count_stmt = select(func.count()).select_from(base_query.subquery())
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0

        # Paginate
        stmt = base_query.options(
            selectinload(TaskComment.replies)
        ).offset(pagination.offset).limit(pagination.page_size)
        stmt = stmt.order_by(TaskComment.created_at.desc())

        result = await self.db.execute(stmt)
        comments = list(result.scalars().all())

        return comments, total

    # ==================== Attachments ====================

    async def add_attachment(
        self,
        task_id: UUID,
        file_id: UUID,
        tenant_id: UUID,
        attached_by: UUID
    ) -> TaskAttachment:
        """Add attachment to task."""
        await self.get_task(task_id, tenant_id)

        attachment = TaskAttachment(
            tenant_id=tenant_id,
            task_id=task_id,
            file_id=file_id,
            attached_by=attached_by
        )
        self.db.add(attachment)
        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(TaskAttachment).where(TaskAttachment.id == attachment.id).options(
            selectinload(TaskAttachment.task)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def remove_attachment(
        self,
        attachment_id: UUID,
        task_id: UUID,
        tenant_id: UUID
    ) -> None:
        """Remove attachment from task."""
        stmt = select(TaskAttachment).where(
            TaskAttachment.id == attachment_id,
            TaskAttachment.task_id == task_id,
            TaskAttachment.tenant_id == tenant_id
        )
        result = await self.db.execute(stmt)
        attachment = result.scalar_one_or_none()

        if not attachment:
            raise ResourceNotFoundException("TaskAttachment", str(attachment_id))

        await self.db.delete(attachment)
        await self.db.commit()

    async def get_attachments(
        self,
        task_id: UUID,
        tenant_id: UUID
    ) -> List[TaskAttachment]:
        """Get all attachments for a task."""
        await self.get_task(task_id, tenant_id)

        stmt = select(TaskAttachment).where(
            TaskAttachment.task_id == task_id,
            TaskAttachment.tenant_id == tenant_id
        ).order_by(TaskAttachment.created_at.desc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    # ==================== Dependencies ====================

    async def add_dependency(
        self,
        task_id: UUID,
        depends_on_task_id: UUID,
        tenant_id: UUID,
        created_by: UUID,
        dependency_type: str = "FINISH_TO_START"
    ) -> TaskDependency:
        """Add dependency to task."""
        await self.get_task(task_id, tenant_id)
        await self.get_task(depends_on_task_id, tenant_id)

        # Check for circular dependency
        if await self._would_create_cycle(task_id, depends_on_task_id, tenant_id):
            raise BusinessRuleViolationException(
                "Adding this dependency would create a circular reference"
            )

        # Check if already exists
        stmt = select(TaskDependency).where(
            TaskDependency.task_id == task_id,
            TaskDependency.depends_on_task_id == depends_on_task_id,
            TaskDependency.tenant_id == tenant_id
        )
        result = await self.db.execute(stmt)
        if result.scalar_one_or_none():
            raise ResourceAlreadyExistsException(
                "TaskDependency",
                f"{task_id}:{depends_on_task_id}"
            )

        dependency = TaskDependency(
            tenant_id=tenant_id,
            task_id=task_id,
            depends_on_task_id=depends_on_task_id,
            dependency_type=dependency_type,
            created_by=created_by
        )
        self.db.add(dependency)
        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(TaskDependency).where(TaskDependency.id == dependency.id).options(
            selectinload(TaskDependency.task),
            selectinload(TaskDependency.depends_on_task)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def remove_dependency(
        self,
        dependency_id: UUID,
        task_id: UUID,
        tenant_id: UUID
    ) -> None:
        """Remove dependency from task."""
        stmt = select(TaskDependency).where(
            TaskDependency.id == dependency_id,
            TaskDependency.task_id == task_id,
            TaskDependency.tenant_id == tenant_id
        )
        result = await self.db.execute(stmt)
        dependency = result.scalar_one_or_none()

        if not dependency:
            raise ResourceNotFoundException("TaskDependency", str(dependency_id))

        await self.db.delete(dependency)
        await self.db.commit()

    async def get_dependencies(
        self,
        task_id: UUID,
        tenant_id: UUID
    ) -> List[TaskDependency]:
        """Get all dependencies for a task."""
        await self.get_task(task_id, tenant_id)

        stmt = select(TaskDependency).where(
            TaskDependency.task_id == task_id,
            TaskDependency.tenant_id == tenant_id
        ).options(
            selectinload(TaskDependency.depends_on_task).selectinload(Task.status)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def _would_create_cycle(
        self,
        task_id: UUID,
        depends_on_task_id: UUID,
        tenant_id: UUID,
        visited: Optional[Set[UUID]] = None
    ) -> bool:
        """Check if adding dependency would create a cycle."""
        if visited is None:
            visited = set()

        if depends_on_task_id == task_id:
            return True

        if depends_on_task_id in visited:
            return False

        visited.add(depends_on_task_id)

        # Get dependencies of depends_on_task
        stmt = select(TaskDependency.depends_on_task_id).where(
            TaskDependency.task_id == depends_on_task_id,
            TaskDependency.tenant_id == tenant_id
        )
        result = await self.db.execute(stmt)
        dep_ids = [row[0] for row in result.fetchall()]

        for dep_id in dep_ids:
            if await self._would_create_cycle(task_id, dep_id, tenant_id, visited):
                return True

        return False

    # ==================== Views ====================

    async def get_kanban_view(
        self,
        tenant_id: UUID,
        filters: Optional[TaskFilters] = None
    ) -> dict:
        """Get tasks organized by status for Kanban view."""
        # Get all active statuses
        stmt = select(TaskStatus).where(
            TaskStatus.tenant_id == tenant_id,
            TaskStatus.is_active == True
        ).order_by(TaskStatus.sort_order.asc())
        result = await self.db.execute(stmt)
        statuses = list(result.scalars().all())

        columns = []
        total_tasks = 0

        for status in statuses:
            # Get tasks for this status
            task_query = select(Task).where(
                Task.tenant_id == tenant_id,
                Task.status_id == status.id,
                Task.is_deleted == False
            )

            if filters:
                if filters.assignee_id:
                    task_query = task_query.join(TaskAssignee).where(
                        TaskAssignee.user_id == filters.assignee_id
                    )
                if filters.priority:
                    task_query = task_query.where(Task.priority == filters.priority)

            task_query = task_query.options(
                selectinload(Task.status),
                selectinload(Task.assignees)
            ).limit(50)

            result = await self.db.execute(task_query)
            tasks = list(result.scalars().unique().all())

            columns.append({
                "status": status,
                "tasks": tasks,
                "count": len(tasks)
            })
            total_tasks += len(tasks)

        return {
            "columns": columns,
            "total_tasks": total_tasks
        }

    async def get_calendar_view(
        self,
        tenant_id: UUID,
        start_date: date,
        end_date: date,
        filters: Optional[TaskFilters] = None
    ) -> dict:
        """Get tasks for calendar view."""
        query = select(Task).where(
            Task.tenant_id == tenant_id,
            Task.is_deleted == False,
            Task.expected_completion_date.isnot(None),
            Task.expected_completion_date >= start_date,
            Task.expected_completion_date <= end_date
        ).options(
            selectinload(Task.status)
        )

        if filters:
            if filters.assignee_id:
                query = query.join(TaskAssignee).where(
                    TaskAssignee.user_id == filters.assignee_id
                )
            if filters.priority:
                query = query.where(Task.priority == filters.priority)

        result = await self.db.execute(query)
        tasks = list(result.scalars().unique().all())

        events = []
        for task in tasks:
            events.append({
                "id": task.id,
                "title": task.title,
                "date": task.expected_completion_date,
                "priority": task.priority,
                "status_name": task.status.name,
                "status_color": task.status.color,
                "is_overdue": task.is_overdue
            })

        return {
            "events": events,
            "start_date": start_date,
            "end_date": end_date
        }

    async def get_my_tasks(
        self,
        user_id: UUID,
        tenant_id: UUID,
        pagination: PaginationParams
    ) -> Tuple[List[Task], int]:
        """Get tasks created by a user."""
        base_query = select(Task).where(
            Task.tenant_id == tenant_id,
            Task.created_by == user_id,
            Task.is_deleted == False
        )

        # Count
        count_stmt = select(func.count()).select_from(base_query.subquery())
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0

        # Paginate
        stmt = base_query.options(
            selectinload(Task.status),
            selectinload(Task.assignees)
        ).offset(pagination.offset).limit(pagination.page_size)
        stmt = stmt.order_by(Task.created_at.desc())

        result = await self.db.execute(stmt)
        tasks = list(result.scalars().all())

        return tasks, total

    async def get_assigned_tasks(
        self,
        user_id: UUID,
        tenant_id: UUID,
        pagination: PaginationParams
    ) -> Tuple[List[Task], int]:
        """Get tasks assigned to an employee."""
        base_query = select(Task).join(TaskAssignee).where(
            Task.tenant_id == tenant_id,
            TaskAssignee.user_id == user_id,
            Task.is_deleted == False
        )

        # Count
        count_stmt = select(func.count()).select_from(base_query.subquery())
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0

        # Paginate
        stmt = base_query.options(
            selectinload(Task.status),
            selectinload(Task.assignees)
        ).offset(pagination.offset).limit(pagination.page_size)
        stmt = stmt.order_by(Task.created_at.desc())

        result = await self.db.execute(stmt)
        tasks = list(result.scalars().unique().all())

        return tasks, total
