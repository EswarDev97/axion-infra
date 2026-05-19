"""
MindFlow HR Service - Leave Management Endpoints
Per API_CONTRACT.md Section 8.2.4
"""

from datetime import date
from typing import Annotated, List
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, Query

from shared.database import db_manager
from shared.dependencies import (
    CurrentUser,
    get_pagination_params,
    require_any_permission,
    require_permission,
    get_current_user,
)
from shared.schemas import ApiResponse, PaginationMeta, PaginationParams

from ..schemas import (
    LeaveTypeCreateRequest,
    LeaveTypeUpdateRequest,
    LeaveTypeResponse,
    LeaveTypeListResponse,
    LeaveBalanceResponse,
    LeaveBalanceListResponse,
    LeaveRequestCreateRequest,
    LeaveRequestResponse,
    LeaveRequestListResponse,
    LeaveApprovalRequest,
)
from ..services import LeaveService, EmployeeService

router = APIRouter(prefix="/leave", tags=["leave"])


def _leave_type_to_response(lt) -> LeaveTypeResponse:
    """Convert LeaveType model to LeaveTypeResponse schema."""
    return LeaveTypeResponse(
        id=lt.id,
        code=lt.code,
        name=lt.name,
        description=lt.description,
        defaultDays=lt.default_days,
        isPaid=lt.is_paid,
        requiresApproval=lt.requires_approval,
        isActive=lt.is_active,
        tenantId=lt.tenant_id,
        createdAt=lt.created_at,
        updatedAt=lt.updated_at
    )


def _leave_balance_to_response(lb) -> LeaveBalanceResponse:
    """Convert LeaveBalance model to LeaveBalanceResponse schema."""
    return LeaveBalanceResponse(
        id=lb.id,
        employeeId=lb.employee_id,
        employeeName=lb.employee.full_name if lb.employee else "",
        leaveTypeId=lb.leave_type_id,
        leaveTypeName=lb.leave_type.name if lb.leave_type else "",
        year=lb.year,
        totalDays=lb.total_days,
        usedDays=lb.used_days,
        pendingDays=lb.pending_days,
        carriedOverDays=lb.carried_over_days,
        availableDays=lb.available_days,
        tenantId=lb.tenant_id
    )


def _leave_request_to_response(lr) -> LeaveRequestResponse:
    """Convert LeaveRequest model to LeaveRequestResponse schema."""
    return LeaveRequestResponse(
        id=lr.id,
        employeeId=lr.employee_id,
        employeeName=lr.employee.full_name if lr.employee else "",
        leaveTypeId=lr.leave_type_id,
        leaveTypeName=lr.leave_type.name if lr.leave_type else "",
        startDate=lr.start_date,
        endDate=lr.end_date,
        daysRequested=lr.days_requested,
        reason=lr.reason,
        status=lr.status,
        approvedBy=lr.approved_by,
        approverName=lr.approver.full_name if lr.approver else None,
        approvedAt=lr.approved_at,
        rejectionReason=lr.rejection_reason,
        tenantId=lr.tenant_id,
        createdAt=lr.created_at,
        updatedAt=lr.updated_at
    )


# ==================== Leave Types ====================

