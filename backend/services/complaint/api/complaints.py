"""
MindFlow Complaint Service - Complaint API Endpoints
Per API_CONTRACT.md Section 8.7.1-8.7.3
"""

from typing import Annotated, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from shared.dependencies import get_current_user, get_tenant_id, get_db_session, get_employee_id, CurrentUser
from shared.schemas import ApiResponse

from ..schemas.complaint import (
    ComplaintCreateRequest,
    ComplaintUpdateRequest,
    ComplaintAssignRequest,
    ComplaintEscalateRequest,
    ComplaintResolveRequest,
    ComplaintCloseRequest,
    ComplaintReopenRequest,
    ComplaintResponse,
    ComplaintDetailResponse,
    ComplaintListResponse,
    ComplaintFilters,
    SLAInfo,
    UserInfo,
)
from ..schemas.action import ActionCreateRequest, ActionResponse, ActionListResponse
from ..schemas.attachment import AttachmentCreateRequest, AttachmentResponse, AttachmentListResponse
from ..services.complaint_service import ComplaintService
from ..services.sla_service import SLAService

router = APIRouter(tags=["complaints"])


async def _resolve_names_for_complaint(service: ComplaintService, complaint) -> dict:
    """Resolve assigned-to and created-by names for a complaint."""
    assigned_name = await service._resolve_employee_name(complaint.owner_employee_id)
    created_name = await service._resolve_user_name(complaint.created_by)
    return {"assigned_to_name": assigned_name, "created_by_name": created_name}


def _build_complaint_detail_response(
    complaint, sla: dict,
    assigned_to_name: str = None,
    created_by_name: str = None,
) -> ComplaintDetailResponse:
    """Helper to build ComplaintDetailResponse."""
    # Build created_by UserInfo with resolved name
    created_by_info = None
    if complaint.created_by:
        created_by_info = UserInfo(
            id=complaint.created_by,
            name=created_by_name or "Unknown",
        )

    return ComplaintDetailResponse(
        id=complaint.id,
        complaint_number=complaint.complaint_number,
        title=complaint.title,
        description=complaint.description,
        category=complaint.category,
        severity=complaint.severity,
        source_channel=complaint.source_channel,
        status=complaint.status,
        display_status=complaint.display_status,
        complainant_type=complaint.complainant_type,
        complainant_name=complaint.complainant_name,
        complainant_contact=complaint.complainant_contact,
        complainant_employee_id=complaint.complainant_employee_id,
        owner_employee_id=complaint.owner_employee_id,
        assigned_to_name=assigned_to_name,
        assigned_at=complaint.assigned_at,
        reference_type=complaint.reference_type,
        reference_id=complaint.reference_id,
        insurer_client=complaint.insurer_client,
        vehicle_number=complaint.vehicle_number,
        workshop_name=complaint.workshop_name,
        corrective_action=complaint.corrective_action,
        expected_closure_date=complaint.expected_closure_date,
        sla=SLAInfo(
            response_hours=sla["response_hours"],
            resolution_hours=sla["resolution_hours"],
            escalation_hours=sla["escalation_hours"],
            response_due_at=complaint.sla_response_due_at,
            resolution_due_at=complaint.sla_resolution_due_at,
        ),
        responded_at=complaint.responded_at,
        resolved_at=complaint.resolved_at,
        closed_at=complaint.closed_at,
        closure_remarks=complaint.closure_remarks,
        closure_tat_hours=complaint.closure_tat_hours,
        closure_tat_days=complaint.closure_tat_days,
        reason_for_complaint=complaint.reason_for_complaint,
        complaint_type=complaint.complaint_type,
        reopened_count=complaint.reopened_count,
        is_escalated=complaint.is_escalated,
        escalation_level=complaint.escalation_level,
        last_escalated_at=complaint.last_escalated_at,
        is_overdue_response=complaint.is_overdue_response,
        is_overdue_resolution=complaint.is_overdue_resolution,
        created_by=created_by_info,
        created_at=complaint.created_at,
        updated_at=complaint.updated_at,
    )


