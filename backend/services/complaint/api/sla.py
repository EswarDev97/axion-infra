"""
MindFlow Complaint Service - SLA Configuration API Endpoints
Per API_CONTRACT.md Section 8.7.5
"""

from typing import Annotated, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from shared.dependencies import get_current_user, get_tenant_id, get_db_session, CurrentUser
from shared.schemas import ApiResponse

from ..schemas.sla_config import (
    SLAConfigCreateRequest,
    SLAConfigUpdateRequest,
    SLAConfigResponse,
    SLAConfigListResponse,
)
from ..services.sla_service import SLAService

router = APIRouter(prefix="/sla", tags=["complaint-sla"])


@router.post(
    "",
    response_model=ApiResponse[SLAConfigResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create SLA configuration",
)
async def create_sla_config(
    data: SLAConfigCreateRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Create a new SLA configuration. Requires complaint:configure:sla permission."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = SLAService(db)
    sla_config = await service.create(data, tenant_id, current_user.user_id)

    return ApiResponse(
        success=True,
        data=SLAConfigResponse.model_validate(sla_config),
        message="SLA configuration created successfully",
        requestId=request_id
    )


@router.get(
    "",
    response_model=ApiResponse[SLAConfigListResponse],
    summary="List SLA configurations",
)
async def list_sla_configs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    category_id: Optional[UUID] = Query(None, alias="categoryId"),
    severity: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None, alias="isActive"),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """List SLA configurations with pagination."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = SLAService(db)
    result = await service.list(
        tenant_id,
        page=page,
        limit=limit,
        category_id=category_id,
        severity=severity,
        is_active=is_active,
    )

    return ApiResponse(
        success=True,
        data=result,
        message="SLA configurations retrieved successfully",
        requestId=request_id
    )


@router.get(
    "/{sla_id}",
    response_model=ApiResponse[SLAConfigResponse],
    summary="Get SLA configuration",
)
async def get_sla_config(
    sla_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Get an SLA configuration by ID."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = SLAService(db)
    sla_config = await service.get_by_id(sla_id, tenant_id)
    if not sla_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SLA configuration not found"
        )

    return ApiResponse(
        success=True,
        data=SLAConfigResponse.model_validate(sla_config),
        message="SLA configuration retrieved successfully",
        requestId=request_id
    )


@router.put(
    "/{sla_id}",
    response_model=ApiResponse[SLAConfigResponse],
    summary="Update SLA configuration",
)
async def update_sla_config(
    sla_id: UUID,
    data: SLAConfigUpdateRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Update an SLA configuration. Requires complaint:configure:sla permission."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = SLAService(db)
    sla_config = await service.get_by_id(sla_id, tenant_id)
    if not sla_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SLA configuration not found"
        )
    sla_config = await service.update(sla_config, data, current_user.user_id)

    return ApiResponse(
        success=True,
        data=SLAConfigResponse.model_validate(sla_config),
        message="SLA configuration updated successfully",
        requestId=request_id
    )


@router.delete(
    "/{sla_id}",
    response_model=ApiResponse[None],
    status_code=status.HTTP_200_OK,
    summary="Delete SLA configuration",
)
async def delete_sla_config(
    sla_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Delete an SLA configuration. Requires complaint:configure:sla permission."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = SLAService(db)
    sla_config = await service.get_by_id(sla_id, tenant_id)
    if not sla_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SLA configuration not found"
        )
    await service.delete(sla_config)

    return ApiResponse(
        success=True,
        data=None,
        message="SLA configuration deleted successfully",
        requestId=request_id
    )
