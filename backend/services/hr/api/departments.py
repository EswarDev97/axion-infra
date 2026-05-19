"""
MindFlow HR Service - Department Endpoints
Per API_CONTRACT.md Section 8.2.2
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
    DepartmentCreateRequest,
    DepartmentUpdateRequest,
    DepartmentResponse,
    DepartmentListResponse,
)
from ..schemas.employee import EmployeeResponse, EmployeeListResponse
from ..services import DepartmentService

router = APIRouter(prefix="/departments", tags=["departments"])


def _department_to_response(dept) -> DepartmentResponse:
    """Convert Department model to DepartmentResponse schema."""
    return DepartmentResponse(
        id=dept.id,
        code=dept.code,
        name=dept.name,
        description=dept.description,
        parentId=dept.parent_id,
        managerId=dept.manager_id,
        managerName=dept.manager.full_name if dept.manager else None,
        isActive=dept.is_active,
        employeeCount=len(dept.employees) if hasattr(dept, 'employees') and dept.employees else 0,
        tenantId=dept.tenant_id,
        createdAt=dept.created_at,
        updatedAt=dept.updated_at
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


@router.get("", response_model=ApiResponse[DepartmentListResponse])
async def list_departments(
    user: Annotated[CurrentUser, Depends(require_permission("hr:read:all"))],
    pagination: Annotated[PaginationParams, Depends(get_pagination_params)],
    parent_id: UUID | None = Query(None, alias="parentId"),
    is_active: bool | None = Query(None, alias="isActive"),
    x_request_id: Annotated[str | None, Header()] = None
):
    """List all departments."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = DepartmentService(db)
        departments, total = await service.list_departments(
            user.tenant_id, pagination, parent_id, is_active
        )

        items = [_department_to_response(d) for d in departments]
        total_pages = (total + pagination.page_size - 1) // pagination.page_size

        result = DepartmentListResponse(
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
            message="Departments retrieved successfully",
            requestId=request_id
        )


@router.post("", response_model=ApiResponse[DepartmentResponse], status_code=201)
async def create_department(
    body: DepartmentCreateRequest,
    user: Annotated[CurrentUser, Depends(require_permission("hr:create:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Create a new department."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = DepartmentService(db)
        department = await service.create_department(
            tenant_id=user.tenant_id,
            code=body.code,
            name=body.name,
            created_by=user.user_id,
            description=body.description,
            parent_id=body.parent_id,
            manager_id=body.manager_id
        )

        return ApiResponse(
            success=True,
            data=_department_to_response(department),
            message="Department created successfully",
            requestId=request_id
        )


@router.get("/{department_id}", response_model=ApiResponse[DepartmentResponse])
async def get_department(
    department_id: UUID,
    user: Annotated[CurrentUser, Depends(require_permission("hr:read:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get department by ID."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = DepartmentService(db)
        department = await service.get_department(department_id, user.tenant_id)

        return ApiResponse(
            success=True,
            data=_department_to_response(department),
            message="Department retrieved successfully",
            requestId=request_id
        )


@router.put("/{department_id}", response_model=ApiResponse[DepartmentResponse])
async def update_department(
    department_id: UUID,
    body: DepartmentUpdateRequest,
    user: Annotated[CurrentUser, Depends(require_permission("hr:update:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Update department."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = DepartmentService(db)
        department = await service.update_department(
            department_id=department_id,
            tenant_id=user.tenant_id,
            updated_by=user.user_id,
            name=body.name,
            description=body.description,
            parent_id=body.parent_id,
            manager_id=body.manager_id,
            is_active=body.is_active
        )

        return ApiResponse(
            success=True,
            data=_department_to_response(department),
            message="Department updated successfully",
            requestId=request_id
        )


@router.delete("/{department_id}", response_model=ApiResponse[None])
async def delete_department(
    department_id: UUID,
    user: Annotated[CurrentUser, Depends(require_permission("hr:delete:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Delete department."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = DepartmentService(db)
        await service.delete_department(department_id, user.tenant_id)

        return ApiResponse(
            success=True,
            message="Department deleted successfully",
            requestId=request_id
        )


@router.get("/{department_id}/employees", response_model=ApiResponse[EmployeeListResponse])
async def get_department_employees(
    department_id: UUID,
    user: Annotated[CurrentUser, Depends(require_permission("hr:read:all"))],
    pagination: Annotated[PaginationParams, Depends(get_pagination_params)],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get employees in a department."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = DepartmentService(db)
        employees, total = await service.get_department_employees(
            department_id, user.tenant_id, pagination
        )

        items = [_employee_to_response(e) for e in employees]
        total_pages = (total + pagination.page_size - 1) // pagination.page_size

        result = EmployeeListResponse(
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
            message="Department employees retrieved successfully",
            requestId=request_id
        )
