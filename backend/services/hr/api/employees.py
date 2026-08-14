"""
MindFlow HR Service - Employee Endpoints
Per API_CONTRACT.md Section 8.2.1
"""

from typing import Annotated, List
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, Query

from shared.database import db_manager
from shared.dependencies import (
    CurrentUser,
    get_pagination_params,
    require_any_permission,
    require_permission,
)
from shared.schemas import ApiResponse, PaginationMeta, PaginationParams

from shared.security import hash_password

from ..schemas import (
    EmployeeCreateRequest,
    EmployeeUpdateRequest,
    EmployeeChangePasswordRequest,
    EmployeeStatusRequest,
    EmployeeResponse,
    EmployeeListResponse,
    EmployeeFilters,
)
from ..services import EmployeeService, LeaveService

router = APIRouter(prefix="/employees", tags=["employees"])


def _employee_to_response(emp, role: str = None) -> EmployeeResponse:
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
        salary=emp.salary,
        role=role,
        userId=emp.user_id,
        tenantId=emp.tenant_id,
        createdAt=emp.created_at,
        updatedAt=emp.updated_at
    )


async def _get_employee_roles(db, employees) -> dict:
    """Bulk fetch roles for a list of employees by their user_ids."""
    from sqlalchemy import text
    user_ids = [str(e.user_id) for e in employees if e.user_id]
    if not user_ids:
        return {}
    placeholders = ",".join(f"'{uid}'" for uid in user_ids)
    result = await db.execute(
        text(f"""
            SELECT utr.user_id::text, r.code
            FROM user_tenant_roles utr
            JOIN roles r ON utr.role_id = r.id
            WHERE utr.user_id::text IN ({placeholders})
              AND utr.revoked_at IS NULL
        """)
    )
    role_map = {}
    for row in result.fetchall():
        role_map[row[0]] = row[1]
    return role_map


