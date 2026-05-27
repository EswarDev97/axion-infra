"""
MindFlow HR Service - CRM Lead Endpoints
Micro-CRM for Operating Office outreach tracking.
"""

from typing import Annotated, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status

from shared.database import db_manager
from shared.dependencies import CurrentUser, get_pagination_params, require_permission
from shared.schemas import ApiResponse, PaginationParams

from ..models.crm_lead import InterestLevel
from ..schemas.crm_lead import (
    CrmLeadCreateRequest,
    CrmLeadListResponse,
    CrmLeadResponse,
    CrmLeadUpdateRequest,
)
from ..services.crm_lead_service import CrmLeadService

router = APIRouter(prefix="/crm/leads", tags=["crm"])


@router.get("", response_model=ApiResponse[CrmLeadListResponse])
async def list_crm_leads(
    user: Annotated[CurrentUser, Depends(require_permission("hr:read:all"))],
    pagination: Annotated[PaginationParams, Depends(get_pagination_params)],
    interest_level: Optional[InterestLevel] = Query(None, alias="interestLevel"),
    search: Optional[str] = Query(None),
    overdue_only: bool = Query(False, alias="overdueOnly"),
    x_request_id: Annotated[str | None, Header()] = None,
):
    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = CrmLeadService(db)
        leads, total, total_pages = await service.list(
            tenant_id=user.tenant_id,
            page=pagination.page,
            page_size=pagination.page_size,
            interest_level=interest_level,
            search=search,
            overdue_only=overdue_only,
        )
        items = [CrmLeadResponse.from_model(lead) for lead in leads]
        response_data = CrmLeadListResponse(
            items=items,
            total=total,
            page=pagination.page,
            pageSize=pagination.page_size,
            totalPages=total_pages,
            hasNext=pagination.page < total_pages,
            hasPrevious=pagination.page > 1,
        )
    return ApiResponse(
        success=True,
        data=response_data,
        requestId=UUID(x_request_id) if x_request_id else uuid4(),
    )


@router.post("", response_model=ApiResponse[CrmLeadResponse], status_code=status.HTTP_201_CREATED)
async def create_crm_lead(
    data: CrmLeadCreateRequest,
    user: Annotated[CurrentUser, Depends(require_permission("hr:write:all"))],
    x_request_id: Annotated[str | None, Header()] = None,
):
    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = CrmLeadService(db)
        lead = await service.create(data, tenant_id=user.tenant_id, user_id=user.user_id)
    return ApiResponse(
        success=True,
        data=CrmLeadResponse.from_model(lead),
        requestId=UUID(x_request_id) if x_request_id else uuid4(),
    )


@router.get("/{lead_id}", response_model=ApiResponse[CrmLeadResponse])
async def get_crm_lead(
    lead_id: UUID,
    user: Annotated[CurrentUser, Depends(require_permission("hr:read:all"))],
    x_request_id: Annotated[str | None, Header()] = None,
):
    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = CrmLeadService(db)
        lead = await service.get_by_id(lead_id, user.tenant_id)
    if not lead:
        raise HTTPException(status_code=404, detail="CRM lead not found")
    return ApiResponse(
        success=True,
        data=CrmLeadResponse.from_model(lead),
        requestId=UUID(x_request_id) if x_request_id else uuid4(),
    )


@router.put("/{lead_id}", response_model=ApiResponse[CrmLeadResponse])
async def update_crm_lead(
    lead_id: UUID,
    data: CrmLeadUpdateRequest,
    user: Annotated[CurrentUser, Depends(require_permission("hr:write:all"))],
    x_request_id: Annotated[str | None, Header()] = None,
):
    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = CrmLeadService(db)
        lead = await service.get_by_id(lead_id, user.tenant_id)
        if not lead:
            raise HTTPException(status_code=404, detail="CRM lead not found")
        lead = await service.update(lead, data, user_id=user.user_id)
    return ApiResponse(
        success=True,
        data=CrmLeadResponse.from_model(lead),
        requestId=UUID(x_request_id) if x_request_id else uuid4(),
    )


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_crm_lead(
    lead_id: UUID,
    user: Annotated[CurrentUser, Depends(require_permission("hr:write:all"))],
):
    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = CrmLeadService(db)
        lead = await service.get_by_id(lead_id, user.tenant_id)
        if not lead:
            raise HTTPException(status_code=404, detail="CRM lead not found")
        await service.delete(lead)
