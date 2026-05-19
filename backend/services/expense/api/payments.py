"""
MindFlow Expense Service - Payment API Routes
Per API_CONTRACT.md Section 8.6.5
"""

from datetime import date
from typing import Annotated, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.ext.asyncio import AsyncSession

from shared.dependencies import get_current_user, get_tenant_id, get_db_session, require_any_permission, CurrentUser
from shared.exceptions import AuthzInsufficientPermissionException
from shared.schemas import ApiResponse, PaginationParams, PaginationMeta

from ..schemas.payment import (
    PaymentRecordCreateRequest,
    PaymentRecordResponse,
    PaymentRecordListResponse,
)
from ..services.payment_service import PaymentService

router = APIRouter(prefix="/payments", tags=["payments"])


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


def _payment_to_response(payment) -> PaymentRecordResponse:
    """Convert PaymentRecord model to response schema."""
    expense_request_info = None
    if payment.expense_request:
        expense_request_info = {
            "id": payment.expense_request.id,
            "request_number": payment.expense_request.request_number,
            "title": payment.expense_request.title,
            "total_amount": payment.expense_request.total_amount
        }

    return PaymentRecordResponse(
        id=payment.id,
        expense_request_id=payment.expense_request_id,
        expense_request=expense_request_info,
        payment_date=payment.payment_date,
        payment_mode=payment.payment_mode,
        reference_number=payment.reference_number,
        amount_paid=payment.amount_paid,
        remarks=payment.remarks,
        processed_by=payment.processed_by,
        tenant_id=payment.tenant_id,
        created_at=payment.created_at,
        updated_at=payment.updated_at
    )


@router.get("", response_model=ApiResponse[PaymentRecordListResponse])
async def list_payments(
    expense_request_id: Optional[UUID] = Query(None, alias="expenseRequestId"),
    start_date: Optional[date] = Query(None, alias="startDate"),
    end_date: Optional[date] = Query(None, alias="endDate"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """List payment records with pagination."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = PaymentService(db)
    pagination = PaginationParams(
        page=page,
        page_size=page_size,
        sort_by="payment_date",
        sort_order="desc"
    )

    payments, total = await service.list_payments(
        tenant_id=tenant_id,
        pagination=pagination,
        expense_request_id=expense_request_id,
        start_date=start_date,
        end_date=end_date
    )

    return ApiResponse(
        success=True,
        data=PaymentRecordListResponse(
            items=[_payment_to_response(p) for p in payments],
            pagination=_build_pagination_meta(page, page_size, total)
        ),
        message="Payments retrieved successfully",
        requestId=request_id
    )


@router.post("", response_model=ApiResponse[PaymentRecordResponse], status_code=201)
async def create_payment(
    request: PaymentRecordCreateRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Create a payment record. Only SUPER_ADMIN and FINANCE roles can process payments."""
    # Enforce role-based access
    allowed_roles = {"SUPER_ADMIN", "FINANCE"}
    if not (allowed_roles & set(current_user.roles)):
        raise AuthzInsufficientPermissionException(
            message="Only Super Admin and Finance can record payments"
        )

    request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = PaymentService(db)
    payment = await service.create_payment(
        expense_request_id=request.expense_request_id,
        tenant_id=tenant_id,
        payment_date=request.payment_date,
        payment_mode=request.payment_mode,
        amount_paid=request.amount_paid,
        processed_by=current_user.user_id,
        reference_number=request.reference_number,
        remarks=request.remarks
    )

    return ApiResponse(
        success=True,
        data=_payment_to_response(payment),
        message="Payment processed successfully",
        requestId=request_id
    )


@router.get("/{payment_id}", response_model=ApiResponse[PaymentRecordResponse])
async def get_payment(
    payment_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get payment by ID."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = PaymentService(db)
    payment = await service.get_payment(payment_id, tenant_id)

    return ApiResponse(
        success=True,
        data=_payment_to_response(payment),
        message="Payment retrieved successfully",
        requestId=request_id
    )
