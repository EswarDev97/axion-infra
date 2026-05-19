"""
MindFlow Approval Service - Workflow Service
Business logic for approval workflow management.
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models.workflow import ApprovalWorkflow
from ..models.step import ApprovalStep
from ..schemas.workflow import (
    WorkflowCreateRequest,
    WorkflowUpdateRequest,
    WorkflowResponse,
    WorkflowDetailResponse,
    WorkflowListResponse,
)
from ..schemas.step import StepCreateRequest, StepUpdateRequest, StepResponse, StepReorderRequest


class WorkflowService:
    """Service for managing approval workflows."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        data: WorkflowCreateRequest,
        tenant_id: UUID,
        user_id: UUID
    ) -> ApprovalWorkflow:
        """Create a new approval workflow with optional steps."""
        workflow = ApprovalWorkflow(
            tenant_id=tenant_id,
            name=data.name,
            code=data.code,
            entity_type=data.entity_type,
            description=data.description,
            is_active=data.is_active,
            created_by=user_id,
            updated_by=user_id,
        )
        self.db.add(workflow)
        await self.db.flush()

        # Create steps if provided
        if data.steps:
            for step_data in data.steps:
                step = ApprovalStep(
                    tenant_id=tenant_id,
                    workflow_id=workflow.id,
                    step_order=step_data.step_order,
                    name=step_data.name,
                    approver_type=step_data.approver_type,
                    approver_role=step_data.approver_role,
                    approver_position_id=step_data.approver_position_id,
                    use_hierarchy=step_data.use_hierarchy,
                    hierarchy_level=step_data.hierarchy_level,
                    timeout_hours=step_data.timeout_hours,
                    auto_approve_on_timeout=step_data.auto_approve_on_timeout,
                    is_optional=step_data.is_optional,
                    created_by=user_id,
                    updated_by=user_id,
                )
                self.db.add(step)

        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(ApprovalWorkflow).where(ApprovalWorkflow.id == workflow.id).options(
            selectinload(ApprovalWorkflow.steps)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def get_by_id(
        self,
        workflow_id: UUID,
        tenant_id: UUID
    ) -> Optional[ApprovalWorkflow]:
        """Get a workflow by ID."""
        result = await self.db.execute(
            select(ApprovalWorkflow).where(
                ApprovalWorkflow.id == workflow_id,
                ApprovalWorkflow.tenant_id == tenant_id
            )
        )
        return result.scalar_one_or_none()

    async def get_by_code(
        self,
        code: str,
        tenant_id: UUID
    ) -> Optional[ApprovalWorkflow]:
        """Get a workflow by code."""
        result = await self.db.execute(
            select(ApprovalWorkflow).where(
                ApprovalWorkflow.code == code,
                ApprovalWorkflow.tenant_id == tenant_id
            )
        )
        return result.scalar_one_or_none()

    async def get_for_entity_type(
        self,
        entity_type: str,
        tenant_id: UUID
    ) -> Optional[ApprovalWorkflow]:
        """Get active workflow for an entity type."""
        result = await self.db.execute(
            select(ApprovalWorkflow).where(
                ApprovalWorkflow.entity_type == entity_type,
                ApprovalWorkflow.tenant_id == tenant_id,
                ApprovalWorkflow.is_active == True
            )
        )
        return result.scalar_one_or_none()

    async def update(
        self,
        workflow: ApprovalWorkflow,
        data: WorkflowUpdateRequest,
        user_id: UUID
    ) -> ApprovalWorkflow:
        """Update an existing workflow."""
        update_data = data.model_dump(exclude_unset=True, by_alias=False)
        for field, value in update_data.items():
            setattr(workflow, field, value)
        workflow.updated_by = user_id
        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(ApprovalWorkflow).where(ApprovalWorkflow.id == workflow.id).options(
            selectinload(ApprovalWorkflow.steps)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def delete(
        self,
        workflow: ApprovalWorkflow
    ) -> None:
        """Delete a workflow (hard delete - only if no instances)."""
        await self.db.delete(workflow)
        await self.db.commit()

    async def activate(
        self,
        workflow: ApprovalWorkflow,
        user_id: UUID
    ) -> ApprovalWorkflow:
        """Activate a workflow."""
        workflow.is_active = True
        workflow.updated_by = user_id
        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(ApprovalWorkflow).where(ApprovalWorkflow.id == workflow.id).options(
            selectinload(ApprovalWorkflow.steps)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def deactivate(
        self,
        workflow: ApprovalWorkflow,
        user_id: UUID
    ) -> ApprovalWorkflow:
        """Deactivate a workflow."""
        workflow.is_active = False
        workflow.updated_by = user_id
        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(ApprovalWorkflow).where(ApprovalWorkflow.id == workflow.id).options(
            selectinload(ApprovalWorkflow.steps)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def list(
        self,
        tenant_id: UUID,
        page: int = 1,
        limit: int = 20,
        entity_type: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> WorkflowListResponse:
        """List workflows with pagination."""
        query = select(ApprovalWorkflow).where(
            ApprovalWorkflow.tenant_id == tenant_id
        )

        if entity_type:
            query = query.where(ApprovalWorkflow.entity_type == entity_type)

        if is_active is not None:
            query = query.where(ApprovalWorkflow.is_active == is_active)

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Paginate
        query = query.order_by(ApprovalWorkflow.name)
        query = query.offset((page - 1) * limit).limit(limit)

        result = await self.db.execute(query)
        workflows = result.scalars().all()

        pages = (total + limit - 1) // limit if limit > 0 else 0

        items = []
        for w in workflows:
            items.append(WorkflowResponse(
                id=w.id,
                name=w.name,
                code=w.code,
                entity_type=w.entity_type,
                description=w.description,
                is_active=w.is_active,
                step_count=len(w.steps) if w.steps else 0,
                created_at=w.created_at,
                updated_at=w.updated_at,
            ))

        return WorkflowListResponse(
            items=items,
            total=total,
            page=page,
            limit=limit,
            pages=pages,
        )

    # Step management
    async def add_step(
        self,
        workflow: ApprovalWorkflow,
        data: StepCreateRequest,
        tenant_id: UUID,
        user_id: UUID
    ) -> ApprovalStep:
        """Add a step to a workflow."""
        step = ApprovalStep(
            tenant_id=tenant_id,
            workflow_id=workflow.id,
            step_order=data.step_order,
            name=data.name,
            approver_type=data.approver_type,
            approver_role=data.approver_role,
            approver_position_id=data.approver_position_id,
            use_hierarchy=data.use_hierarchy,
            hierarchy_level=data.hierarchy_level,
            timeout_hours=data.timeout_hours,
            auto_approve_on_timeout=data.auto_approve_on_timeout,
            is_optional=data.is_optional,
            created_by=user_id,
            updated_by=user_id,
        )
        self.db.add(step)
        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(ApprovalStep).where(ApprovalStep.id == step.id).options(
            selectinload(ApprovalStep.workflow)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def get_step(
        self,
        step_id: UUID,
        tenant_id: UUID
    ) -> Optional[ApprovalStep]:
        """Get a step by ID."""
        result = await self.db.execute(
            select(ApprovalStep).where(
                ApprovalStep.id == step_id,
                ApprovalStep.tenant_id == tenant_id
            )
        )
        return result.scalar_one_or_none()

    async def update_step(
        self,
        step: ApprovalStep,
        data: StepUpdateRequest,
        user_id: UUID
    ) -> ApprovalStep:
        """Update an existing step."""
        update_data = data.model_dump(exclude_unset=True, by_alias=False)
        for field, value in update_data.items():
            setattr(step, field, value)
        step.updated_by = user_id
        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(ApprovalStep).where(ApprovalStep.id == step.id).options(
            selectinload(ApprovalStep.workflow)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def delete_step(
        self,
        step: ApprovalStep
    ) -> None:
        """Delete a step."""
        await self.db.delete(step)
        await self.db.commit()

    async def reorder_steps(
        self,
        workflow: ApprovalWorkflow,
        data: StepReorderRequest,
        user_id: UUID
    ) -> List[ApprovalStep]:
        """Reorder steps in a workflow."""
        for order, step_id in enumerate(data.step_order, start=1):
            step = await self.get_step(step_id, workflow.tenant_id)
            if step and step.workflow_id == workflow.id:
                step.step_order = order
                step.updated_by = user_id

        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(ApprovalWorkflow).where(ApprovalWorkflow.id == workflow.id).options(
            selectinload(ApprovalWorkflow.steps)
        )
        result = await self.db.execute(stmt)
        refreshed_workflow = result.scalar_one()
        return list(refreshed_workflow.steps)

    async def has_instances(
        self,
        workflow_id: UUID,
        tenant_id: UUID
    ) -> bool:
        """Check if workflow has any instances."""
        from ..models.instance import ApprovalInstance

        result = await self.db.execute(
            select(func.count()).select_from(ApprovalInstance).where(
                ApprovalInstance.workflow_id == workflow_id,
                ApprovalInstance.tenant_id == tenant_id
            )
        )
        count = result.scalar() or 0
        return count > 0
