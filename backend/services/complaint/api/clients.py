"""
MindFlow Complaint Service - Client (Insurer/Client) API Endpoints
CRUD for the Insurer / Client master table.
"""

from typing import Annotated, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from shared.dependencies import get_current_user, get_tenant_id, get_db_session, CurrentUser
from shared.schemas import ApiResponse

from ..schemas.client import (
    ClientCreateRequest,
    ClientUpdateRequest,
    ClientResponse,
    ClientListResponse,
)
from ..services.client_service import ClientService

router = APIRouter(prefix="/clients", tags=["clients"])


@router.post(
    "",
    response_model=ApiResponse[ClientResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create client",
)
async def create_client(
    data: ClientCreateRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ClientService(db)
    client = await service.create(data, tenant_id, current_user.user_id)
    return ApiResponse(
        success=True,
        data=ClientResponse.model_validate(client),
        message="Client created successfully",
        requestId=request_id,
    )


@router.get(
    "",
    response_model=ApiResponse[ClientListResponse],
    summary="List clients",
)
async def list_clients(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    is_active: Optional[bool] = Query(None, alias="isActive"),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ClientService(db)
    result = await service.list(tenant_id, page, limit, is_active, search)
    return ApiResponse(
        success=True,
        data=result,
        message="Clients retrieved successfully",
        requestId=request_id,
    )


@router.get(
    "/{client_id}",
    response_model=ApiResponse[ClientResponse],
    summary="Get client",
)
async def get_client(
    client_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ClientService(db)
    client = await service.get_by_id(client_id, tenant_id)
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    return ApiResponse(
        success=True,
        data=ClientResponse.model_validate(client),
        message="Client retrieved successfully",
        requestId=request_id,
    )


@router.put(
    "/{client_id}",
    response_model=ApiResponse[ClientResponse],
    summary="Update client",
)
async def update_client(
    client_id: UUID,
    data: ClientUpdateRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ClientService(db)
    client = await service.get_by_id(client_id, tenant_id)
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    client = await service.update(client, data, current_user.user_id)
    return ApiResponse(
        success=True,
        data=ClientResponse.model_validate(client),
        message="Client updated successfully",
        requestId=request_id,
    )


@router.delete(
    "/{client_id}",
    response_model=ApiResponse[None],
    summary="Delete client",
)
async def delete_client(
    client_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ClientService(db)
    client = await service.get_by_id(client_id, tenant_id)
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    await service.delete(client)
    return ApiResponse(
        success=True,
        data=None,
        message="Client deleted successfully",
        requestId=request_id,
    )
