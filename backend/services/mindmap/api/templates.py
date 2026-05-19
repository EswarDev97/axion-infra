"""
MindFlow Mind Map Service - Template API Routes
Per API_CONTRACT.md
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.dependencies import get_current_user, get_tenant_id
from ..schemas import (
    MindMapTemplateCreateRequest,
    MindMapTemplateFilters,
    MindMapTemplateListResponse,
    MindMapTemplateResponse,
    MindMapTemplateUpdateRequest,
)
from ..services import TemplateService

router = APIRouter()


@router.post(
    "",
    response_model=MindMapTemplateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a mind map template",
)
async def create_template(
    data: MindMapTemplateCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Create a new mind map template."""
    service = TemplateService(db)
    template = await service.create_template(
        tenant_id=tenant_id,
        user_id=current_user["id"],
        data=data,
    )
    return template


@router.get(
    "",
    response_model=MindMapTemplateListResponse,
    summary="List mind map templates",
)
async def list_templates(
    category: str = Query(None),
    is_system_template: bool = Query(None, alias="isSystemTemplate"),
    is_active: bool = Query(None, alias="isActive"),
    search: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """List mind map templates with filters."""
    filters = MindMapTemplateFilters(
        category=category,
        is_system_template=is_system_template,
        is_active=is_active,
        search=search,
        page=page,
        page_size=page_size,
    )

    service = TemplateService(db)
    templates, total = await service.list_templates(tenant_id, filters)

    total_pages = (total + page_size - 1) // page_size

    return MindMapTemplateListResponse(
        items=templates,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get(
    "/categories",
    response_model=List[str],
    summary="Get template categories",
)
async def get_categories(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Get distinct template categories."""
    service = TemplateService(db)
    return await service.get_categories(tenant_id)


@router.get(
    "/{template_id}",
    response_model=MindMapTemplateResponse,
    summary="Get a mind map template",
)
async def get_template(
    template_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Get a mind map template by ID."""
    service = TemplateService(db)
    template = await service.get_template(tenant_id, template_id)

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    return template


@router.put(
    "/{template_id}",
    response_model=MindMapTemplateResponse,
    summary="Update a mind map template",
)
async def update_template(
    template_id: UUID,
    data: MindMapTemplateUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Update a mind map template."""
    service = TemplateService(db)
    template = await service.update_template(
        tenant_id=tenant_id,
        template_id=template_id,
        user_id=current_user["id"],
        data=data,
    )

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    return template


@router.delete(
    "/{template_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a mind map template",
)
async def delete_template(
    template_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Delete a mind map template."""
    service = TemplateService(db)
    deleted = await service.delete_template(tenant_id, template_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )
