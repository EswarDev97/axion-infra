"""
MindFlow Complaint Service - Escalation Rule API Endpoints
Per API_CONTRACT.md Section 8.7.6
"""

from typing import Annotated, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from shared.dependencies import get_current_user, get_tenant_id, get_db_session, CurrentUser
from shared.schemas import ApiResponse

from ..schemas.escalation_rule import (
    EscalationRuleCreateRequest,
    EscalationRuleUpdateRequest,
    EscalationRuleResponse,
    EscalationRuleListResponse,
)
from ..services.escalation_service import EscalationService

router = APIRouter(prefix="/escalation-rules", tags=["complaint-escalation"])


@router.post(
    "",
    response_model=ApiResponse[EscalationRuleResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create escalation rule",
)
async def create_escalation_rule(
    data: EscalationRuleCreateRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Create a new escalation rule. Requires complaint:configure:sla permission."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = EscalationService(db)
    rule = await service.create(data, tenant_id, current_user.user_id)

    return ApiResponse(
        success=True,
        data=EscalationRuleResponse.model_validate(rule),
        message="Escalation rule created successfully",
        requestId=request_id
    )


@router.get(
    "",
    response_model=ApiResponse[EscalationRuleListResponse],
    summary="List escalation rules",
)
async def list_escalation_rules(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    category_id: Optional[UUID] = Query(None, alias="categoryId"),
    is_active: Optional[bool] = Query(None, alias="isActive"),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """List escalation rules with pagination."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = EscalationService(db)
    result = await service.list(
        tenant_id,
        page=page,
        limit=limit,
        category_id=category_id,
        is_active=is_active,
    )

    return ApiResponse(
        success=True,
        data=result,
        message="Escalation rules retrieved successfully",
        requestId=request_id
    )


@router.get(
    "/{rule_id}",
    response_model=ApiResponse[EscalationRuleResponse],
    summary="Get escalation rule",
)
async def get_escalation_rule(
    rule_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Get an escalation rule by ID."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = EscalationService(db)
    rule = await service.get_by_id(rule_id, tenant_id)
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Escalation rule not found"
        )

    return ApiResponse(
        success=True,
        data=EscalationRuleResponse.model_validate(rule),
        message="Escalation rule retrieved successfully",
        requestId=request_id
    )


@router.put(
    "/{rule_id}",
    response_model=ApiResponse[EscalationRuleResponse],
    summary="Update escalation rule",
)
async def update_escalation_rule(
    rule_id: UUID,
    data: EscalationRuleUpdateRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Update an escalation rule. Requires complaint:configure:sla permission."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = EscalationService(db)
    rule = await service.get_by_id(rule_id, tenant_id)
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Escalation rule not found"
        )
    rule = await service.update(rule, data, current_user.user_id)

    return ApiResponse(
        success=True,
        data=EscalationRuleResponse.model_validate(rule),
        message="Escalation rule updated successfully",
        requestId=request_id
    )


@router.delete(
    "/{rule_id}",
    response_model=ApiResponse[None],
    status_code=status.HTTP_200_OK,
    summary="Delete escalation rule",
)
async def delete_escalation_rule(
    rule_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Delete an escalation rule. Requires complaint:configure:sla permission."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    service = EscalationService(db)
    rule = await service.get_by_id(rule_id, tenant_id)
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Escalation rule not found"
        )
    await service.delete(rule)

    return ApiResponse(
        success=True,
        data=None,
        message="Escalation rule deleted successfully",
        requestId=request_id
    )
