"""
MindFlow Expense Service - Category API Routes
Per API_CONTRACT.md Section 8.6.4
"""

from typing import Annotated, List, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.ext.asyncio import AsyncSession

from shared.dependencies import get_current_user, get_db_session, get_tenant_id, CurrentUser
from shared.schemas import ApiResponse

from ..schemas.category import (
    ExpenseCategoryResponse,
    ExpenseCategoryCreateRequest,
    ExpenseCategoryUpdateRequest,
)
from ..services.expense_service import ExpenseService

router = APIRouter(prefix="/categories", tags=["categories"])


def _category_to_response(category) -> ExpenseCategoryResponse:
    """Convert ExpenseCategory model to response schema."""
    return ExpenseCategoryResponse(
        id=category.id,
        name=category.name,
        code=category.code,
        description=category.description,
        max_amount=category.max_amount,
        requires_receipt=category.requires_receipt,
        is_active=category.is_active,
        tenant_id=category.tenant_id,
        created_at=category.created_at,
        updated_at=category.updated_at
    )


@router.get("", response_model=ApiResponse[List[ExpenseCategoryResponse]])
async def list_categories(
    active_only: bool = Query(True, alias="activeOnly"),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """List expense categories."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ExpenseService(db)
    categories = await service.list_categories(tenant_id, active_only=active_only)

    return ApiResponse(
        success=True,
        data=[_category_to_response(c) for c in categories],
        message="Categories retrieved successfully",
        requestId=request_id
    )


@router.get("/{category_id}", response_model=ApiResponse[ExpenseCategoryResponse])
async def get_category(
    category_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get expense category by ID."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ExpenseService(db)
    category = await service.get_category(category_id, tenant_id)

    return ApiResponse(
        success=True,
        data=_category_to_response(category),
        message="Category retrieved successfully",
        requestId=request_id
    )


@router.post("", response_model=ApiResponse[ExpenseCategoryResponse], status_code=201)
async def create_category(
    request: ExpenseCategoryCreateRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Create expense category (FINANCE_ADMIN only)."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ExpenseService(db)
    category = await service.create_category(
        tenant_id=tenant_id,
        name=request.name,
        code=request.code,
        description=request.description,
        max_amount=request.max_amount,
        requires_receipt=request.requires_receipt,
        created_by=current_user.user_id
    )

    return ApiResponse(
        success=True,
        data=_category_to_response(category),
        message="Category created successfully",
        requestId=request_id
    )


@router.put("/{category_id}", response_model=ApiResponse[ExpenseCategoryResponse])
async def update_category(
    category_id: UUID,
    request: ExpenseCategoryUpdateRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Update expense category (FINANCE_ADMIN only)."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ExpenseService(db)
    category = await service.update_category(
        category_id=category_id,
        tenant_id=tenant_id,
        updated_by=current_user.user_id,
        name=request.name,
        code=request.code,
        description=request.description,
        max_amount=request.max_amount,
        requires_receipt=request.requires_receipt,
        is_active=request.is_active
    )

    return ApiResponse(
        success=True,
        data=_category_to_response(category),
        message="Category updated successfully",
        requestId=request_id
    )


@router.delete("/{category_id}", response_model=ApiResponse)
async def delete_category(
    category_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Delete expense category (FINANCE_ADMIN only)."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ExpenseService(db)
    await service.delete_category(
        category_id=category_id,
        tenant_id=tenant_id
    )

    return ApiResponse(
        success=True,
        data=None,
        message="Category deleted successfully",
        requestId=request_id
    )
