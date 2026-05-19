"""
MindFlow Auth Service - Tenant Management Endpoints
Per API_CONTRACT.md Section 8.1.4

Endpoints:
- GET /tenants - List all tenants (SUPER_ADMIN only)
- POST /tenants - Create new tenant (SUPER_ADMIN only)
- GET /tenants/{tenant_id} - Get tenant details
- PUT /tenants/{tenant_id} - Update tenant
- DELETE /tenants/{tenant_id} - Deactivate tenant (SUPER_ADMIN only)
"""

from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import db_manager
from shared.dependencies import CurrentUser, get_pagination_params, require_role
from shared.exceptions import (
    AuthzInsufficientPermissionException,
    ResourceAlreadyExistsException,
    ResourceNotFoundException,
)
from shared.schemas import ApiResponse, PaginationMeta, PaginationParams

from ..models import Tenant
from ..schemas import (
    TenantCreateRequest,
    TenantListResponse,
    TenantResponse,
    TenantUpdateRequest,
)

router = APIRouter(prefix="/tenants", tags=["tenants"])


def _tenant_to_response(tenant: Tenant) -> TenantResponse:
    """Convert Tenant model to TenantResponse schema."""
    return TenantResponse(
        id=tenant.id,
        name=tenant.name,
        slug=tenant.slug,
        status=tenant.status,
        settings=tenant.settings,
        createdAt=tenant.created_at,
        updatedAt=tenant.updated_at
    )


@router.get("", response_model=ApiResponse[TenantListResponse])
async def list_tenants(
    user: Annotated[CurrentUser, Depends(require_role("SUPER_ADMIN"))],
    pagination: Annotated[PaginationParams, Depends(get_pagination_params)],
    x_request_id: Annotated[str | None, Header()] = None
):
    """
    List all tenants.

    Requires role: SUPER_ADMIN
    """
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session() as db:
        # Count
        count_stmt = select(func.count()).select_from(Tenant)
        result = await db.execute(count_stmt)
        total = result.scalar() or 0

        # List
        stmt = select(Tenant).offset(pagination.offset).limit(pagination.page_size)
        if hasattr(Tenant, pagination.sort_by):
            order_col = getattr(Tenant, pagination.sort_by)
            if pagination.sort_order == "desc":
                stmt = stmt.order_by(order_col.desc())
            else:
                stmt = stmt.order_by(order_col.asc())

        result = await db.execute(stmt)
        tenants = list(result.scalars().all())

        items = [_tenant_to_response(t) for t in tenants]
        total_pages = (total + pagination.page_size - 1) // pagination.page_size

        data = TenantListResponse(
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
            data=data,
            message="Tenants retrieved successfully",
            requestId=request_id
        )


@router.post("", response_model=ApiResponse[TenantResponse], status_code=201)
async def create_tenant(
    body: TenantCreateRequest,
    user: Annotated[CurrentUser, Depends(require_role("SUPER_ADMIN"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """
    Create new tenant.

    Requires role: SUPER_ADMIN
    """
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session() as db:
        # Check if slug exists
        stmt = select(Tenant).where(Tenant.slug == body.slug)
        result = await db.execute(stmt)
        if result.scalar_one_or_none():
            raise ResourceAlreadyExistsException("Tenant", body.slug)

        tenant = Tenant(
            name=body.name,
            slug=body.slug,
            status="ACTIVE",
            settings=body.settings or {}
        )
        db.add(tenant)
        await db.commit()
        await db.refresh(tenant)

        return ApiResponse(
            success=True,
            data=_tenant_to_response(tenant),
            message="Tenant created successfully",
            requestId=request_id
        )


@router.get("/{tenant_id}", response_model=ApiResponse[TenantResponse])
async def get_tenant(
    tenant_id: UUID,
    user: Annotated[CurrentUser, Depends(require_role("SYSTEM_ADMIN"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """
    Get tenant details.

    Requires role: SUPER_ADMIN or own tenant (SYSTEM_ADMIN)
    """
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    # Check permission
    if not user.is_super_admin() and user.tenant_id != tenant_id:
        raise AuthzInsufficientPermissionException(
            "You can only view your own tenant"
        )

    async with db_manager.session() as db:
        stmt = select(Tenant).where(Tenant.id == tenant_id)
        result = await db.execute(stmt)
        tenant = result.scalar_one_or_none()

        if not tenant:
            raise ResourceNotFoundException("Tenant", str(tenant_id))

        return ApiResponse(
            success=True,
            data=_tenant_to_response(tenant),
            message="Tenant retrieved successfully",
            requestId=request_id
        )


@router.put("/{tenant_id}", response_model=ApiResponse[TenantResponse])
async def update_tenant(
    tenant_id: UUID,
    body: TenantUpdateRequest,
    user: Annotated[CurrentUser, Depends(require_role("SYSTEM_ADMIN"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """
    Update tenant.

    Requires role: SUPER_ADMIN or SYSTEM_ADMIN for own tenant
    """
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    # Check permission
    if not user.is_super_admin() and user.tenant_id != tenant_id:
        raise AuthzInsufficientPermissionException(
            "You can only update your own tenant"
        )

    async with db_manager.session() as db:
        stmt = select(Tenant).where(Tenant.id == tenant_id)
        result = await db.execute(stmt)
        tenant = result.scalar_one_or_none()

        if not tenant:
            raise ResourceNotFoundException("Tenant", str(tenant_id))

        if body.name:
            tenant.name = body.name
        if body.status:
            tenant.status = body.status
        if body.settings is not None:
            tenant.settings = body.settings

        await db.commit()
        await db.refresh(tenant)

        return ApiResponse(
            success=True,
            data=_tenant_to_response(tenant),
            message="Tenant updated successfully",
            requestId=request_id
        )


@router.delete("/{tenant_id}", response_model=ApiResponse[None])
async def deactivate_tenant(
    tenant_id: UUID,
    user: Annotated[CurrentUser, Depends(require_role("SUPER_ADMIN"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """
    Deactivate tenant.

    Requires role: SUPER_ADMIN
    """
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session() as db:
        stmt = select(Tenant).where(Tenant.id == tenant_id)
        result = await db.execute(stmt)
        tenant = result.scalar_one_or_none()

        if not tenant:
            raise ResourceNotFoundException("Tenant", str(tenant_id))

        tenant.status = "INACTIVE"
        await db.commit()

        return ApiResponse(
            success=True,
            message="Tenant deactivated successfully",
            requestId=request_id
        )
