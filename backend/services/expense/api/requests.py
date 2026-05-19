"""
MindFlow Expense Service - Request API Routes
Per API_CONTRACT.md Section 8.6.1, 8.6.2, 8.6.3
"""

from datetime import date
from decimal import Decimal
from typing import Annotated, List, Optional
from uuid import UUID, uuid4

import logging

from fastapi import APIRouter, Depends, Header, Query, Request, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from shared.dependencies import get_current_user, get_tenant_id, get_employee_id, get_db_session, CurrentUser
from shared.exceptions import AuthzInsufficientPermissionException
from shared.schemas import ApiResponse, PaginationParams, PaginationMeta

# Roles that can see all expenses and manage payments
ADMIN_ROLES = {"SUPER_ADMIN", "FINANCE"}


def _is_admin(user: CurrentUser) -> bool:
    """Check if user has admin/finance role for full expense visibility."""
    return bool(ADMIN_ROLES & set(user.roles))


def _check_ownership(user: CurrentUser, expense_request) -> None:
    """Raise 403 if non-admin user doesn't own the expense."""
    if _is_admin(user):
        return
    if expense_request.created_by != user.user_id:
        raise AuthzInsufficientPermissionException(
            message="You are not authorized to access this expense."
        )

from ..schemas.expense_request import (
    ExpenseRequestCreateRequest,
    ExpenseRequestUpdateRequest,
    ExpenseRequestResponse,
    ExpenseRequestListResponse,
    ExpenseRequestFilters,
    MyExpensesSummaryResponse,
)
from ..schemas.expense_item import (
    ExpenseItemCreateRequest,
    ExpenseItemUpdateRequest,
    ExpenseItemResponse,
)
from ..schemas.receipt import (
    ReceiptUploadRequest,
    ReceiptResponse,
)
from ..services.expense_service import ExpenseService
from ..services.integration_service import ExpenseIntegrationService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/requests", tags=["requests"])


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
        employee=None,  # Would need employee lookup
        title=expense_request.title,
        description=expense_request.description,
        expense_date=expense_request.expense_date,
        due_date=expense_request.due_date,
        collected_by=expense_request.collected_by,
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


def _item_to_response(item) -> ExpenseItemResponse:
    """Convert ExpenseItem model to response schema."""
    category_info = None
    if item.category:
        category_info = {
            "id": item.category.id,
            "name": item.category.name,
            "code": item.category.code,
            "requires_receipt": item.category.requires_receipt
        }

    return ExpenseItemResponse(
        id=item.id,
        expense_request_id=item.expense_request_id,
        category_id=item.category_id,
        category=category_info,
        description=item.description,
        amount=item.amount,
        quantity=item.quantity,
        unit_price=item.unit_price,
        expense_date=item.expense_date,
        tenant_id=item.tenant_id,
        created_at=item.created_at,
        updated_at=item.updated_at,
        created_by=item.created_by
    )


def _receipt_to_response(receipt) -> ReceiptResponse:
    """Convert ExpenseReceipt model to response schema."""
    return ReceiptResponse(
        id=receipt.id,
        expense_request_id=receipt.expense_request_id,
        expense_item_id=receipt.expense_item_id,
        file_id=receipt.file_id,
        uploaded_at=receipt.uploaded_at,
        uploaded_by=receipt.uploaded_by,
        tenant_id=receipt.tenant_id,
        created_at=receipt.created_at
    )


