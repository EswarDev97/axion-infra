"""
MindFlow HR Service - Candidate Endpoints
Per API_CONTRACT.md Section 8.2.7
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
    CandidateCreateRequest,
    CandidateUpdateRequest,
    CandidateResponse,
    CandidateListResponse,
    CandidateConvertRequest,
)
from ..schemas.employee import EmployeeResponse
from ..services import CandidateService

router = APIRouter(prefix="/candidates", tags=["candidates"])


def _candidate_to_response(cand) -> CandidateResponse:
    """Convert Candidate model to CandidateResponse schema."""
    return CandidateResponse(
        id=cand.id,
        firstName=cand.first_name,
        lastName=cand.last_name,
        fullName=cand.full_name,
        email=cand.email,
        phone=cand.phone,
        positionId=cand.position_id,
        positionTitle=cand.position.title if cand.position else None,
        resumeFileId=cand.resume_file_id,
        status=cand.status,
        source=cand.source,
        notes=cand.notes,
        appliedAt=cand.applied_at,
        tenantId=cand.tenant_id,
        createdAt=cand.created_at,
        updatedAt=cand.updated_at
    )


def _employee_to_response(emp) -> EmployeeResponse:
    """Convert Employee model to EmployeeResponse schema."""
    return EmployeeResponse(
        id=emp.id,
        employeeCode=emp.employee_code,
        firstName=emp.first_name,
        lastName=emp.last_name,
        fullName=emp.full_name,
        email=emp.email,
        phone=emp.phone,
        positionId=emp.position_id,
        positionTitle=emp.position.title if emp.position else "",
        departmentId=emp.department_id,
        departmentName=emp.department.name if emp.department else None,
        managerId=emp.manager_id,
        managerName=emp.manager.full_name if emp.manager else None,
        dateOfJoining=emp.date_of_joining,
        dateOfExit=emp.date_of_exit,
        status=emp.status,
        employmentType=emp.employment_type,
        userId=emp.user_id,
        tenantId=emp.tenant_id,
        createdAt=emp.created_at,
        updatedAt=emp.updated_at
    )


@router.get("", response_model=ApiResponse[CandidateListResponse])
async def list_candidates(
    user: Annotated[CurrentUser, Depends(require_permission("hr:read:all"))],
    pagination: Annotated[PaginationParams, Depends(get_pagination_params)],
    position_id: UUID | None = Query(None, alias="positionId"),
    status: str | None = Query(None),
    source: str | None = Query(None),
    search: str | None = Query(None),
    x_request_id: Annotated[str | None, Header()] = None
):
    """List all candidates."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = CandidateService(db)
        candidates, total = await service.list_candidates(
            user.tenant_id, pagination, position_id, status, source, search
        )

        items = [_candidate_to_response(c) for c in candidates]
        total_pages = (total + pagination.page_size - 1) // pagination.page_size

        result = CandidateListResponse(
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
            message="Candidates retrieved successfully",
            requestId=request_id
        )


@router.post("", response_model=ApiResponse[CandidateResponse], status_code=201)
async def create_candidate(
    body: CandidateCreateRequest,
    user: Annotated[CurrentUser, Depends(require_permission("hr:create:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Create a new candidate."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = CandidateService(db)
        candidate = await service.create_candidate(
            tenant_id=user.tenant_id,
            first_name=body.first_name,
            last_name=body.last_name,
            email=body.email,
            created_by=user.user_id,
            phone=body.phone,
            position_id=body.position_id,
            resume_file_id=body.resume_file_id,
            source=body.source,
            notes=body.notes
        )

        return ApiResponse(
            success=True,
            data=_candidate_to_response(candidate),
            message="Candidate created successfully",
            requestId=request_id
        )


@router.get("/{candidate_id}", response_model=ApiResponse[CandidateResponse])
async def get_candidate(
    candidate_id: UUID,
    user: Annotated[CurrentUser, Depends(require_permission("hr:read:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get candidate by ID."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = CandidateService(db)
        candidate = await service.get_candidate(candidate_id, user.tenant_id)

        return ApiResponse(
            success=True,
            data=_candidate_to_response(candidate),
            message="Candidate retrieved successfully",
            requestId=request_id
        )


@router.put("/{candidate_id}", response_model=ApiResponse[CandidateResponse])
async def update_candidate(
    candidate_id: UUID,
    body: CandidateUpdateRequest,
    user: Annotated[CurrentUser, Depends(require_permission("hr:update:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Update candidate."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = CandidateService(db)
        candidate = await service.update_candidate(
            candidate_id=candidate_id,
            tenant_id=user.tenant_id,
            updated_by=user.user_id,
            first_name=body.first_name,
            last_name=body.last_name,
            email=body.email,
            phone=body.phone,
            position_id=body.position_id,
            resume_file_id=body.resume_file_id,
            status=body.status,
            source=body.source,
            notes=body.notes
        )

        return ApiResponse(
            success=True,
            data=_candidate_to_response(candidate),
            message="Candidate updated successfully",
            requestId=request_id
        )


@router.delete("/{candidate_id}", response_model=ApiResponse[None])
async def delete_candidate(
    candidate_id: UUID,
    user: Annotated[CurrentUser, Depends(require_permission("hr:delete:all"))],
    reason: str | None = Query(None),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Soft delete candidate."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = CandidateService(db)
        await service.delete_candidate(
            candidate_id, user.tenant_id, user.user_id, reason
        )

        return ApiResponse(
            success=True,
            message="Candidate deleted successfully",
            requestId=request_id
        )


@router.post("/{candidate_id}/convert", response_model=ApiResponse[EmployeeResponse])
async def convert_to_employee(
    candidate_id: UUID,
    body: CandidateConvertRequest,
    user: Annotated[CurrentUser, Depends(require_permission("hr:create:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Convert a hired candidate to an employee."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = CandidateService(db)
        employee = await service.convert_to_employee(
            candidate_id=candidate_id,
            tenant_id=user.tenant_id,
            employee_code=body.employee_code,
            date_of_joining=body.date_of_joining,
            created_by=user.user_id,
            department_id=body.department_id,
            manager_id=body.manager_id,
            employment_type=body.employment_type,
            create_user_account=body.create_user_account
        )

        return ApiResponse(
            success=True,
            data=_employee_to_response(employee),
            message="Candidate converted to employee successfully",
            requestId=request_id
        )
