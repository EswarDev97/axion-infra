"""
MindFlow HR Service - Payroll Endpoints
Per API_CONTRACT.md Section 8.2.6
"""

from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, Query

from shared.database import db_manager
from shared.dependencies import (
    CurrentUser,
    get_pagination_params,
    require_permission,
)
from shared.schemas import ApiResponse, PaginationMeta, PaginationParams

from ..schemas import (
    PayrollCreateRequest,
    PayrollUpdateRequest,
    PayrollResponse,
    PayrollListResponse,
)
from ..services import PayrollService

router = APIRouter(prefix="/payroll", tags=["payroll"])


def _mask_sensitive(value: str | None, visible_chars: int = 4) -> str | None:
    """Mask sensitive information."""
    if not value:
        return None
    if len(value) <= visible_chars:
        return "*" * len(value)
    return "*" * (len(value) - visible_chars) + value[-visible_chars:]


def _payroll_to_response(payroll) -> PayrollResponse:
    """Convert PayrollReference model to PayrollResponse schema."""
    return PayrollResponse(
        id=payroll.id,
        employeeId=payroll.employee_id,
        employeeName=payroll.employee.full_name if payroll.employee else "",
        employeeCode=payroll.employee.employee_code if payroll.employee else "",
        effectiveFrom=payroll.effective_from,
        effectiveTo=payroll.effective_to,
        baseSalary=payroll.base_salary,
        currency=payroll.currency,
        payFrequency=payroll.pay_frequency,
        bankName=payroll.bank_name,
        bankAccountMasked=_mask_sensitive(payroll.bank_account),
        taxIdMasked=_mask_sensitive(payroll.tax_id),
        isCurrent=payroll.is_current,
        tenantId=payroll.tenant_id,
        createdAt=payroll.created_at,
        updatedAt=payroll.updated_at
    )


@router.get("/references", response_model=ApiResponse[PayrollListResponse])
async def list_payroll_references(
    user: Annotated[CurrentUser, Depends(require_permission("hr:read:all"))],
    pagination: Annotated[PaginationParams, Depends(get_pagination_params)],
    employee_id: UUID | None = Query(None, alias="employeeId"),
    is_current: bool | None = Query(None, alias="isCurrent"),
    x_request_id: Annotated[str | None, Header()] = None
):
    """List payroll references."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = PayrollService(db)
        payrolls, total = await service.list_payroll_references(
            user.tenant_id, pagination, employee_id, is_current
        )

        items = [_payroll_to_response(p) for p in payrolls]
        total_pages = (total + pagination.page_size - 1) // pagination.page_size

        result = PayrollListResponse(
            items=items,
            pagination=PaginationMeta(
                page=pagination.page,
                pageSize=pagination.page_size,
                totalItems=total,
                totalPages=total_pages,
                hasNext=pagination.page < total_pages,
                hasPrevious=pagination.page > 1
            )
        )

        return ApiResponse(
            success=True,
            data=result,
            message="Payroll references retrieved successfully",
            requestId=request_id
        )


@router.post("/references", response_model=ApiResponse[PayrollResponse], status_code=201)
async def create_payroll_reference(
    body: PayrollCreateRequest,
    user: Annotated[CurrentUser, Depends(require_permission("hr:create:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Create a new payroll reference."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = PayrollService(db)
        payroll = await service.create_payroll_reference(
            tenant_id=user.tenant_id,
            employee_id=body.employee_id,
            effective_from=body.effective_from,
            base_salary=body.base_salary,
            created_by=user.user_id,
            effective_to=body.effective_to,
            currency=body.currency,
            pay_frequency=body.pay_frequency,
            bank_name=body.bank_name,
            bank_account=body.bank_account,
            tax_id=body.tax_id
        )

        return ApiResponse(
            success=True,
            data=_payroll_to_response(payroll),
            message="Payroll reference created successfully",
            requestId=request_id
        )


@router.get("/references/{payroll_id}", response_model=ApiResponse[PayrollResponse])
async def get_payroll_reference(
    payroll_id: UUID,
    user: Annotated[CurrentUser, Depends(require_permission("hr:read:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get payroll reference by ID."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = PayrollService(db)
        payroll = await service.get_payroll_reference(payroll_id, user.tenant_id)

        return ApiResponse(
            success=True,
            data=_payroll_to_response(payroll),
            message="Payroll reference retrieved successfully",
            requestId=request_id
        )


@router.put("/references/{payroll_id}", response_model=ApiResponse[PayrollResponse])
async def update_payroll_reference(
    payroll_id: UUID,
    body: PayrollUpdateRequest,
    user: Annotated[CurrentUser, Depends(require_permission("hr:update:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Update payroll reference."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = PayrollService(db)
        payroll = await service.update_payroll_reference(
            payroll_id=payroll_id,
            tenant_id=user.tenant_id,
            updated_by=user.user_id,
            effective_from=body.effective_from,
            effective_to=body.effective_to,
            base_salary=body.base_salary,
            currency=body.currency,
            pay_frequency=body.pay_frequency,
            bank_name=body.bank_name,
            bank_account=body.bank_account,
            tax_id=body.tax_id
        )

        return ApiResponse(
            success=True,
            data=_payroll_to_response(payroll),
            message="Payroll reference updated successfully",
            requestId=request_id
        )


@router.delete("/references/{payroll_id}", response_model=ApiResponse[None])
async def delete_payroll_reference(
    payroll_id: UUID,
    user: Annotated[CurrentUser, Depends(require_permission("hr:delete:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Delete payroll reference."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = PayrollService(db)
        await service.delete_payroll_reference(payroll_id, user.tenant_id)

        return ApiResponse(
            success=True,
            message="Payroll reference deleted successfully",
            requestId=request_id
        )


@router.get("/references/employee/{employee_id}/current", response_model=ApiResponse[PayrollResponse | None])
async def get_current_payroll(
    employee_id: UUID,
    user: Annotated[CurrentUser, Depends(require_permission("hr:read:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get current active payroll reference for an employee."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = PayrollService(db)
        payroll = await service.get_current_payroll(employee_id, user.tenant_id)

        return ApiResponse(
            success=True,
            data=_payroll_to_response(payroll) if payroll else None,
            message="Current payroll reference retrieved successfully",
            requestId=request_id
        )
