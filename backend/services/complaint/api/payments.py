"""
MindFlow Complaint Service - Payment API Endpoints
CRUD for case-level payment records (design doc Section 5).

Route logic only (T7a) — permission gating (`require_permission`) is
added in T7b. For now this mirrors `clients.py`'s current baseline of
`Depends(get_current_user)` only.
"""

from typing import Annotated, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from shared.dependencies import get_current_user, get_tenant_id, get_db_session, CurrentUser
from shared.schemas import ApiResponse

from ..schemas.payment import (
    PaymentCreateRequest,
    PaymentUpdateRequest,
    PaymentResponse,
    PaymentListResponse,
)
from ..services.payment_service import PaymentService

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post(
    "",
    response_model=ApiResponse[PaymentResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create payment",
)
async def create_payment(
    data: PaymentCreateRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = PaymentService(db)
    payment = await service.create(data, tenant_id, current_user.user_id)
    return ApiResponse(
        success=True,
        data=PaymentResponse.model_validate(payment),
        message="Payment created successfully",
        requestId=request_id,
    )


@router.get(
    "",
    response_model=ApiResponse[PaymentListResponse],
    summary="List payments",
)
async def list_payments(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    search: Optional[str] = Query(None),
    case_status: Optional[str] = Query(None, alias="caseStatus"),
    billing_status: Optional[str] = Query(None, alias="billingStatus"),
    client_id: Optional[UUID] = Query(None, alias="clientId"),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = PaymentService(db)
    result = await service.list(
        tenant_id, page, limit, search, case_status, billing_status, client_id
    )
    return ApiResponse(
        success=True,
        data=result,
        message="Payments retrieved successfully",
        requestId=request_id,
    )


@router.get(
    "/{payment_id}",
    response_model=ApiResponse[PaymentResponse],
    summary="Get payment",
)
async def get_payment(
    payment_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = PaymentService(db)
    payment = await service.get_by_id(payment_id, tenant_id)
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    return ApiResponse(
        success=True,
        data=PaymentResponse.model_validate(payment),
        message="Payment retrieved successfully",
        requestId=request_id,
    )


@router.put(
    "/{payment_id}",
    response_model=ApiResponse[PaymentResponse],
    summary="Update payment",
)
async def update_payment(
    payment_id: UUID,
    data: PaymentUpdateRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = PaymentService(db)
    payment = await service.get_by_id(payment_id, tenant_id)
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    payment = await service.update(payment, data, current_user.user_id)
    return ApiResponse(
        success=True,
        data=PaymentResponse.model_validate(payment),
        message="Payment updated successfully",
        requestId=request_id,
    )


@router.delete(
    "/{payment_id}",
    response_model=ApiResponse[None],
    summary="Delete payment",
)
async def delete_payment(
    payment_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = PaymentService(db)
    payment = await service.get_by_id(payment_id, tenant_id)
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    await service.delete(payment)
    return ApiResponse(
        success=True,
        data=None,
        message="Payment deleted successfully",
        requestId=request_id,
    )