# Roles that can create complaints (Employees cannot)
COMPLAINT_CREATE_ROLES = ["SUPER_ADMIN", "HR_ADMIN", "MANAGER", "DEPARTMENT_HEAD"]


@router.post(
    "/",
    response_model=ApiResponse[ComplaintDetailResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create complaint",
)
async def create_complaint(
    data: ComplaintCreateRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Create a new complaint. Only Super Admin, HR Admin, Manager, and Department Head can create."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    # Check if user has a role that can create complaints
    if not current_user.is_super_admin() and not any(
        role in current_user.roles for role in COMPLAINT_CREATE_ROLES
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employees cannot create complaints. Only Super Admin, HR Admin, Manager, or Department Head can create complaints."
        )

    service = ComplaintService(db)
    complaint = await service.create(data, tenant_id, current_user.user_id)

    # Get SLA info
    sla_service = SLAService(db)
    sla = await sla_service.get_sla_for_complaint(
        tenant_id, complaint.category_id, complaint.severity
    )

    return ApiResponse(
        success=True,
        data=_build_complaint_detail_response(complaint, sla, **(await _resolve_names_for_complaint(service, complaint))),
        message="Complaint created successfully",
        requestId=request_id
    )


@router.get(
    "/",
    response_model=ApiResponse[ComplaintListResponse],
    summary="List complaints",
)
async def list_complaints(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    category_id: Optional[UUID] = Query(None, alias="categoryId"),
    severity: Optional[str] = Query(None),
    complaint_status: Optional[str] = Query(None, alias="status"),
    source_channel: Optional[str] = Query(None, alias="sourceChannel"),
    owner_employee_id: Optional[UUID] = Query(None, alias="ownerEmployeeId"),
    overdue: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    employee_id: UUID = Depends(get_employee_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """List complaints with filters, pagination, and role-based visibility."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = ComplaintService(db)
    filters = ComplaintFilters(
        category_id=category_id,
        severity=severity,
        status=complaint_status,
        source_channel=source_channel,
        owner_employee_id=owner_employee_id,
        overdue=overdue,
        search=search,
    )
    result = await service.list(
        tenant_id, filters, page, limit,
        user_roles=current_user.roles,
        user_id=current_user.user_id,
        employee_id=employee_id,
    )

    return ApiResponse(
        success=True,
        data=result,
        message="Complaints retrieved successfully",
        requestId=request_id
    )


@router.get(
    "/my-complaints",
    response_model=ApiResponse[ComplaintListResponse],
    summary="Get my complaints",
)
async def get_my_complaints(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Get complaints created by the current user."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = ComplaintService(db)
    # user_id serves as employee reference in most cases
    result = await service.get_my_complaints(tenant_id, current_user.user_id, current_user.user_id, page, limit)

    return ApiResponse(
        success=True,
        data=result,
        message="My complaints retrieved successfully",
        requestId=request_id
    )


@router.get(
    "/dashboard/stats",
    response_model=ApiResponse,
    summary="Get dashboard statistics",
)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    employee_id: UUID = Depends(get_employee_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Get complaint dashboard statistics with role-based scoping."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = ComplaintService(db)

    # Get both legacy full stats and new scoped stats
    full_stats = await service.get_dashboard_stats(tenant_id)
    scoped_stats = await service.get_dashboard_stats_scoped(
        tenant_id, current_user.roles, employee_id,
        user_id=current_user.user_id,
    )

    # Merge: include scoped simplified counts alongside full stats
    combined = {**full_stats, **scoped_stats}

    return ApiResponse(
        success=True,
        data=combined,
        message="Dashboard stats retrieved successfully",
        requestId=request_id
    )


@router.get(
    "/dashboard/overdue",
    response_model=ApiResponse[ComplaintListResponse],
    summary="Get overdue complaints",
)
async def get_overdue_complaints(
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Get list of overdue complaints."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = ComplaintService(db)
    complaints = await service.get_overdue_complaints(tenant_id)

    items = [
        ComplaintResponse(
            id=c.id,
            complaint_number=c.complaint_number,
            title=c.title,
            category=c.category,
            severity=c.severity,
            source_channel=c.source_channel,
            status=c.status,
            complainant_name=c.complainant_name,
            owner_employee_id=c.owner_employee_id,
            assigned_at=c.assigned_at,
            sla_response_due_at=c.sla_response_due_at,
            sla_resolution_due_at=c.sla_resolution_due_at,
            is_overdue_response=c.is_overdue_response,
            is_overdue_resolution=c.is_overdue_resolution,
            escalation_level=c.escalation_level,
            created_at=c.created_at,
            updated_at=c.updated_at,
        )
        for c in complaints
    ]

    result = ComplaintListResponse(
        items=items,
        total=len(items),
        page=1,
        limit=len(items),
        pages=1,
    )

    return ApiResponse(
        success=True,
        data=result,
        message="Overdue complaints retrieved successfully",
        requestId=request_id
    )


@router.get(
    "/reports/sla-compliance",
    response_model=ApiResponse,
    summary="Get SLA compliance report",
)
async def get_sla_compliance_report(
    from_date: Optional[str] = Query(None, alias="fromDate"),
    to_date: Optional[str] = Query(None, alias="toDate"),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Get SLA compliance report by category and severity."""
    from datetime import datetime

    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = ComplaintService(db)

    from_dt = datetime.fromisoformat(from_date) if from_date else None
    to_dt = datetime.fromisoformat(to_date) if to_date else None

    report = await service.get_sla_compliance_report(tenant_id, from_dt, to_dt)

    return ApiResponse(
        success=True,
        data=report,
        message="SLA compliance report retrieved successfully",
        requestId=request_id
    )


@router.get(
    "/reports/aging",
    response_model=ApiResponse,
    summary="Get aging report",
)
async def get_aging_report(
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Get aging report for open complaints."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = ComplaintService(db)
    report = await service.get_aging_report(tenant_id)

    return ApiResponse(
        success=True,
        data=report,
        message="Aging report retrieved successfully",
        requestId=request_id
    )


@router.get(
    "/assignable-users",
    response_model=ApiResponse,
    summary="Get assignable users based on current user's role",
)
async def get_assignable_users(
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    employee_id: UUID = Depends(get_employee_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Get list of users that the current user can assign complaints to, filtered by role."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = ComplaintService(db)

    # Get department_id for the current user
    from sqlalchemy import text as sa_text
    dept_result = await db.execute(
        sa_text("SELECT department_id FROM employees WHERE id = :eid LIMIT 1"),
        {"eid": employee_id}
    )
    dept_row = dept_result.fetchone()
    department_id = str(dept_row[0]) if dept_row and dept_row[0] else None

    users = await service.get_assignable_users(
        tenant_id, current_user.roles, employee_id, department_id
    )

    return ApiResponse(
        success=True,
        data=users,
        message="Assignable users retrieved successfully",
        requestId=request_id
    )


@router.get(
    "/assigned-to-me",
    response_model=ApiResponse[ComplaintListResponse],
    summary="Get complaints assigned to me",
)
async def get_assigned_complaints(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Get complaints assigned to the current user."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = ComplaintService(db)
    # user_id serves as employee reference
    result = await service.get_assigned_to_me(tenant_id, current_user.user_id, page, limit)

    return ApiResponse(
        success=True,
        data=result,
        message="Assigned complaints retrieved successfully",
        requestId=request_id
    )


@router.get(
    "/{complaint_id}",
    response_model=ApiResponse[ComplaintDetailResponse],
    summary="Get complaint",
)
async def get_complaint(
    complaint_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Get a complaint by ID."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = ComplaintService(db)
    complaint = await service.get_by_id(complaint_id, tenant_id)
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )

    # Get SLA info
    sla_service = SLAService(db)
    sla = await sla_service.get_sla_for_complaint(
        tenant_id, complaint.category_id, complaint.severity
    )

    return ApiResponse(
        success=True,
        data=_build_complaint_detail_response(complaint, sla, **(await _resolve_names_for_complaint(service, complaint))),
        message="Complaint retrieved successfully",
        requestId=request_id
    )


@router.put(
    "/{complaint_id}",
    response_model=ApiResponse[ComplaintDetailResponse],
    summary="Update complaint",
)
async def update_complaint(
    complaint_id: UUID,
    data: ComplaintUpdateRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Update a complaint."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = ComplaintService(db)
    complaint = await service.get_by_id(complaint_id, tenant_id)
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
    complaint = await service.update(complaint, data, current_user.user_id)

    # Get SLA info
    sla_service = SLAService(db)
    sla = await sla_service.get_sla_for_complaint(
        tenant_id, complaint.category_id, complaint.severity
    )

    return ApiResponse(
        success=True,
        data=_build_complaint_detail_response(complaint, sla, **(await _resolve_names_for_complaint(service, complaint))),
        message="Complaint updated successfully",
        requestId=request_id
    )


@router.post(
    "/{complaint_id}/assign",
    response_model=ApiResponse[ComplaintDetailResponse],
    summary="Assign complaint",
)
async def assign_complaint(
    complaint_id: UUID,
    data: ComplaintAssignRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Assign a complaint to an employee."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = ComplaintService(db)
    complaint = await service.get_by_id(complaint_id, tenant_id)
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
    complaint = await service.assign(complaint, data, current_user.user_id)

    # Get SLA info
    sla_service = SLAService(db)
    sla = await sla_service.get_sla_for_complaint(
        tenant_id, complaint.category_id, complaint.severity
    )

    return ApiResponse(
        success=True,
        data=_build_complaint_detail_response(complaint, sla, **(await _resolve_names_for_complaint(service, complaint))),
        message="Complaint assigned successfully",
        requestId=request_id
    )


@router.post(
    "/{complaint_id}/escalate",
    response_model=ApiResponse[ComplaintDetailResponse],
    summary="Escalate complaint",
)
async def escalate_complaint(
    complaint_id: UUID,
    data: ComplaintEscalateRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Escalate a complaint."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = ComplaintService(db)
    complaint = await service.get_by_id(complaint_id, tenant_id)
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
    complaint = await service.escalate(complaint, data, current_user.user_id)

    # Get SLA info
    sla_service = SLAService(db)
    sla = await sla_service.get_sla_for_complaint(
        tenant_id, complaint.category_id, complaint.severity
    )

    return ApiResponse(
        success=True,
        data=_build_complaint_detail_response(complaint, sla, **(await _resolve_names_for_complaint(service, complaint))),
        message="Complaint escalated successfully",
        requestId=request_id
    )


@router.post(
    "/{complaint_id}/resolve",
    response_model=ApiResponse[ComplaintDetailResponse],
    summary="Resolve complaint",
)
async def resolve_complaint(
    complaint_id: UUID,
    data: ComplaintResolveRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Resolve a complaint."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = ComplaintService(db)
    complaint = await service.get_by_id(complaint_id, tenant_id)
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
    if not complaint.can_be_resolved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complaint cannot be resolved in current status"
        )
    complaint = await service.resolve(complaint, data, current_user.user_id)

    # Get SLA info
    sla_service = SLAService(db)
    sla = await sla_service.get_sla_for_complaint(
        tenant_id, complaint.category_id, complaint.severity
    )

    return ApiResponse(
        success=True,
        data=_build_complaint_detail_response(complaint, sla, **(await _resolve_names_for_complaint(service, complaint))),
        message="Complaint resolved successfully",
        requestId=request_id
    )


@router.post(
    "/{complaint_id}/reopen",
    response_model=ApiResponse[ComplaintDetailResponse],
    summary="Reopen complaint",
)
async def reopen_complaint(
    complaint_id: UUID,
    data: ComplaintReopenRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Reopen a resolved or closed complaint."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = ComplaintService(db)
    complaint = await service.get_by_id(complaint_id, tenant_id)
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
    if not complaint.can_be_reopened:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complaint cannot be reopened in current status"
        )
    complaint = await service.reopen(complaint, data, current_user.user_id)

    # Get SLA info
    sla_service = SLAService(db)
    sla = await sla_service.get_sla_for_complaint(
        tenant_id, complaint.category_id, complaint.severity
    )

    return ApiResponse(
        success=True,
        data=_build_complaint_detail_response(complaint, sla, **(await _resolve_names_for_complaint(service, complaint))),
        message="Complaint reopened successfully",
        requestId=request_id
    )


@router.post(
    "/{complaint_id}/start-progress",
    response_model=ApiResponse[ComplaintDetailResponse],
    summary="Start progress on complaint",
)
async def start_progress(
    complaint_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Start working on a complaint (ASSIGNED -> IN_PROGRESS)."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = ComplaintService(db)
    complaint = await service.get_by_id(complaint_id, tenant_id)
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
    try:
        complaint = await service.start_progress(complaint, current_user.user_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    # Get SLA info
    sla_service = SLAService(db)
    sla = await sla_service.get_sla_for_complaint(
        tenant_id, complaint.category_id, complaint.severity
    )

    return ApiResponse(
        success=True,
        data=_build_complaint_detail_response(complaint, sla, **(await _resolve_names_for_complaint(service, complaint))),
        message="Complaint progress started",
        requestId=request_id
    )


@router.post(
    "/{complaint_id}/request-info",
    response_model=ApiResponse[ComplaintDetailResponse],
    summary="Request more information",
)
async def request_info(
    complaint_id: UUID,
    message: str = Query(...),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Request more information (IN_PROGRESS -> WAITING_INFO)."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = ComplaintService(db)
    complaint = await service.get_by_id(complaint_id, tenant_id)
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
    try:
        complaint = await service.request_info(complaint, current_user.user_id, message)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    # Get SLA info
    sla_service = SLAService(db)
    sla = await sla_service.get_sla_for_complaint(
        tenant_id, complaint.category_id, complaint.severity
    )

    return ApiResponse(
        success=True,
        data=_build_complaint_detail_response(complaint, sla, **(await _resolve_names_for_complaint(service, complaint))),
        message="Information requested",
        requestId=request_id
    )


@router.post(
    "/{complaint_id}/provide-info",
    response_model=ApiResponse[ComplaintDetailResponse],
    summary="Provide information",
)
async def provide_info(
    complaint_id: UUID,
    response: str = Query(...),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Provide requested information (WAITING_INFO -> IN_PROGRESS)."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = ComplaintService(db)
    complaint = await service.get_by_id(complaint_id, tenant_id)
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
    try:
        complaint = await service.provide_info(complaint, current_user.user_id, response)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    # Get SLA info
    sla_service = SLAService(db)
    sla = await sla_service.get_sla_for_complaint(
        tenant_id, complaint.category_id, complaint.severity
    )

    return ApiResponse(
        success=True,
        data=_build_complaint_detail_response(complaint, sla, **(await _resolve_names_for_complaint(service, complaint))),
        message="Information provided",
        requestId=request_id
    )


@router.post(
    "/{complaint_id}/close",
    response_model=ApiResponse[ComplaintDetailResponse],
    summary="Close complaint",
)
async def close_complaint(
    complaint_id: UUID,
    data: ComplaintCloseRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Close a complaint. Requires reasonForComplaint and correctiveAction."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = ComplaintService(db)
    complaint = await service.get_by_id(complaint_id, tenant_id)
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
    if complaint.status not in ("RESOLVED", "IN_PROGRESS", "ASSIGNED", "WAITING_INFO"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complaint cannot be closed in current status"
        )
    try:
        complaint = await service.close(
            complaint,
            current_user.user_id,
            reason_for_complaint=data.reason_for_complaint,
            corrective_action=data.corrective_action,
            remarks=data.closure_remarks,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    # Get SLA info
    sla_service = SLAService(db)
    sla = await sla_service.get_sla_for_complaint(
        tenant_id, complaint.category_id, complaint.severity
    )

    return ApiResponse(
        success=True,
        data=_build_complaint_detail_response(complaint, sla, **(await _resolve_names_for_complaint(service, complaint))),
        message="Complaint closed successfully",
        requestId=request_id
    )


# =========================================================================
# Enhanced Report Endpoints
# =========================================================================


@router.get(
    "/reports/department",
    response_model=ApiResponse,
    summary="Get department-wise report",
)
async def get_department_report(
    from_date: Optional[str] = Query(None, alias="fromDate"),
    to_date: Optional[str] = Query(None, alias="toDate"),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Get department-wise complaint report."""
    from datetime import datetime as dt

    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = ComplaintService(db)
    from_dt = dt.fromisoformat(from_date) if from_date else None
    to_dt = dt.fromisoformat(to_date) if to_date else None

    report = await service.get_department_report(tenant_id, from_dt, to_dt)

    return ApiResponse(
        success=True,
        data=report,
        message="Department report retrieved successfully",
        requestId=request_id
    )


@router.get(
    "/reports/severity",
    response_model=ApiResponse,
    summary="Get severity-wise report",
)
async def get_severity_report(
    from_date: Optional[str] = Query(None, alias="fromDate"),
    to_date: Optional[str] = Query(None, alias="toDate"),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Get severity-wise complaint report."""
    from datetime import datetime as dt

    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = ComplaintService(db)
    from_dt = dt.fromisoformat(from_date) if from_date else None
    to_dt = dt.fromisoformat(to_date) if to_date else None

    report = await service.get_severity_report(tenant_id, from_dt, to_dt)

    return ApiResponse(
        success=True,
        data=report,
        message="Severity report retrieved successfully",
        requestId=request_id
    )


@router.get(
    "/reports/escalation",
    response_model=ApiResponse,
    summary="Get escalation report",
)
async def get_escalation_report(
    from_date: Optional[str] = Query(None, alias="fromDate"),
    to_date: Optional[str] = Query(None, alias="toDate"),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Get escalation report for all escalated complaints."""
    from datetime import datetime as dt

    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = ComplaintService(db)
    from_dt = dt.fromisoformat(from_date) if from_date else None
    to_dt = dt.fromisoformat(to_date) if to_date else None

    report = await service.get_escalation_report(tenant_id, from_dt, to_dt)

    return ApiResponse(
        success=True,
        data=report,
        message="Escalation report retrieved successfully",
        requestId=request_id
    )


@router.get(
    "/reports/daily",
    response_model=ApiResponse,
    summary="Get daily complaint report",
)
async def get_daily_report(
    report_date: Optional[str] = Query(None, alias="reportDate"),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Get daily complaint report."""
    from datetime import datetime as dt

    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = ComplaintService(db)
    target_date = dt.fromisoformat(report_date) if report_date else None

    report = await service.get_daily_report(tenant_id, target_date)

    return ApiResponse(
        success=True,
        data=report,
        message="Daily report retrieved successfully",
        requestId=request_id
    )


@router.get(
    "/reports/monthly-summary",
    response_model=ApiResponse,
    summary="Get monthly complaint summary",
)
async def get_monthly_summary(
    from_date: Optional[str] = Query(None, alias="fromDate"),
    to_date: Optional[str] = Query(None, alias="toDate"),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Get monthly complaint summary."""
    from datetime import datetime as dt

    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = ComplaintService(db)
    from_dt = dt.fromisoformat(from_date) if from_date else None
    to_dt = dt.fromisoformat(to_date) if to_date else None

    report = await service.get_monthly_summary(tenant_id, from_dt, to_dt)

    return ApiResponse(
        success=True,
        data=report,
        message="Monthly summary retrieved successfully",
        requestId=request_id
    )


# =========================================================================
# Auto-Escalation Trigger Endpoint
# =========================================================================


@router.post(
    "/escalation/run",
    response_model=ApiResponse,
    summary="Run auto-escalation for overdue complaints",
)
async def run_auto_escalation(
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Trigger automatic escalation check for overdue complaints. Typically called by a scheduler."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    # Only admin roles can trigger escalation
    if not current_user.is_super_admin() and "HR_ADMIN" not in current_user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin or HR Admin can trigger auto-escalation"
        )

    service = ComplaintService(db)
    count = await service.run_auto_escalation(tenant_id, current_user.user_id)

    return ApiResponse(
        success=True,
        data={"escalatedCount": count},
        message=f"Auto-escalation complete. {count} complaint(s) escalated.",
        requestId=request_id
    )


@router.delete(
    "/{complaint_id}",
    response_model=ApiResponse[None],
    status_code=status.HTTP_200_OK,
    summary="Delete complaint (soft delete)",
)
async def delete_complaint(
    complaint_id: UUID,
    reason: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Soft delete a complaint."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = ComplaintService(db)
    complaint = await service.get_by_id(complaint_id, tenant_id)
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
    await service.soft_delete(complaint, current_user.user_id, reason)

    return ApiResponse(
        success=True,
        data=None,
        message="Complaint deleted successfully",
        requestId=request_id
    )


# Action endpoints
@router.get(
    "/{complaint_id}/actions",
    response_model=ApiResponse[ActionListResponse],
    summary="List complaint actions",
)
async def list_actions(
    complaint_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """List actions for a complaint."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = ComplaintService(db)
    complaint = await service.get_by_id(complaint_id, tenant_id)
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
    result = await service.get_actions(complaint_id, tenant_id)

    return ApiResponse(
        success=True,
        data=result,
        message="Actions retrieved successfully",
        requestId=request_id
    )


@router.post(
    "/{complaint_id}/actions",
    response_model=ApiResponse[ActionResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Add complaint action",
)
async def add_action(
    complaint_id: UUID,
    data: ActionCreateRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Add an action (comment) to a complaint."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = ComplaintService(db)
    complaint = await service.get_by_id(complaint_id, tenant_id)
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
    action = await service.add_action(complaint, data, current_user.user_id)

    return ApiResponse(
        success=True,
        data=ActionResponse.model_validate(action),
        message="Action added successfully",
        requestId=request_id
    )


# Attachment endpoints
@router.get(
    "/{complaint_id}/attachments",
    response_model=ApiResponse[AttachmentListResponse],
    summary="List complaint attachments",
)
async def list_attachments(
    complaint_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """List attachments for a complaint."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = ComplaintService(db)
    complaint = await service.get_by_id(complaint_id, tenant_id)
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
    result = await service.get_attachments(complaint_id, tenant_id)

    return ApiResponse(
        success=True,
        data=result,
        message="Attachments retrieved successfully",
        requestId=request_id
    )


@router.post(
    "/{complaint_id}/attachments",
    response_model=ApiResponse[AttachmentResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Add complaint attachment",
)
async def add_attachment(
    complaint_id: UUID,
    data: AttachmentCreateRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Add an attachment to a complaint."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = ComplaintService(db)
    complaint = await service.get_by_id(complaint_id, tenant_id)
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
    attachment = await service.add_attachment(complaint, data, current_user.user_id)

    return ApiResponse(
        success=True,
        data=AttachmentResponse.model_validate(attachment),
        message="Attachment added successfully",
        requestId=request_id
    )


@router.delete(
    "/{complaint_id}/attachments/{attachment_id}",
    response_model=ApiResponse[None],
    status_code=status.HTTP_200_OK,
    summary="Delete complaint attachment",
)
async def delete_attachment(
    complaint_id: UUID,
    attachment_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Delete an attachment from a complaint."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = ComplaintService(db)
    complaint = await service.get_by_id(complaint_id, tenant_id)
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
    deleted = await service.delete_attachment(attachment_id, tenant_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment not found"
        )

    return ApiResponse(
        success=True,
        data=None,
        message="Attachment deleted successfully",
        requestId=request_id
    )
