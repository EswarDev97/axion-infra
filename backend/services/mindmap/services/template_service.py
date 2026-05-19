"""
MindFlow Mind Map Service - Template Service
Business logic for mind map templates.
"""

from datetime import datetime
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models import MindMapTemplate
from ..schemas import (
    MindMapTemplateCreateRequest,
    MindMapTemplateFilters,
    MindMapTemplateUpdateRequest,
)


class TemplateService:
    """Service for mind map template operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_template(
        self,
        tenant_id: UUID,
        user_id: UUID,
        data: MindMapTemplateCreateRequest,
    ) -> MindMapTemplate:
        """Create a new mind map template."""
        template = MindMapTemplate(
            tenant_id=tenant_id,
            name=data.name,
            description=data.description,
            category=data.category,
            thumbnail_url=data.thumbnail_url,
            template_data=data.template_data,
            is_system_template=data.is_system_template,
            is_active=True,
            created_by=user_id,
            updated_by=user_id,
        )

        self.db.add(template)
        await self.db.commit()

        # Re-fetch to avoid lazy loading issues
        stmt = select(MindMapTemplate).where(MindMapTemplate.id == template.id)
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def get_template(
        self,
        tenant_id: UUID,
        template_id: UUID,
    ) -> Optional[MindMapTemplate]:
        """Get a template by ID."""
        query = select(MindMapTemplate).where(
            and_(
                MindMapTemplate.id == template_id,
                MindMapTemplate.tenant_id == tenant_id,
            )
        )

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_templates(
        self,
        tenant_id: UUID,
        filters: MindMapTemplateFilters,
    ) -> Tuple[List[MindMapTemplate], int]:
        """List templates with filters."""
        query = select(MindMapTemplate).where(
            MindMapTemplate.tenant_id == tenant_id
        )

        # Apply filters
        if filters.category:
            query = query.where(MindMapTemplate.category == filters.category)

        if filters.is_system_template is not None:
            query = query.where(
                MindMapTemplate.is_system_template == filters.is_system_template
            )

        if filters.is_active is not None:
            query = query.where(MindMapTemplate.is_active == filters.is_active)

        if filters.search:
            search_term = f"%{filters.search}%"
            query = query.where(
                or_(
                    MindMapTemplate.name.ilike(search_term),
                    MindMapTemplate.description.ilike(search_term),
                )
            )

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply pagination
        offset = (filters.page - 1) * filters.page_size
        query = query.order_by(MindMapTemplate.name).offset(offset).limit(filters.page_size)

        result = await self.db.execute(query)
        templates = list(result.scalars().all())

        return templates, total

    async def update_template(
        self,
        tenant_id: UUID,
        template_id: UUID,
        user_id: UUID,
        data: MindMapTemplateUpdateRequest,
    ) -> Optional[MindMapTemplate]:
        """Update a template."""
        template = await self.get_template(tenant_id, template_id)
        if not template:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(template, field, value)

        template.updated_by = user_id
        template.updated_at = datetime.utcnow()

        await self.db.commit()

        # Re-fetch to avoid lazy loading issues
        stmt = select(MindMapTemplate).where(MindMapTemplate.id == template.id)
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def delete_template(
        self,
        tenant_id: UUID,
        template_id: UUID,
    ) -> bool:
        """Delete a template (hard delete)."""
        template = await self.get_template(tenant_id, template_id)
        if not template:
            return False

        await self.db.delete(template)
        await self.db.commit()

        return True

    async def get_categories(
        self,
        tenant_id: UUID,
    ) -> List[str]:
        """Get distinct template categories."""
        query = (
            select(MindMapTemplate.category)
            .where(
                and_(
                    MindMapTemplate.tenant_id == tenant_id,
                    MindMapTemplate.category.isnot(None),
                    MindMapTemplate.is_active == True,
                )
            )
            .distinct()
        )

        result = await self.db.execute(query)
        categories = [row[0] for row in result.all() if row[0]]

        return sorted(categories)
