"""
MindFlow Approval Service - Delegation Service
Business logic for approval delegation management.
"""

from datetime import date
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models.delegation import DelegationRule
from ..schemas.delegation import (
    DelegationCreateRequest,
    DelegationUpdateRequest,
    DelegationResponse,
    DelegationListResponse,
)


class DelegationService:
    """Service for managing delegation rules."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        data: DelegationCreateRequest,
        delegator_id: UUID,
        tenant_id: UUID,
        user_id: UUID
    ) -> DelegationRule:
        """Create a new delegation rule."""
        rule = DelegationRule(
            tenant_id=tenant_id,
            delegator_id=delegator_id,
            delegate_id=data.delegate_id,
            workflow_id=data.workflow_id,
            valid_from=data.valid_from,
            valid_to=data.valid_to,
            reason=data.reason,
            is_active=data.is_active,
            created_by=user_id,
            updated_by=user_id,
        )
        self.db.add(rule)
        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(DelegationRule).where(DelegationRule.id == rule.id).options(
            selectinload(DelegationRule.workflow)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def get_by_id(
        self,
        rule_id: UUID,
        tenant_id: UUID
    ) -> Optional[DelegationRule]:
        """Get a delegation rule by ID."""
        result = await self.db.execute(
            select(DelegationRule).where(
                DelegationRule.id == rule_id,
                DelegationRule.tenant_id == tenant_id
            )
        )
        return result.scalar_one_or_none()

    async def update(
        self,
        rule: DelegationRule,
        data: DelegationUpdateRequest,
        user_id: UUID
    ) -> DelegationRule:
        """Update an existing delegation rule."""
        update_data = data.model_dump(exclude_unset=True, by_alias=False)
        for field, value in update_data.items():
            setattr(rule, field, value)
        rule.updated_by = user_id
        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(DelegationRule).where(DelegationRule.id == rule.id).options(
            selectinload(DelegationRule.workflow)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def delete(
        self,
        rule: DelegationRule
    ) -> None:
        """Delete a delegation rule."""
        await self.db.delete(rule)
        await self.db.commit()

    async def list(
        self,
        tenant_id: UUID,
        delegator_id: Optional[UUID] = None,
        delegate_id: Optional[UUID] = None,
        page: int = 1,
        limit: int = 20,
        is_active: Optional[bool] = None,
    ) -> DelegationListResponse:
        """List delegation rules with pagination."""
        query = select(DelegationRule).where(
            DelegationRule.tenant_id == tenant_id
        )

        if delegator_id:
            query = query.where(DelegationRule.delegator_id == delegator_id)

        if delegate_id:
            query = query.where(DelegationRule.delegate_id == delegate_id)

        if is_active is not None:
            query = query.where(DelegationRule.is_active == is_active)

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Paginate
        query = query.order_by(DelegationRule.valid_from.desc())
        query = query.offset((page - 1) * limit).limit(limit)

        result = await self.db.execute(query)
        rules = result.scalars().all()

        pages = (total + limit - 1) // limit if limit > 0 else 0

        items = []
        for r in rules:
            items.append(DelegationResponse(
                id=r.id,
                delegator_id=r.delegator_id,
                delegate_id=r.delegate_id,
                workflow_id=r.workflow_id,
                valid_from=r.valid_from,
                valid_to=r.valid_to,
                reason=r.reason,
                is_active=r.is_active,
                is_currently_active=r.is_currently_active,
                created_at=r.created_at,
                updated_at=r.updated_at,
            ))

        return DelegationListResponse(
            items=items,
            total=total,
            page=page,
            limit=limit,
            pages=pages,
        )

    async def get_active_delegation(
        self,
        delegator_id: UUID,
        tenant_id: UUID,
        workflow_id: Optional[UUID] = None
    ) -> Optional[DelegationRule]:
        """
        Get active delegation for a user.
        Returns the delegate who should act on behalf of the delegator.
        """
        today = date.today()

        query = select(DelegationRule).where(
            DelegationRule.tenant_id == tenant_id,
            DelegationRule.delegator_id == delegator_id,
            DelegationRule.is_active == True,
            DelegationRule.valid_from <= today,
            DelegationRule.valid_to >= today
        )

        # If workflow_id specified, prioritize workflow-specific delegation
        if workflow_id:
            # First try workflow-specific
            result = await self.db.execute(
                query.where(DelegationRule.workflow_id == workflow_id)
            )
            rule = result.scalar_one_or_none()
            if rule:
                return rule

        # Fall back to general delegation (no workflow restriction)
        result = await self.db.execute(
            query.where(DelegationRule.workflow_id.is_(None))
        )
        return result.scalar_one_or_none()

    async def resolve_approver(
        self,
        original_approver_id: UUID,
        tenant_id: UUID,
        workflow_id: Optional[UUID] = None
    ) -> UUID:
        """
        Resolve the actual approver considering delegations.
        Returns the delegate if delegation is active, otherwise original approver.
        """
        delegation = await self.get_active_delegation(
            original_approver_id, tenant_id, workflow_id
        )

        if delegation:
            return delegation.delegate_id

        return original_approver_id