@router.get("/types", response_model=ApiResponse[LeaveTypeListResponse])
async def list_leave_types(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends(get_pagination_params)],
    is_active: bool | None = Query(None, alias="isActive"),
    x_request_id: Annotated[str | None, Header()] = None
):
    """List all leave types. Available to all authenticated users."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = LeaveService(db)
        leave_types, total = await service.list_leave_types(
            user.tenant_id, pagination, is_active
        )

        items = [_leave_type_to_response(lt) for lt in leave_types]
        total_pages = (total + pagination.page_size - 1) // pagination.page_size

        result = LeaveTypeListResponse(
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
            message="Leave types retrieved successfully",
            requestId=request_id
        )


@router.post("/types", response_model=ApiResponse[LeaveTypeResponse], status_code=201)
async def create_leave_type(
    body: LeaveTypeCreateRequest,
    user: Annotated[CurrentUser, Depends(require_permission("hr:create:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Create a new leave type."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = LeaveService(db)
        leave_type = await service.create_leave_type(
            tenant_id=user.tenant_id,
            code=body.code,
            name=body.name,
            created_by=user.user_id,
            description=body.description,
            default_days=body.default_days,
            is_paid=body.is_paid,
            requires_approval=body.requires_approval
        )

        return ApiResponse(
            success=True,
            data=_leave_type_to_response(leave_type),
            message="Leave type created successfully",
            requestId=request_id
        )


@router.put("/types/{leave_type_id}", response_model=ApiResponse[LeaveTypeResponse])
async def update_leave_type(
    leave_type_id: UUID,
    body: LeaveTypeUpdateRequest,
    user: Annotated[CurrentUser, Depends(require_permission("hr:update:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Update leave type."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = LeaveService(db)
        leave_type = await service.update_leave_type(
            leave_type_id=leave_type_id,
            tenant_id=user.tenant_id,
            updated_by=user.user_id,
            name=body.name,
            description=body.description,
            default_days=body.default_days,
            is_paid=body.is_paid,
            requires_approval=body.requires_approval,
            is_active=body.is_active
        )

        return ApiResponse(
            success=True,
            data=_leave_type_to_response(leave_type),
            message="Leave type updated successfully",
            requestId=request_id
        )


# ==================== Leave Balances ====================

@router.get("/balances", response_model=ApiResponse[List[LeaveBalanceResponse]])
async def get_my_balances(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    year: int | None = Query(None),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get my leave balances."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        emp_service = EmployeeService(db)
        leave_service = LeaveService(db)

        # Get employee for current user
        employee = await emp_service.get_employee_by_user_id(
            user.user_id, user.tenant_id
        )

        if not employee:
            return ApiResponse(
                success=True,
                data=[],
                message="No employee record found",
                requestId=request_id
            )

        balances = await leave_service.get_employee_balances(
            employee.id, user.tenant_id, year
        )

        items = [_leave_balance_to_response(lb) for lb in balances]

        return ApiResponse(
            success=True,
            data=items,
            message="Leave balances retrieved successfully",
            requestId=request_id
        )


@router.get("/balances/{employee_id}", response_model=ApiResponse[List[LeaveBalanceResponse]])
async def get_employee_balances(
    employee_id: UUID,
    user: Annotated[CurrentUser, Depends(require_any_permission(["hr:read:all", "hr:read:subordinates"]))],
    year: int | None = Query(None),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get leave balances for an employee."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = LeaveService(db)
        balances = await service.get_employee_balances(
            employee_id, user.tenant_id, year
        )

        items = [_leave_balance_to_response(lb) for lb in balances]

        return ApiResponse(
            success=True,
            data=items,
            message="Leave balances retrieved successfully",
            requestId=request_id
        )


@router.post("/balances/{employee_id}/initialize", response_model=ApiResponse[List[LeaveBalanceResponse]])
async def initialize_balances(
    employee_id: UUID,
    user: Annotated[CurrentUser, Depends(require_permission("hr:create:all"))],
    year: int = Query(...),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Initialize leave balances for an employee for a year."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = LeaveService(db)
        balances = await service.initialize_employee_balances(
            employee_id, user.tenant_id, year
        )

        items = [_leave_balance_to_response(lb) for lb in balances]

        return ApiResponse(
            success=True,
            data=items,
            message="Leave balances initialized successfully",
            requestId=request_id
        )


# ==================== Leave Requests ====================

@router.get("/requests", response_model=ApiResponse[LeaveRequestListResponse])
async def list_leave_requests(
    user: Annotated[CurrentUser, Depends(require_any_permission(["hr:read:all", "hr:read:subordinates"]))],
    pagination: Annotated[PaginationParams, Depends(get_pagination_params)],
    employee_id: UUID | None = Query(None, alias="employeeId"),
    status: str | None = Query(None),
    start_date: date | None = Query(None, alias="startDate"),
    end_date: date | None = Query(None, alias="endDate"),
    x_request_id: Annotated[str | None, Header()] = None
):
    """List leave requests."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = LeaveService(db)
        requests, total = await service.list_leave_requests(
            user.tenant_id, pagination, employee_id, status, start_date, end_date
        )

        items = [_leave_request_to_response(lr) for lr in requests]
        total_pages = (total + pagination.page_size - 1) // pagination.page_size

        result = LeaveRequestListResponse(
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
            message="Leave requests retrieved successfully",
            requestId=request_id
        )


