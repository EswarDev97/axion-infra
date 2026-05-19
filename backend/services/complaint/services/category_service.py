"""
MindFlow Complaint Service - Category Service
Business logic for complaint category management.
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from shared.schemas import PaginationMeta

from ..models.category import ComplaintCategory
from ..schemas.category import (
    CategoryCreateRequest,
    CategoryUpdateRequest,
    CategoryResponse,
    CategoryListResponse,
)


class CategoryService:
    """Service for managing complaint categories."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        data: CategoryCreateRequest,
        tenant_id: UUID,
        user_id: UUID
    ) -> ComplaintCategory:
        """Create a new complaint category."""
        category = ComplaintCategory(
            tenant_id=tenant_id,
            name=data.name,
            code=data.code,
            description=data.description,
            parent_category_id=data.parent_category_id,
            is_active=data.is_active,
            created_by=user_id,
            updated_by=user_id,
        )
        self.db.add(category)
        await self.db.commit()
        await self.db.refresh(category)
        return category

    async def get_by_id(
        self,
        category_id: UUID,
        tenant_id: UUID
    ) -> Optional[ComplaintCategory]:
        """Get a category by ID."""
        result = await self.db.execute(
            select(ComplaintCategory).where(
                ComplaintCategory.id == category_id,
                ComplaintCategory.tenant_id == tenant_id
            )
        )
        return result.scalar_one_or_none()

    async def update(
        self,
        category: ComplaintCategory,
        data: CategoryUpdateRequest,
        user_id: UUID
    ) -> ComplaintCategory:
        """Update an existing category."""
        update_data = data.model_dump(exclude_unset=True, by_alias=False)
        for field, value in update_data.items():
            setattr(category, field, value)
        category.updated_by = user_id
        await self.db.commit()
        await self.db.refresh(category)
        return category

    async def delete(
        self,
        category: ComplaintCategory
    ) -> None:
        """Delete a category (hard delete - only if no complaints exist)."""
        await self.db.delete(category)
        await self.db.commit()

    async def list(
        self,
        tenant_id: UUID,
        page: int = 1,
        limit: int = 20,
        is_active: Optional[bool] = None,
        parent_category_id: Optional[UUID] = None,
    ) -> CategoryListResponse:
        """List categories with pagination."""
        query = select(ComplaintCategory).where(
            ComplaintCategory.tenant_id == tenant_id
        )

        if is_active is not None:
            query = query.where(ComplaintCategory.is_active == is_active)

        if parent_category_id is not None:
            query = query.where(ComplaintCategory.parent_category_id == parent_category_id)
        elif parent_category_id is None:
            # Return top-level categories by default
            query = query.where(ComplaintCategory.parent_category_id.is_(None))

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Paginate
        query = query.order_by(ComplaintCategory.name)
        query = query.offset((page - 1) * limit).limit(limit)

        result = await self.db.execute(query)
        categories = result.scalars().all()

        total_pages = (total + limit - 1) // limit if limit > 0 else 0

        return CategoryListResponse(
            items=[CategoryResponse.model_validate(c) for c in categories],
            pagination=PaginationMeta(
                page=page,
                pageSize=limit,
                totalItems=total,
                totalPages=total_pages,
                hasNext=page < total_pages,
                hasPrevious=page > 1
            )
        )

    async def get_all_active(
        self,
        tenant_id: UUID
    ) -> List[ComplaintCategory]:
        """Get all active categories (for dropdowns)."""
        result = await self.db.execute(
            select(ComplaintCategory).where(
                ComplaintCategory.tenant_id == tenant_id,
                ComplaintCategory.is_active == True
            ).order_by(ComplaintCategory.name)
        )
        return list(result.scalars().all())

    async def has_complaints(
        self,
        category_id: UUID,
        tenant_id: UUID
    ) -> bool:
        """Check if category has any complaints."""
        from ..models.complaint import Complaint

        result = await self.db.execute(
            select(func.count()).select_from(Complaint).where(
                Complaint.category_id == category_id,
                Complaint.tenant_id == tenant_id,
                Complaint.is_deleted == False
            )
        )
        count = result.scalar() or 0
        return count > 0
