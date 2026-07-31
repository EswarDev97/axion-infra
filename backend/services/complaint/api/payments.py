"""
MindFlow Complaint Service - Payment API Endpoints
CRUD for case-level payment records (design doc Section 5).

Permission gating (T7b): every route is restricted via
`require_permission("payments:<action>")`. Per the approved design,
Payment Management is limited to SUPER_ADMIN (bypasses all checks) /
HR_ADMIN / MANAGER (the roles seeded with the `payments:*` permissions) —
stricter than sibling `clients.py`. `require_permission` internally
depends on `get_current_user`, so the returned value is still a
`CurrentUser`; we simply swap which dependency factory produces it.

`payments:read:own` (EMPLOYEE role): read-only access scoped to payments
where the caller is the assigned executive. list_payments/get_payment
accept either the full `payments:read` or `payments:read:own`; when the
caller only has the `:own` grant, the service layer filters by
`executive_employee_id == get_employee_id(current_user)`. Create/update/
delete remain gated on the unscoped payments:create/update/delete only —
EMPLOYEE has no write access to payment records.
"""

from datetime import date
from typing import Annotated, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from shared.dependencies import (
    CurrentUser,
    get_db_session,
    get_employee_id,
    get_tenant_id,
    require_any_permission,
    require_permission,
)
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
    current_user: CurrentUser = Depends(require_permission("payments:create")),
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
    limit: int = Query(50, ge=1, le=5000),
    search: Optional[str] = Query(None),
    case_status: Optional[str] = Query(None, alias="caseStatus"),
    billing_status: Optional[str] = Query(None, alias="billingStatus"),
    client_id: Optional[UUID] = Query(None, alias="clientId"),
    finance_id: Optional[UUID] = Query(None, alias="financeId"),
    executive_employee_id: Optional[UUID] = Query(None, alias="executiveEmployeeId"),
    date_from: Optional[date] = Query(None, alias="dateFrom"),
    date_to: Optional[date] = Query(None, alias="dateTo"),
    sort_by: Optional[str] = Query(
        None,
        alias="sortBy",
        pattern="^(caseReference|client|finance|executive|caseStatus|billingStatus|amount|createdAt)$",
    ),
    sort_order: str = Query("asc", alias="sortOrder", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(
        require_any_permission(["payments:read", "payments:read:own"])
    ),
    tenant_id: UUID = Depends(get_tenant_id),
    employee_id: UUID = Depends(get_employee_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    request_id = UUID(x_request_id) if x_request_id else uuid4()
    # Full payments:read (or SUPER_ADMIN) sees everything and may filter by
    # any Field Executive via executiveEmployeeId. payments:read:own alone
    # is scoped to payments where the caller IS the assigned executive —
    # that scoping always wins over a user-supplied executiveEmployeeId,
    # since a :read:own caller has no visibility into other executives'
    # payments regardless of what they pass.
    is_scoped_to_own = not current_user.is_super_admin() and not current_user.has_permission("payments:read")
    effective_executive_id = employee_id if is_scoped_to_own else executive_employee_id

    service = PaymentService(db)
    result = await service.list(
        tenant_id, page, limit, search, case_status, billing_status, client_id,
        executive_employee_id=effective_executive_id,
        finance_id=finance_id,
        date_from=date_from,
        date_to=date_to,
        sort_by=sort_by,
        sort_order=sort_order,
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
    current_user: CurrentUser = Depends(
        require_any_permission(["payments:read", "payments:read:own"])
    ),
    tenant_id: UUID = Depends(get_tenant_id),
    employee_id: UUID = Depends(get_employee_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = PaymentService(db)
    payment = await service.get_by_id(payment_id, tenant_id)
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    is_scoped_to_own = not current_user.is_super_admin() and not current_user.has_permission("payments:read")
    if is_scoped_to_own and str(payment.executive_employee_id) != str(employee_id):
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
    current_user: CurrentUser = Depends(require_permission("payments:update")),
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
    current_user: CurrentUser = Depends(require_permission("payments:delete")),
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
