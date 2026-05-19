"""
MindFlow Approval Service - Instance Service
Business logic for approval instance management.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models.workflow import ApprovalWorkflow
from ..models.step import ApprovalStep
from ..models.instance import (
    ApprovalInstance,
    INSTANCE_STATUS_PENDING,
    INSTANCE_STATUS_APPROVED,
    INSTANCE_STATUS_REJECTED,
    INSTANCE_STATUS_CANCELLED,
)
from ..models.decision import (
    ApprovalDecision,
    DECISION_APPROVED,
    DECISION_REJECTED,
    DECISION_DELEGATED,
    DECISION_INFO_REQUESTED,
)
from ..schemas.instance import (
    InstanceCreateRequest,
    InstanceResponse,
    InstanceDetailResponse,
    InstanceListResponse,
)
from ..schemas.decision import DecisionRequest, DelegateRequest, DecisionResponse
from ..schemas.step import StepResponse
from .delegation_service import DelegationService


class InstanceService:
    """Service for managing approval instances."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.delegation_service = DelegationService(db)

    async def create(
        self,
        data: InstanceCreateRequest,
        tenant_id: UUID,
        user_id: UUID
    ) -> ApprovalInstance:
        """Create a new approval instance."""
        # Get workflow
        result = await self.db.execute(
            select(ApprovalWorkflow).where(
                ApprovalWorkflow.id == data.workflow_id,
                ApprovalWorkflow.tenant_id == tenant_id,
                ApprovalWorkflow.is_active == True
            )
        )
        workflow = result.scalar_one_or_none()
        if not workflow:
            raise ValueError("Workflow not found or inactive")

        # Get first step
        first_step = workflow.first_step
        if not first_step:
            raise ValueError("Workflow has no steps")

        instance = ApprovalInstance(
            tenant_id=tenant_id,
            workflow_id=workflow.id,
            entity_type=data.entity_type,
            entity_id=data.entity_id,
            requester_id=user_id,
            current_step_id=first_step.id,
            status=INSTANCE_STATUS_PENDING,
        )
        self.db.add(instance)
        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(ApprovalInstance).where(ApprovalInstance.id == instance.id).options(
            selectinload(ApprovalInstance.workflow),
            selectinload(ApprovalInstance.current_step),
            selectinload(ApprovalInstance.decisions)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def get_by_id(
        self,
        instance_id: UUID,
        tenant_id: UUID
    ) -> Optional[ApprovalInstance]:
        """Get an instance by ID."""
        result = await self.db.execute(
            select(ApprovalInstance).where(
                ApprovalInstance.id == instance_id,
                ApprovalInstance.tenant_id == tenant_id
            )
        )
        return result.scalar_one_or_none()

    async def get_for_entity(
        self,
        entity_type: str,
        entity_id: UUID,
        tenant_id: UUID
    ) -> Optional[ApprovalInstance]:
        """Get pending instance for an entity."""
        result = await self.db.execute(
            select(ApprovalInstance).where(
                ApprovalInstance.entity_type == entity_type,
                ApprovalInstance.entity_id == entity_id,
                ApprovalInstance.tenant_id == tenant_id,
                ApprovalInstance.status == INSTANCE_STATUS_PENDING
            )
        )
        return result.scalar_one_or_none()

    async def approve(
        self,
        instance: ApprovalInstance,
        data: DecisionRequest,
        user_id: UUID,
        delegated_from_id: Optional[UUID] = None
    ) -> ApprovalInstance:
        """Approve the current step."""
        if not instance.current_step:
            raise ValueError("Instance has no current step")

        # Record decision
        decision = ApprovalDecision(
            tenant_id=instance.tenant_id,
            instance_id=instance.id,
            step_id=instance.current_step_id,
            approver_id=user_id,
            decision=DECISION_APPROVED,
            comments=data.comments,
            delegated_from_id=delegated_from_id,
        )
        self.db.add(decision)

        # Advance to next step or complete
        await self._advance_to_next_step(instance)

        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(ApprovalInstance).where(ApprovalInstance.id == instance.id).options(
            selectinload(ApprovalInstance.workflow),
            selectinload(ApprovalInstance.current_step),
            selectinload(ApprovalInstance.decisions)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def reject(
        self,
        instance: ApprovalInstance,
        data: DecisionRequest,
        user_id: UUID,
        delegated_from_id: Optional[UUID] = None
    ) -> ApprovalInstance:
        """Reject the approval."""
        if not instance.current_step:
            raise ValueError("Instance has no current step")

        # Record decision
        decision = ApprovalDecision(
            tenant_id=instance.tenant_id,
            instance_id=instance.id,
            step_id=instance.current_step_id,
            approver_id=user_id,
            decision=DECISION_REJECTED,
            comments=data.comments,
            delegated_from_id=delegated_from_id,
        )
        self.db.add(decision)

        # Mark as rejected
        instance.status = INSTANCE_STATUS_REJECTED
        instance.completed_at = datetime.utcnow()
        instance.current_step_id = None

        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(ApprovalInstance).where(ApprovalInstance.id == instance.id).options(
            selectinload(ApprovalInstance.workflow),
            selectinload(ApprovalInstance.current_step),
            selectinload(ApprovalInstance.decisions)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def delegate(
        self,
        instance: ApprovalInstance,
        data: DelegateRequest,
        user_id: UUID
    ) -> ApprovalInstance:
        """Delegate the approval to another user."""
        if not instance.current_step:
            raise ValueError("Instance has no current step")

        # Record delegation decision
        decision = ApprovalDecision(
            tenant_id=instance.tenant_id,
            instance_id=instance.id,
            step_id=instance.current_step_id,
            approver_id=data.delegate_to_id,
            decision=DECISION_DELEGATED,
            comments=data.comments,
            delegated_from_id=user_id,
        )
        self.db.add(decision)

        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(ApprovalInstance).where(ApprovalInstance.id == instance.id).options(
            selectinload(ApprovalInstance.workflow),
            selectinload(ApprovalInstance.current_step),
            selectinload(ApprovalInstance.decisions)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def request_info(
        self,
        instance: ApprovalInstance,
        data: DecisionRequest,
        user_id: UUID
    ) -> ApprovalInstance:
        """Request more information."""
        if not instance.current_step:
            raise ValueError("Instance has no current step")

        # Record decision
        decision = ApprovalDecision(
            tenant_id=instance.tenant_id,
            instance_id=instance.id,
            step_id=instance.current_step_id,
            approver_id=user_id,
            decision=DECISION_INFO_REQUESTED,
            comments=data.comments,
        )
        self.db.add(decision)

        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(ApprovalInstance).where(ApprovalInstance.id == instance.id).options(
            selectinload(ApprovalInstance.workflow),
            selectinload(ApprovalInstance.current_step),
            selectinload(ApprovalInstance.decisions)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def cancel(
        self,
        instance: ApprovalInstance
    ) -> ApprovalInstance:
        """Cancel an approval instance."""
        instance.status = INSTANCE_STATUS_CANCELLED
        instance.completed_at = datetime.utcnow()
        instance.current_step_id = None

        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(ApprovalInstance).where(ApprovalInstance.id == instance.id).options(
            selectinload(ApprovalInstance.workflow),
            selectinload(ApprovalInstance.current_step),
            selectinload(ApprovalInstance.decisions)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def _advance_to_next_step(
        self,
        instance: ApprovalInstance
    ) -> None:
        """Advance instance to next step or complete."""
        current_step = instance.current_step
        workflow = instance.workflow

        # Find next step
        next_step = None
        for step in workflow.steps:
            if step.step_order > current_step.step_order:
                next_step = step
                break

        if next_step:
            # Move to next step
            instance.current_step_id = next_step.id
        else:
            # No more steps - workflow complete
            instance.status = INSTANCE_STATUS_APPROVED
            instance.completed_at = datetime.utcnow()
            instance.current_step_id = None

    async def list(
        self,
        tenant_id: UUID,
        page: int = 1,
        limit: int = 20,
        workflow_id: Optional[UUID] = None,
        entity_type: Optional[str] = None,
        status: Optional[str] = None,
        requester_id: Optional[UUID] = None,
    ) -> InstanceListResponse:
        """List approval instances with pagination."""
        query = select(ApprovalInstance).where(
            ApprovalInstance.tenant_id == tenant_id
        )

        if workflow_id:
            query = query.where(ApprovalInstance.workflow_id == workflow_id)

        if entity_type:
            query = query.where(ApprovalInstance.entity_type == entity_type)

        if status:
            query = query.where(ApprovalInstance.status == status)

        if requester_id:
            query = query.where(ApprovalInstance.requester_id == requester_id)

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Paginate
        query = query.order_by(ApprovalInstance.created_at.desc())
        query = query.offset((page - 1) * limit).limit(limit)

        result = await self.db.execute(query)
        instances = result.scalars().all()

        pages = (total + limit - 1) // limit if limit > 0 else 0

        items = []
        for i in instances:
            items.append(InstanceResponse(
                id=i.id,
                workflow_id=i.workflow_id,
                workflow_name=i.workflow.name if i.workflow else None,
                entity_type=i.entity_type,
                entity_id=i.entity_id,
                requester_id=i.requester_id,
                current_step_id=i.current_step_id,
                current_step_name=i.current_step.name if i.current_step else None,
                status=i.status,
                started_at=i.started_at,
                completed_at=i.completed_at,
                created_at=i.created_at,
            ))

        return InstanceListResponse(
            items=items,
            total=total,
            page=page,
            limit=limit,
            pages=pages,
        )

    async def get_pending_my_approval(
        self,
        tenant_id: UUID,
        user_id: UUID,
        page: int = 1,
        limit: int = 20,
    ) -> InstanceListResponse:
        """Get instances pending the user's approval."""
        # This is a simplified version - in production, you'd need to
        # resolve the actual approver based on step.approver_type
        query = select(ApprovalInstance).where(
            ApprovalInstance.tenant_id == tenant_id,
            ApprovalInstance.status == INSTANCE_STATUS_PENDING
        )

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Paginate
        query = query.order_by(ApprovalInstance.created_at.desc())
        query = query.offset((page - 1) * limit).limit(limit)

        result = await self.db.execute(query)
        instances = result.scalars().all()

        pages = (total + limit - 1) // limit if limit > 0 else 0

        items = []
        for i in instances:
            items.append(InstanceResponse(
                id=i.id,
                workflow_id=i.workflow_id,
                workflow_name=i.workflow.name if i.workflow else None,
                entity_type=i.entity_type,
                entity_id=i.entity_id,
                requester_id=i.requester_id,
                current_step_id=i.current_step_id,
                current_step_name=i.current_step.name if i.current_step else None,
                status=i.status,
                started_at=i.started_at,
                completed_at=i.completed_at,
                created_at=i.created_at,
            ))

        return InstanceListResponse(
            items=items,
            total=total,
            page=page,
            limit=limit,
            pages=pages,
        )

    async def get_my_requests(
        self,
        tenant_id: UUID,
        user_id: UUID,
        page: int = 1,
        limit: int = 20,
    ) -> InstanceListResponse:
        """Get instances requested by the user."""
        return await self.list(
            tenant_id,
            page=page,
            limit=limit,
            requester_id=user_id
        )

    async def get_decision_history(
        self,
        instance_id: UUID,
        tenant_id: UUID
    ) -> List[DecisionResponse]:
        """Get decision history for an instance."""
        result = await self.db.execute(
            select(ApprovalDecision).where(
                ApprovalDecision.instance_id == instance_id,
                ApprovalDecision.tenant_id == tenant_id
            ).order_by(ApprovalDecision.decided_at)
        )
        decisions = result.scalars().all()

        return [
            DecisionResponse(
                id=d.id,
                instance_id=d.instance_id,
                step_id=d.step_id,
                step_name=d.step.name if d.step else None,
                approver_id=d.approver_id,
                decision=d.decision,
                comments=d.comments,
                delegated_from_id=d.delegated_from_id,
                decided_at=d.decided_at,
                created_at=d.created_at,
            )
            for d in decisions
        ]