@router.get("", response_model=ApiResponse[EmployeeListResponse])
async def list_employees(
    user: Annotated[CurrentUser, Depends(require_any_permission(["hr:read:all", "hr:read:subordinates"]))],
    pagination: Annotated[PaginationParams, Depends(get_pagination_params)],
    department_id: UUID | None = Query(None, alias="departmentId"),
    position_id: UUID | None = Query(None, alias="positionId"),
    manager_id: UUID | None = Query(None, alias="managerId"),
    status: str | None = Query(None),
    employment_type: str | None = Query(None, alias="employmentType"),
    search: str | None = Query(None),
    x_request_id: Annotated[str | None, Header()] = None
):
    """List all employees."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    filters = EmployeeFilters(
        departmentId=department_id,
        positionId=position_id,
        managerId=manager_id,
        status=status,
        employmentType=employment_type,
        search=search
    )

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = EmployeeService(db)
        employees, total = await service.list_employees(
            user.tenant_id, pagination, filters
        )

        role_map = await _get_employee_roles(db, employees)
        items = [
            _employee_to_response(e, role=role_map.get(str(e.user_id)))
            for e in employees
        ]
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
            message="Employees retrieved successfully",
            requestId=request_id
        )


@router.post("", response_model=ApiResponse[EmployeeResponse], status_code=201)
async def create_employee(
    body: EmployeeCreateRequest,
    user: Annotated[CurrentUser, Depends(require_permission("hr:create:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Create a new employee and auto-initialize leave balances."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = EmployeeService(db)
        employee = await service.create_employee(
            tenant_id=user.tenant_id,
            employee_code=body.employee_code,
            first_name=body.first_name,
            last_name=body.last_name,
            email=body.email,
            position_id=body.position_id,
            date_of_joining=body.date_of_joining,
            created_by=user.user_id,
            phone=body.phone,
            password=body.password,
            role=body.role,
            department_id=body.department_id,
            manager_id=body.manager_id,
            employment_type=body.employment_type,
            salary=body.salary,
            user_id=body.user_id
        )

        # Auto-initialize leave balances for the current year
        from datetime import date
        leave_service = LeaveService(db)
        balances = await leave_service.initialize_employee_balances(
            employee.id, user.tenant_id, date.today().year
        )

        # Apply custom balance values if provided
        if body.leave_balances:
            await leave_service.apply_custom_balances(
                employee.id, user.tenant_id, date.today().year, body.leave_balances
            )

        return ApiResponse(
            success=True,
            data=_employee_to_response(employee),
            message="Employee created successfully",
            requestId=request_id
        )


@router.get("/me", response_model=ApiResponse[EmployeeResponse])
async def get_my_employee_record(
    user: Annotated[CurrentUser, Depends(require_permission("employees:read:self"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """
    Get the caller's own employee record. Registered ahead of
    GET /{employee_id} so "me" isn't parsed as a UUID path param.

    Gated on employees:read:self (not hr:read:all) so a self-service-only
    role (e.g. EMPLOYEE with payments:read:own) can still resolve their own
    name for display purposes — e.g. the Payment Management page's
    Executive column — without granting broader employee-directory access.
    """
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = EmployeeService(db)
        employee = await service.get_employee_by_user_id(user.user_id, user.tenant_id)
        if not employee:
            raise HTTPException(status_code=404, detail="No employee record found for this user")

        role_map = await _get_employee_roles(db, [employee])
        role = role_map.get(str(employee.user_id)) if employee.user_id else None

        return ApiResponse(
            success=True,
            data=_employee_to_response(employee, role=role),
            message="Employee retrieved successfully",
            requestId=request_id
        )


@router.get("/field-executives", response_model=ApiResponse[EmployeeListResponse])
async def list_field_executives(
    user: Annotated[
        CurrentUser,
        Depends(require_any_permission(["payments:create", "payments:read", "hr:read:all", "hr:read:subordinates"])),
    ],
    x_request_id: Annotated[str | None, Header()] = None
):
    """
    Active employees with position title 'Field Executive'. Registered
    ahead of GET /{employee_id} so "field-executives" isn't parsed as a
    UUID path param.

    Gated on payments:create/payments:read (which EMPLOYEE has) rather
    than hr:read:all/hr:read:subordinates, so a payments-only caller can
    populate the Payment Management form's Executive dropdown with every
    Field Executive — not just their own record via GET /employees/me —
    without gaining general employee-directory read access.
    """
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = EmployeeService(db)
        employees = await service.list_by_position_title(user.tenant_id, "Field Executive")

        role_map = await _get_employee_roles(db, employees)
        items = [
            _employee_to_response(e, role=role_map.get(str(e.user_id)))
            for e in employees
        ]

        return ApiResponse(
            success=True,
            data=EmployeeListResponse(
                items=items,
                pagination=PaginationMeta(
                    page=1,
                    pageSize=len(items),
                    totalItems=len(items),
                    totalPages=1,
                    hasNext=False,
                    hasPrevious=False,
                ),
            ),
            message="Field executives retrieved successfully",
            requestId=request_id,
        )


@router.get("/{employee_id}", response_model=ApiResponse[EmployeeResponse])
async def get_employee(
    employee_id: UUID,
    user: Annotated[CurrentUser, Depends(require_any_permission(["hr:read:all", "hr:read:subordinates"]))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get employee by ID."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = EmployeeService(db)
        employee = await service.get_employee(employee_id, user.tenant_id)

        role_map = await _get_employee_roles(db, [employee])
        role = role_map.get(str(employee.user_id)) if employee.user_id else None

        return ApiResponse(
            success=True,
            data=_employee_to_response(employee, role=role),
            message="Employee retrieved successfully",
            requestId=request_id
        )


@router.put("/{employee_id}", response_model=ApiResponse[EmployeeResponse])
async def update_employee(
    employee_id: UUID,
    body: EmployeeUpdateRequest,
    user: Annotated[CurrentUser, Depends(require_permission("hr:update:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Update employee and optionally update leave balances."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = EmployeeService(db)
        employee = await service.update_employee(
            employee_id=employee_id,
            tenant_id=user.tenant_id,
            updated_by=user.user_id,
            first_name=body.first_name,
            last_name=body.last_name,
            email=body.email,
            phone=body.phone,
            password=body.password,
            position_id=body.position_id,
            department_id=body.department_id,
            manager_id=body.manager_id,
            status=body.status,
            employment_type=body.employment_type,
            salary=body.salary,
            date_of_exit=body.date_of_exit
        )

        # Update leave balances if provided
        if body.leave_balances:
            from datetime import date
            leave_service = LeaveService(db)
            # Ensure balances are initialized first
            await leave_service.initialize_employee_balances(
                employee_id, user.tenant_id, date.today().year
            )
            await leave_service.apply_custom_balances(
                employee_id, user.tenant_id, date.today().year, body.leave_balances
            )

        return ApiResponse(
            success=True,
            data=_employee_to_response(employee),
            message="Employee updated successfully",
            requestId=request_id
        )


@router.delete("/{employee_id}", response_model=ApiResponse[None])
async def delete_employee(
    employee_id: UUID,
    user: Annotated[CurrentUser, Depends(require_permission("hr:delete:all"))],
    reason: str | None = Query(None),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Soft delete employee."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = EmployeeService(db)
        await service.delete_employee(
            employee_id, user.tenant_id, user.user_id, reason
        )

        return ApiResponse(
            success=True,
            message="Employee deleted successfully",
            requestId=request_id
        )


@router.put("/{employee_id}/change-password", response_model=ApiResponse[None])
async def change_employee_password(
    employee_id: UUID,
    body: EmployeeChangePasswordRequest,
    user: Annotated[CurrentUser, Depends(require_permission("hr:update:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Change employee password. Requires Super Admin role."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    # Only Super Admin can change passwords
    if not user.is_super_admin():
        from shared.exceptions import AuthzInsufficientPermissionException
        raise AuthzInsufficientPermissionException("change-password")

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        from sqlalchemy import text
        service = EmployeeService(db)
        employee = await service.get_employee(employee_id, user.tenant_id)
        new_hash = hash_password(body.password)
        employee.password_hash = new_hash
        employee.updated_by = user.user_id

        # Also update the linked user record for login
        if employee.user_id:
            await db.execute(
                text("UPDATE users SET password_hash = :pwd, updated_at = NOW() WHERE id = :uid"),
                {"pwd": new_hash, "uid": str(employee.user_id)}
            )

        await db.commit()

        return ApiResponse(
            success=True,
            message="Password changed successfully",
            requestId=request_id
        )


@router.put("/{employee_id}/status", response_model=ApiResponse[EmployeeResponse])
async def toggle_employee_status(
    employee_id: UUID,
    body: EmployeeStatusRequest,
    user: Annotated[CurrentUser, Depends(require_permission("hr:update:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Toggle employee status (Active/Inactive)."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        from sqlalchemy import text
        service = EmployeeService(db)
        employee = await service.update_employee(
            employee_id=employee_id,
            tenant_id=user.tenant_id,
            updated_by=user.user_id,
            status=body.status
        )

        # Sync user.is_active with employee status so login is blocked for inactive employees
        if employee.user_id:
            is_active = body.status in ("ACTIVE", "PROBATION", "ON_LEAVE")
            await db.execute(
                text("UPDATE users SET is_active = :active, updated_at = NOW() WHERE id = CAST(:uid AS UUID)"),
                {"active": is_active, "uid": str(employee.user_id)}
            )
            await db.commit()

        return ApiResponse(
            success=True,
            data=_employee_to_response(employee),
            message=f"Employee status changed to {body.status}",
            requestId=request_id
        )


@router.get("/{employee_id}/subordinates", response_model=ApiResponse[EmployeeListResponse])
async def get_subordinates(
    employee_id: UUID,
    user: Annotated[CurrentUser, Depends(require_any_permission(["hr:read:all", "hr:read:subordinates"]))],
    pagination: Annotated[PaginationParams, Depends(get_pagination_params)],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get direct subordinates of an employee."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = EmployeeService(db)
        employees, total = await service.get_subordinates(
            employee_id, user.tenant_id, pagination
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
            message="Subordinates retrieved successfully",
            requestId=request_id
        )


@router.get("/{employee_id}/hierarchy", response_model=ApiResponse[EmployeeResponse])
async def get_hierarchy(
    employee_id: UUID,
    user: Annotated[CurrentUser, Depends(require_permission("hr:read:all"))],
    depth: int = Query(default=3, ge=1, le=10),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get employee with hierarchy (subordinates tree)."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = EmployeeService(db)
        employee = await service.get_hierarchy(
            employee_id, user.tenant_id, depth
        )

        return ApiResponse(
            success=True,
            data=_employee_to_response(employee),
            message="Employee hierarchy retrieved successfully",
            requestId=request_id
        )