@router.post("/requests", response_model=ApiResponse[LeaveRequestResponse], status_code=201)
async def create_leave_request(
    body: LeaveRequestCreateRequest,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Create a new leave request."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        emp_service = EmployeeService(db)
        leave_service = LeaveService(db)

        # Determine employee_id
        employee_id = body.employee_id
        if not employee_id:
            employee = await emp_service.get_employee_by_user_id(
                user.user_id, user.tenant_id
            )
            if employee:
                employee_id = employee.id
            else:
                from shared.exceptions import BusinessRuleViolationException
                raise BusinessRuleViolationException(
                    "No employee record found for current user"
                )

        leave_request = await leave_service.create_leave_request(
            tenant_id=user.tenant_id,
            employee_id=employee_id,
            leave_type_id=body.leave_type_id,
            start_date=body.start_date,
            end_date=body.end_date,
            created_by=user.user_id,
            reason=body.reason
        )

        return ApiResponse(
            success=True,
            data=_leave_request_to_response(leave_request),
            message="Leave request created successfully",
            requestId=request_id
        )


@router.get("/requests/{request_id}", response_model=ApiResponse[LeaveRequestResponse])
async def get_leave_request(
    request_id: UUID,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get leave request by ID."""
    req_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = LeaveService(db)
        leave_request = await service.get_leave_request(request_id, user.tenant_id)

        return ApiResponse(
            success=True,
            data=_leave_request_to_response(leave_request),
            message="Leave request retrieved successfully",
            requestId=req_id
        )


@router.post("/requests/{request_id}/approve", response_model=ApiResponse[LeaveRequestResponse])
async def approve_leave_request(
    request_id: UUID,
    user: Annotated[CurrentUser, Depends(require_any_permission(["hr:approve:all", "hr:approve:subordinates"]))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Approve a leave request."""
    req_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        emp_service = EmployeeService(db)
        leave_service = LeaveService(db)

        # Get approver employee ID
        approver = await emp_service.get_employee_by_user_id(
            user.user_id, user.tenant_id
        )
        approver_id = approver.id if approver else user.user_id

        leave_request = await leave_service.approve_leave_request(
            request_id, user.tenant_id, approver_id
        )

        return ApiResponse(
            success=True,
            data=_leave_request_to_response(leave_request),
            message="Leave request approved successfully",
            requestId=req_id
        )


@router.post("/requests/{request_id}/reject", response_model=ApiResponse[LeaveRequestResponse])
async def reject_leave_request(
    request_id: UUID,
    body: LeaveApprovalRequest,
    user: Annotated[CurrentUser, Depends(require_any_permission(["hr:approve:all", "hr:approve:subordinates"]))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Reject a leave request."""
    req_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        emp_service = EmployeeService(db)
        leave_service = LeaveService(db)

        # Get approver employee ID
        approver = await emp_service.get_employee_by_user_id(
            user.user_id, user.tenant_id
        )
        approver_id = approver.id if approver else user.user_id

        leave_request = await leave_service.reject_leave_request(
            request_id, user.tenant_id, approver_id, body.rejection_reason
        )

        return ApiResponse(
            success=True,
            data=_leave_request_to_response(leave_request),
            message="Leave request rejected successfully",
            requestId=req_id
        )


@router.post("/requests/{request_id}/cancel", response_model=ApiResponse[LeaveRequestResponse])
async def cancel_leave_request(
    request_id: UUID,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Cancel a leave request."""
    req_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        leave_service = LeaveService(db)

        leave_request = await leave_service.cancel_leave_request(
            request_id, user.tenant_id, user.user_id
        )

        return ApiResponse(
            success=True,
            data=_leave_request_to_response(leave_request),
            message="Leave request cancelled successfully",
            requestId=req_id
        )