@router.get("", response_model=ApiResponse[ExpenseRequestListResponse])
async def list_requests(
    employee_id: Optional[UUID] = Query(None, alias="employeeId"),
    status: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None, alias="startDate"),
    end_date: Optional[date] = Query(None, alias="endDate"),
    due_start_date: Optional[date] = Query(None, alias="dueStartDate"),
    due_end_date: Optional[date] = Query(None, alias="dueEndDate"),
    min_amount: Optional[Decimal] = Query(None, alias="minAmount"),
    max_amount: Optional[Decimal] = Query(None, alias="maxAmount"),
    collected_by: Optional[str] = Query(None, alias="collectedBy"),
    category_id: Optional[UUID] = Query(None, alias="categoryId"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
    sort_by: str = Query("created_at", alias="sortBy"),
    sort_order: str = Query("desc", alias="sortOrder"),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """List expense requests with pagination and filters. Non-admin users see only their own."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ExpenseService(db)
    pagination = PaginationParams(
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order
    )
    filters = ExpenseRequestFilters(
        employee_id=employee_id,
        status=status,
        start_date=start_date,
        end_date=end_date,
        due_start_date=due_start_date,
        due_end_date=due_end_date,
        min_amount=min_amount,
        max_amount=max_amount,
        collected_by=collected_by,
        category_id=category_id
    )

    # Non-admin users can only see their own expenses
    created_by_filter = None if _is_admin(current_user) else current_user.user_id

    requests, total = await service.list_requests(tenant_id, pagination, filters, created_by=created_by_filter)

    return ApiResponse(
        success=True,
        data=ExpenseRequestListResponse(
            items=[_request_to_response(r) for r in requests],
            pagination=_build_pagination_meta(page, page_size, total)
        ),
        message="Expense requests retrieved successfully",
        requestId=request_id
    )


@router.post("", response_model=ApiResponse[ExpenseRequestResponse], status_code=201)
async def create_request(
    request: ExpenseRequestCreateRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    employee_id: UUID = Depends(get_employee_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Create a new expense request with optional initial expense item."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ExpenseService(db)
    expense_request = await service.create_request(
        tenant_id=tenant_id,
        employee_id=employee_id,
        title=request.title,
        expense_date=request.expense_date,
        created_by=current_user.user_id,
        description=request.description,
        due_date=request.due_date,
        category_id=request.category_id,
        collected_by=request.collected_by,
        amount=request.amount,
        currency=request.currency
    )

    return ApiResponse(
        success=True,
        data=_request_to_response(expense_request),
        message="Expense request created",
        requestId=request_id
    )


@router.get("/my-requests", response_model=ApiResponse[ExpenseRequestListResponse])
async def get_my_requests(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    employee_id: UUID = Depends(get_employee_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get my expense requests."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ExpenseService(db)
    pagination = PaginationParams(
        page=page,
        page_size=page_size,
        sort_by="created_at",
        sort_order="desc"
    )

    requests, total = await service.get_my_requests(employee_id, tenant_id, pagination)

    return ApiResponse(
        success=True,
        data=ExpenseRequestListResponse(
            items=[_request_to_response(r) for r in requests],
            pagination=_build_pagination_meta(page, page_size, total)
        ),
        message="My expense requests retrieved successfully",
        requestId=request_id
    )


@router.get("/pending-approval", response_model=ApiResponse[ExpenseRequestListResponse])
async def get_pending_approval(
    approval_level: str = Query("MANAGER", alias="approvalLevel"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get requests pending my approval."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ExpenseService(db)
    pagination = PaginationParams(
        page=page,
        page_size=page_size,
        sort_by="submitted_at",
        sort_order="asc"
    )

    requests, total = await service.get_pending_approval(tenant_id, pagination, approval_level)

    return ApiResponse(
        success=True,
        data=ExpenseRequestListResponse(
            items=[_request_to_response(r) for r in requests],
            pagination=_build_pagination_meta(page, page_size, total)
        ),
        message="Pending approval requests retrieved successfully",
        requestId=request_id
    )


@router.get("/{request_id}", response_model=ApiResponse[ExpenseRequestResponse])
async def get_request(
    request_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get expense request by ID. Non-admin users can only view their own."""
    api_request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ExpenseService(db)
    expense_request = await service.get_request(request_id, tenant_id)
    _check_ownership(current_user, expense_request)

    return ApiResponse(
        success=True,
        data=_request_to_response(expense_request),
        message="Expense request retrieved successfully",
        requestId=api_request_id
    )


@router.put("/{request_id}", response_model=ApiResponse[ExpenseRequestResponse])
async def update_request(
    request_id: UUID,
    request: ExpenseRequestUpdateRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Update expense request. Non-admin users can only edit their own."""
    api_request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ExpenseService(db)

    # Check ownership before allowing update
    existing = await service.get_request(request_id, tenant_id)
    _check_ownership(current_user, existing)

    expense_request = await service.update_request(
        request_id=request_id,
        tenant_id=tenant_id,
        updated_by=current_user.user_id,
        title=request.title,
        description=request.description,
        expense_date=request.expense_date,
        due_date=request.due_date,
        collected_by=request.collected_by,
        category_id=request.category_id,
        amount=request.amount,
        currency=request.currency
    )

    return ApiResponse(
        success=True,
        data=_request_to_response(expense_request),
        message="Expense request updated successfully",
        requestId=api_request_id
    )


@router.delete("/{request_id}", response_model=ApiResponse)
async def delete_request(
    request_id: UUID,
    reason: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Delete expense request (soft delete). Non-admin users can only delete their own."""
    api_request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ExpenseService(db)

    # Check ownership before allowing delete
    existing = await service.get_request(request_id, tenant_id)
    _check_ownership(current_user, existing)

    await service.delete_request(
        request_id=request_id,
        tenant_id=tenant_id,
        deleted_by=current_user.user_id,
        reason=reason
    )

    return ApiResponse(
        success=True,
        data=None,
        message="Expense request deleted successfully",
        requestId=api_request_id
    )


@router.post("/{request_id}/submit", response_model=ApiResponse[ExpenseRequestResponse])
async def submit_request(
    request_id: UUID,
    http_request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Submit expense request for approval. Only the creator can submit."""
    api_request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ExpenseService(db)

    # Only the owner (or admin) can submit
    existing = await service.get_request(request_id, tenant_id)
    _check_ownership(current_user, existing)

    expense_request = await service.submit_request(
        request_id=request_id,
        tenant_id=tenant_id,
        submitted_by=current_user.user_id
    )

    # Trigger approval workflow in background
    auth_header = http_request.headers.get("Authorization", "")
    auth_token = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else None

    if auth_token:
        # Run integration in background to not block the response
        async def trigger_approval():
            try:
                await ExpenseIntegrationService.on_expense_submitted(
                    tenant_id=tenant_id,
                    auth_token=auth_token,
                    expense_id=expense_request.id,
                    expense_title=expense_request.title,
                    total_amount=f"{expense_request.currency} {expense_request.total_amount}",
                    submitter_id=current_user.user_id,
                    submitter_name=current_user.email,
                    manager_id=None,
                )
            except Exception as e:
                logger.error(f"Failed to trigger approval workflow: {e}")

        background_tasks.add_task(trigger_approval)

    return ApiResponse(
        success=True,
        data=_request_to_response(expense_request),
        message="Expense request submitted for approval",
        requestId=api_request_id
    )


@router.post("/{request_id}/approve", response_model=ApiResponse[ExpenseRequestResponse])
async def approve_request(
    request_id: UUID,
    background_tasks: BackgroundTasks,
    approval_level: str = Query("MANAGER", alias="approvalLevel"),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Approve expense request."""
    api_request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ExpenseService(db)
    expense_request = await service.approve_request(
        request_id=request_id,
        tenant_id=tenant_id,
        approved_by=current_user.user_id,
        approval_level=approval_level
    )

    # Notify requester in background
    async def notify_approval():
        try:
            await ExpenseIntegrationService.on_expense_approved(
                tenant_id=tenant_id,
                expense_id=expense_request.id,
                expense_title=expense_request.title,
                requester_id=expense_request.employee_id,
                approver_name=current_user.email,
            )
        except Exception as e:
            logger.error(f"Failed to send approval notification: {e}")

    background_tasks.add_task(notify_approval)

    return ApiResponse(
        success=True,
        data=_request_to_response(expense_request),
        message="Expense request approved",
        requestId=api_request_id
    )


@router.post("/{request_id}/reject", response_model=ApiResponse[ExpenseRequestResponse])
async def reject_request(
    request_id: UUID,
    background_tasks: BackgroundTasks,
    reason: str = Query(...),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Reject expense request."""
    api_request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ExpenseService(db)
    expense_request = await service.reject_request(
        request_id=request_id,
        tenant_id=tenant_id,
        rejected_by=current_user.user_id,
        reason=reason
    )

    # Notify requester in background
    async def notify_rejection():
        try:
            await ExpenseIntegrationService.on_expense_rejected(
                tenant_id=tenant_id,
                expense_id=expense_request.id,
                expense_title=expense_request.title,
                requester_id=expense_request.employee_id,
                approver_name=current_user.email,
                reason=reason,
            )
        except Exception as e:
            logger.error(f"Failed to send rejection notification: {e}")

    background_tasks.add_task(notify_rejection)

    return ApiResponse(
        success=True,
        data=_request_to_response(expense_request),
        message="Expense request rejected",
        requestId=api_request_id
    )


# ==================== Additional Approval Endpoints (Frontend Compatibility) ====================

@router.post("/{request_id}/manager-approve", response_model=ApiResponse[ExpenseRequestResponse])
async def manager_approve_request(
    request_id: UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Manager approve expense request."""
    api_request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ExpenseService(db)
    expense_request = await service.approve_request(
        request_id=request_id,
        tenant_id=tenant_id,
        approved_by=current_user.user_id,
        approval_level="MANAGER"
    )

    async def notify_approval():
        try:
            await ExpenseIntegrationService.on_expense_approved(
                tenant_id=tenant_id,
                expense_id=expense_request.id,
                expense_title=expense_request.title,
                requester_id=expense_request.employee_id,
                approver_name=current_user.email,
            )
        except Exception as e:
            logger.error(f"Failed to send approval notification: {e}")

    background_tasks.add_task(notify_approval)

    return ApiResponse(
        success=True,
        data=_request_to_response(expense_request),
        message="Expense request approved by manager",
        requestId=api_request_id
    )


@router.post("/{request_id}/manager-reject", response_model=ApiResponse[ExpenseRequestResponse])
async def manager_reject_request(
    request_id: UUID,
    background_tasks: BackgroundTasks,
    reason: str = Query(...),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Manager reject expense request."""
    api_request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ExpenseService(db)
    expense_request = await service.reject_request(
        request_id=request_id,
        tenant_id=tenant_id,
        rejected_by=current_user.user_id,
        reason=reason
    )

    async def notify_rejection():
        try:
            await ExpenseIntegrationService.on_expense_rejected(
                tenant_id=tenant_id,
                expense_id=expense_request.id,
                expense_title=expense_request.title,
                requester_id=expense_request.employee_id,
                approver_name=current_user.email,
                reason=reason,
            )
        except Exception as e:
            logger.error(f"Failed to send rejection notification: {e}")

    background_tasks.add_task(notify_rejection)

    return ApiResponse(
        success=True,
        data=_request_to_response(expense_request),
        message="Expense request rejected by manager",
        requestId=api_request_id
    )


@router.post("/{request_id}/finance-approve", response_model=ApiResponse[ExpenseRequestResponse])
async def finance_approve_request(
    request_id: UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Finance approve expense request."""
    api_request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ExpenseService(db)
    expense_request = await service.approve_request(
        request_id=request_id,
        tenant_id=tenant_id,
        approved_by=current_user.user_id,
        approval_level="FINANCE"
    )

    async def notify_approval():
        try:
            await ExpenseIntegrationService.on_expense_approved(
                tenant_id=tenant_id,
                expense_id=expense_request.id,
                expense_title=expense_request.title,
                requester_id=expense_request.employee_id,
                approver_name=current_user.email,
            )
        except Exception as e:
            logger.error(f"Failed to send approval notification: {e}")

    background_tasks.add_task(notify_approval)

    return ApiResponse(
        success=True,
        data=_request_to_response(expense_request),
        message="Expense request approved by finance",
        requestId=api_request_id
    )


@router.post("/{request_id}/finance-reject", response_model=ApiResponse[ExpenseRequestResponse])
async def finance_reject_request(
    request_id: UUID,
    background_tasks: BackgroundTasks,
    reason: str = Query(...),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Finance reject expense request."""
    api_request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ExpenseService(db)
    expense_request = await service.reject_request(
        request_id=request_id,
        tenant_id=tenant_id,
        rejected_by=current_user.user_id,
        reason=reason
    )

    async def notify_rejection():
        try:
            await ExpenseIntegrationService.on_expense_rejected(
                tenant_id=tenant_id,
                expense_id=expense_request.id,
                expense_title=expense_request.title,
                requester_id=expense_request.employee_id,
                approver_name=current_user.email,
                reason=reason,
            )
        except Exception as e:
            logger.error(f"Failed to send rejection notification: {e}")

    background_tasks.add_task(notify_rejection)

    return ApiResponse(
        success=True,
        data=_request_to_response(expense_request),
        message="Expense request rejected by finance",
        requestId=api_request_id
    )


@router.post("/{request_id}/cancel", response_model=ApiResponse[ExpenseRequestResponse])
async def cancel_request(
    request_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Cancel expense request."""
    api_request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ExpenseService(db)
    expense_request = await service.cancel_request(
        request_id=request_id,
        tenant_id=tenant_id,
        cancelled_by=current_user.user_id
    )

    return ApiResponse(
        success=True,
        data=_request_to_response(expense_request),
        message="Expense request cancelled",
        requestId=api_request_id
    )


# ==================== Pending Approval Endpoints (Frontend Compatibility) ====================

@router.get("/pending/manager", response_model=ApiResponse[ExpenseRequestListResponse])
async def get_pending_manager_approval(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get requests pending manager approval."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ExpenseService(db)
    pagination = PaginationParams(
        page=page,
        page_size=page_size,
        sort_by="submitted_at",
        sort_order="asc"
    )

    requests, total = await service.get_pending_approval(tenant_id, pagination, "MANAGER")

    return ApiResponse(
        success=True,
        data=ExpenseRequestListResponse(
            items=[_request_to_response(r) for r in requests],
            pagination=_build_pagination_meta(page, page_size, total)
        ),
        message="Pending manager approval requests retrieved successfully",
        requestId=request_id
    )


@router.get("/pending/finance", response_model=ApiResponse[ExpenseRequestListResponse])
async def get_pending_finance_approval(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get requests pending finance approval."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ExpenseService(db)
    pagination = PaginationParams(
        page=page,
        page_size=page_size,
        sort_by="submitted_at",
        sort_order="asc"
    )

    requests, total = await service.get_pending_approval(tenant_id, pagination, "FINANCE")

    return ApiResponse(
        success=True,
        data=ExpenseRequestListResponse(
            items=[_request_to_response(r) for r in requests],
            pagination=_build_pagination_meta(page, page_size, total)
        ),
        message="Pending finance approval requests retrieved successfully",
        requestId=request_id
    )


@router.get("/pending/payment", response_model=ApiResponse[ExpenseRequestListResponse])
async def get_pending_payment(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get requests pending payment."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ExpenseService(db)
    pagination = PaginationParams(
        page=page,
        page_size=page_size,
        sort_by="approved_at",
        sort_order="asc"
    )

    requests, total = await service.get_pending_payment(tenant_id, pagination)

    return ApiResponse(
        success=True,
        data=ExpenseRequestListResponse(
            items=[_request_to_response(r) for r in requests],
            pagination=_build_pagination_meta(page, page_size, total)
        ),
        message="Pending payment requests retrieved successfully",
        requestId=request_id
    )


# ==================== Item Endpoints ====================

@router.get("/{request_id}/items", response_model=ApiResponse[List[ExpenseItemResponse]])
async def list_items(
    request_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """List items for an expense request."""
    api_request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ExpenseService(db)

    existing = await service.get_request(request_id, tenant_id)
    _check_ownership(current_user, existing)

    items = await service.get_items(request_id, tenant_id)

    return ApiResponse(
        success=True,
        data=[_item_to_response(i) for i in items],
        message="Items retrieved successfully",
        requestId=api_request_id
    )


@router.post("/{request_id}/items", response_model=ApiResponse[ExpenseItemResponse], status_code=201)
async def add_item(
    request_id: UUID,
    item_request: ExpenseItemCreateRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Add item to expense request. Only the creator can add items."""
    api_request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ExpenseService(db)

    existing = await service.get_request(request_id, tenant_id)
    _check_ownership(current_user, existing)

    item = await service.add_item(
        request_id=request_id,
        tenant_id=tenant_id,
        category_id=item_request.category_id,
        description=item_request.description,
        amount=item_request.amount,
        expense_date=item_request.expense_date,
        created_by=current_user.user_id,
        quantity=item_request.quantity,
        unit_price=item_request.unit_price
    )

    return ApiResponse(
        success=True,
        data=_item_to_response(item),
        message="Expense item added",
        requestId=api_request_id
    )


@router.put("/{request_id}/items/{item_id}", response_model=ApiResponse[ExpenseItemResponse])
async def update_item(
    request_id: UUID,
    item_id: UUID,
    item_request: ExpenseItemUpdateRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Update expense item. Only the creator can update items."""
    api_request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ExpenseService(db)

    existing = await service.get_request(request_id, tenant_id)
    _check_ownership(current_user, existing)

    item = await service.update_item(
        request_id=request_id,
        item_id=item_id,
        tenant_id=tenant_id,
        updated_by=current_user.user_id,
        category_id=item_request.category_id,
        description=item_request.description,
        amount=item_request.amount,
        quantity=item_request.quantity,
        unit_price=item_request.unit_price,
        expense_date=item_request.expense_date
    )

    return ApiResponse(
        success=True,
        data=_item_to_response(item),
        message="Expense item updated",
        requestId=api_request_id
    )


@router.delete("/{request_id}/items/{item_id}", response_model=ApiResponse)
async def delete_item(
    request_id: UUID,
    item_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Delete expense item. Only the creator can delete items."""
    api_request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ExpenseService(db)

    existing = await service.get_request(request_id, tenant_id)
    _check_ownership(current_user, existing)
    await service.delete_item(
        request_id=request_id,
        item_id=item_id,
        tenant_id=tenant_id,
        deleted_by=current_user.user_id
    )

    return ApiResponse(
        success=True,
        data=None,
        message="Expense item deleted",
        requestId=api_request_id
    )


# ==================== Receipt Endpoints ====================

@router.get("/{request_id}/receipts", response_model=ApiResponse[List[ReceiptResponse]])
async def list_receipts(
    request_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """List receipts for an expense request."""
    api_request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ExpenseService(db)
    receipts = await service.get_receipts(request_id, tenant_id)

    return ApiResponse(
        success=True,
        data=[_receipt_to_response(r) for r in receipts],
        message="Receipts retrieved successfully",
        requestId=api_request_id
    )


@router.post("/{request_id}/receipts", response_model=ApiResponse[ReceiptResponse], status_code=201)
async def upload_receipt(
    request_id: UUID,
    receipt_request: ReceiptUploadRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Upload receipt to expense request."""
    api_request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ExpenseService(db)
    receipt = await service.add_receipt(
        request_id=request_id,
        tenant_id=tenant_id,
        file_id=receipt_request.file_id,
        uploaded_by=current_user.user_id,
        expense_item_id=receipt_request.expense_item_id
    )

    return ApiResponse(
        success=True,
        data=_receipt_to_response(receipt),
        message="Receipt uploaded",
        requestId=api_request_id
    )


@router.get("/receipts/{receipt_id}", response_model=ApiResponse[ReceiptResponse])
async def get_receipt(
    receipt_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get receipt by ID (for download)."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ExpenseService(db)
    receipt = await service.get_receipt(receipt_id, tenant_id)

    return ApiResponse(
        success=True,
        data=_receipt_to_response(receipt),
        message="Receipt retrieved successfully",
        requestId=request_id
    )


@router.delete("/receipts/{receipt_id}", response_model=ApiResponse)
async def delete_receipt(
    receipt_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Delete receipt."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ExpenseService(db)
    await service.delete_receipt(
        receipt_id=receipt_id,
        tenant_id=tenant_id,
        deleted_by=current_user.user_id
    )

    return ApiResponse(
        success=True,
        data=None,
        message="Receipt deleted",
        requestId=request_id
    )
