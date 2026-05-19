"""
MindFlow Complaint Service - Escalation Service
Business logic for escalation rule management and auto-escalation.
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.escalation_rule import EscalationRule
from ..schemas.escalation_rule import (
    EscalationRuleCreateRequest,
    EscalationRuleUpdateRequest,
    EscalationRuleResponse,
    EscalationRuleListResponse,
)


class EscalationService:
    """Service for managing escalation rules."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        data: EscalationRuleCreateRequest,
        tenant_id: UUID,
        user_id: UUID
    ) -> EscalationRule:
        """Create a new escalation rule."""
        rule = EscalationRule(
            tenant_id=tenant_id,
            category_id=data.category_id,
            escalation_level=data.escalation_level,
            time_threshold_hours=data.time_threshold_hours,
            escalate_to_position_id=data.escalate_to_position_id,
            escalate_to_role=data.escalate_to_role,
            notification_template=data.notification_template,
            is_active=data.is_active,
            created_by=user_id,
            updated_by=user_id,
        )
        self.db.add(rule)
        await self.db.commit()
        await self.db.refresh(rule)
        return rule

    async def get_by_id(
        self,
        rule_id: UUID,
        tenant_id: UUID
    ) -> Optional[EscalationRule]:
        """Get an escalation rule by ID."""
        result = await self.db.execute(
            select(EscalationRule).where(
                EscalationRule.id == rule_id,
                EscalationRule.tenant_id == tenant_id
            )
        )
        return result.scalar_one_or_none()

    async def update(
        self,
        rule: EscalationRule,
        data: EscalationRuleUpdateRequest,
        user_id: UUID
    ) -> EscalationRule:
        """Update an existing escalation rule."""
        update_data = data.model_dump(exclude_unset=True, by_alias=False)
        for field, value in update_data.items():
            setattr(rule, field, value)
        rule.updated_by = user_id
        await self.db.commit()
        await self.db.refresh(rule)
        return rule

    async def delete(
        self,
        rule: EscalationRule
    ) -> None:
        """Delete an escalation rule."""
        await self.db.delete(rule)
        await self.db.commit()

    async def list(
        self,
        tenant_id: UUID,
        page: int = 1,
        limit: int = 20,
        category_id: Optional[UUID] = None,
        is_active: Optional[bool] = None,
    ) -> EscalationRuleListResponse:
        """List escalation rules with pagination."""
        query = select(EscalationRule).where(
            EscalationRule.tenant_id == tenant_id
        )

        if category_id is not None:
            query = query.where(EscalationRule.category_id == category_id)

        if is_active is not None:
            query = query.where(EscalationRule.is_active == is_active)

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Paginate
        query = query.order_by(EscalationRule.escalation_level)
        query = query.offset((page - 1) * limit).limit(limit)

        result = await self.db.execute(query)
        rules = result.scalars().all()

        pages = (total + limit - 1) // limit if limit > 0 else 0

        return EscalationRuleListResponse(
            items=[EscalationRuleResponse.model_validate(r) for r in rules],
            total=total,
            page=page,
            limit=limit,
            pages=pages,
        )

    async def get_rules_for_escalation(
        self,
        tenant_id: UUID,
        category_id: UUID,
        current_level: int
    ) -> List[EscalationRule]:
        """
        Get escalation rules for a complaint at the next level.
        """
        # Find rules for category or default (no category) at the next level
        result = await self.db.execute(
            select(EscalationRule).where(
                EscalationRule.tenant_id == tenant_id,
                EscalationRule.is_active == True,
                EscalationRule.escalation_level > current_level,
                (
                    (EscalationRule.category_id == category_id) |
                    (EscalationRule.category_id.is_(None))
                )
            ).order_by(EscalationRule.escalation_level)
        )
        return list(result.scalars().all())

    async def get_next_escalation_target(
        self,
        tenant_id: UUID,
        category_id: UUID,
        current_level: int
    ) -> Optional[EscalationRule]:
        """
        Get the next escalation target for a complaint.
        Returns the rule for the next escalation level.
        """
        rules = await self.get_rules_for_escalation(
            tenant_id, category_id, current_level
        )

        if not rules:
            return None

        # Prefer category-specific rule, fallback to default
        category_rules = [r for r in rules if r.category_id == category_id]
        if category_rules:
            return category_rules[0]

        default_rules = [r for r in rules if r.category_id is None]
        return default_rules[0] if default_rules else None
