"""
MindFlow Expense Service - My Expenses API Routes
Per API_CONTRACT.md Section 8.6 - Employee Dashboard Endpoints
"""

from decimal import Decimal
from typing import Annotated, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.ext.asyncio import AsyncSession

from shared.dependencies import get_current_user, get_tenant_id, get_employee_id, get_db_session, CurrentUser
from shared.schemas import ApiResponse, PaginationParams, PaginationMeta

from ..schemas.expense_request import (
    ExpenseRequestResponse,
    ExpenseRequestListResponse,
    MyExpensesSummaryResponse,
)
from ..services.expense_service import ExpenseService

router = APIRouter(prefix="/me", tags=["my-expenses"])


def _build_pagination_meta(page: int, page_size: int, total: int) -> PaginationMeta:
    """Build proper pagination metadata object."""
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    return PaginationMeta(
        page=page,
        page_size=page_size,
        total_items=total,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_previous=page > 1
    )


def _request_to_response(expense_request) -> ExpenseRequestResponse:
    """Convert ExpenseRequest model to response schema."""
    items = []
    if expense_request.items:
        items = [
            {
                "id": i.id,
                "category_id": i.category_id,
                "category_name": i.category.name if i.category else "Unknown",
                "description": i.description,
                "amount": i.amount,
                "quantity": i.quantity,
                "expense_date": i.expense_date
            }
            for i in expense_request.items
        ]

    receipts = []
    if expense_request.receipts:
        receipts = [
            {
                "id": r.id,
                "file_id": r.file_id,
                "expense_item_id": r.expense_item_id,
                "uploaded_at": r.uploaded_at
            }
            for r in expense_request.receipts
        ]

    return ExpenseRequestResponse(
        id=expense_request.id,
        request_number=expense_request.request_number,
        employee_id=expense_request.employee_id,
        employee=None,
        title=expense_request.title,
        description=expense_request.description,
        expense_date=expense_request.expense_date,
        total_amount=expense_request.total_amount,
        currency=expense_request.currency,
        status=expense_request.status,
        item_count=expense_request.item_count,
        receipt_count=expense_request.receipt_count,
        items=items,
        receipts=receipts,
        submitted_at=expense_request.submitted_at,
        approved_at=expense_request.approved_at,
        rejected_at=expense_request.rejected_at,
        rejection_reason=expense_request.rejection_reason,
        paid_at=expense_request.paid_at,
        tenant_id=expense_request.tenant_id,
        created_at=expense_request.created_at,
        updated_at=expense_request.updated_at,
        created_by=expense_request.created_by
    )


@router.get("/summary", response_model=ApiResponse[MyExpensesSummaryResponse])
async def get_my_summary(
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    employee_id: UUID = Depends(get_employee_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get expense summary. Admin/Finance see all; others see own expenses."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ExpenseService(db)

    # Admin and Finance roles see tenant-wide summary
    admin_roles = {"SUPER_ADMIN", "FINANCE"}
    is_admin = bool(admin_roles & set(current_user.roles))
    # Filter by created_by (user_id) for non-admin users, None for admin (all expenses)
    created_by_filter = None if is_admin else current_user.user_id

    summary = await service.get_my_summary(created_by_filter, tenant_id)

    return ApiResponse(
        success=True,
        data=MyExpensesSummaryResponse(**summary),
        message="My expenses summary retrieved successfully",
        requestId=request_id
    )


@router.get("/requests", response_model=ApiResponse[ExpenseRequestListResponse])
async def get_my_requests(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    employee_id: UUID = Depends(get_employee_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get expense requests for the current employee."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ExpenseService(db)
    pagination = PaginationParams(
        page=page,
        page_size=page_size,
        sort_by="created_at",
        sort_order="desc"
    )

    requests, total = await service.get_my_requests(
        employee_id=employee_id,
        tenant_id=tenant_id,
        pagination=pagination,
        status=status
    )

    return ApiResponse(
        success=True,
        data=ExpenseRequestListResponse(
            items=[_request_to_response(r) for r in requests],
            pagination=_build_pagination_meta(page, page_size, total)
        ),
        message="My expense requests retrieved successfully",
        requestId=request_id
    )
