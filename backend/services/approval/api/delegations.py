"""
MindFlow Approval Service - Delegation API Endpoints
Per API_CONTRACT.md Section 8.8.5
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.dependencies import get_current_user, get_tenant_id

from ..schemas.delegation import (
    DelegationCreateRequest,
    DelegationUpdateRequest,
    DelegationResponse,
    DelegationListResponse,
)
from ..services.delegation_service import DelegationService

router = APIRouter(prefix="/delegations", tags=["approval-delegations"])


@router.post(
    "",
    response_model=DelegationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create delegation rule",
)
async def create_delegation(
    data: DelegationCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Create a new delegation rule."""
    service = DelegationService(db)
    rule = await service.create(data, current_user["id"], tenant_id, current_user["id"])

    return DelegationResponse(
        id=rule.id,
        delegator_id=rule.delegator_id,
        delegate_id=rule.delegate_id,
        workflow_id=rule.workflow_id,
        valid_from=rule.valid_from,
        valid_to=rule.valid_to,
        reason=rule.reason,
        is_active=rule.is_active,
        is_currently_active=rule.is_currently_active,
        created_at=rule.created_at,
        updated_at=rule.updated_at,
    )


@router.get(
    "",
    response_model=DelegationListResponse,
    summary="List my delegations",
)
async def list_delegations(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    is_active: Optional[bool] = Query(None, alias="isActive"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """List delegation rules for the current user."""
    service = DelegationService(db)
    return await service.list(
        tenant_id,
        delegator_id=current_user["id"],
        page=page,
        limit=limit,
        is_active=is_active,
    )


@router.get(
    "/{delegation_id}",
    response_model=DelegationResponse,
    summary="Get delegation rule",
)
async def get_delegation(
    delegation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Get a delegation rule by ID."""
    service = DelegationService(db)
    rule = await service.get_by_id(delegation_id, tenant_id)
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delegation rule not found"
        )

    return DelegationResponse(
        id=rule.id,
        delegator_id=rule.delegator_id,
        delegate_id=rule.delegate_id,
        workflow_id=rule.workflow_id,
        valid_from=rule.valid_from,
        valid_to=rule.valid_to,
        reason=rule.reason,
        is_active=rule.is_active,
        is_currently_active=rule.is_currently_active,
        created_at=rule.created_at,
        updated_at=rule.updated_at,
    )


@router.put(
    "/{delegation_id}",
    response_model=DelegationResponse,
    summary="Update delegation rule",
)
async def update_delegation(
    delegation_id: UUID,
    data: DelegationUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Update a delegation rule."""
    service = DelegationService(db)
    rule = await service.get_by_id(delegation_id, tenant_id)
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delegation rule not found"
        )

    # Only delegator can update their own delegation
    if rule.delegator_id != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own delegations"
        )

    rule = await service.update(rule, data, current_user["id"])
    return await get_delegation(delegation_id, db, current_user, tenant_id)


@router.delete(
    "/{delegation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete delegation rule",
)
async def delete_delegation(
    delegation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Delete a delegation rule."""
    service = DelegationService(db)
    rule = await service.get_by_id(delegation_id, tenant_id)
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delegation rule not found"
        )

    # Only delegator can delete their own delegation
    if rule.delegator_id != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own delegations"
        )

    await service.delete(rule)
