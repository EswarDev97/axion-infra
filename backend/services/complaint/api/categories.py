"""
MindFlow Complaint Service - Category API Endpoints
Per API_CONTRACT.md Section 8.7.4
"""

from typing import Annotated, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from shared.dependencies import get_current_user, get_tenant_id, get_db_session, CurrentUser
from shared.schemas import ApiResponse

from ..schemas.category import (
    CategoryCreateRequest,
    CategoryUpdateRequest,
    CategoryResponse,
    CategoryListResponse,
)
from ..services.category_service import CategoryService

router = APIRouter(prefix="/categories", tags=["complaint-categories"])


@router.post(
    "",
    response_model=ApiResponse[CategoryResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create complaint category",
)
async def create_category(
    data: CategoryCreateRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Create a new complaint category. Requires SYSTEM_ADMIN role."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = CategoryService(db)
    category = await service.create(data, tenant_id, current_user.user_id)

    return ApiResponse(
        success=True,
        data=CategoryResponse.model_validate(category),
        message="Category created successfully",
        requestId=request_id
    )


@router.get(
    "",
    response_model=ApiResponse[CategoryListResponse],
    summary="List complaint categories",
)
async def list_categories(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    is_active: Optional[bool] = Query(None, alias="isActive"),
    parent_category_id: Optional[UUID] = Query(None, alias="parentCategoryId"),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """List complaint categories with pagination."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = CategoryService(db)
    result = await service.list(
        tenant_id,
        page=page,
        limit=limit,
        is_active=is_active,
        parent_category_id=parent_category_id,
    )

    return ApiResponse(
        success=True,
        data=result,
        message="Categories retrieved successfully",
        requestId=request_id
    )


@router.get(
    "/{category_id}",
    response_model=ApiResponse[CategoryResponse],
    summary="Get complaint category",
)
async def get_category(
    category_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Get a complaint category by ID."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = CategoryService(db)
    category = await service.get_by_id(category_id, tenant_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    return ApiResponse(
        success=True,
        data=CategoryResponse.model_validate(category),
        message="Category retrieved successfully",
        requestId=request_id
    )


@router.put(
    "/{category_id}",
    response_model=ApiResponse[CategoryResponse],
    summary="Update complaint category",
)
async def update_category(
    category_id: UUID,
    data: CategoryUpdateRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Update a complaint category. Requires SYSTEM_ADMIN role."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = CategoryService(db)
    category = await service.get_by_id(category_id, tenant_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    category = await service.update(category, data, current_user.user_id)

    return ApiResponse(
        success=True,
        data=CategoryResponse.model_validate(category),
        message="Category updated successfully",
        requestId=request_id
    )


@router.delete(
    "/{category_id}",
    response_model=ApiResponse[None],
    status_code=status.HTTP_200_OK,
    summary="Delete complaint category",
)
async def delete_category(
    category_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Delete a complaint category. Requires SYSTEM_ADMIN role."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = CategoryService(db)
    category = await service.get_by_id(category_id, tenant_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    # Check if category has complaints
    has_complaints = await service.has_complaints(category_id, tenant_id)
    if has_complaints:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete category with existing complaints"
        )

    await service.delete(category)

    return ApiResponse(
        success=True,
        data=None,
        message="Category deleted successfully",
        requestId=request_id
    )
