"""
MindFlow Approval Service - Instance API Endpoints
Per API_CONTRACT.md Section 8.8.3-8.8.4
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.dependencies import get_current_user, get_tenant_id

from ..schemas.instance import (
    InstanceCreateRequest,
    InstanceResponse,
    InstanceDetailResponse,
    InstanceListResponse,
)
from ..schemas.decision import DecisionRequest, DelegateRequest, DecisionResponse
from ..schemas.step import StepResponse
from ..services.instance_service import InstanceService

router = APIRouter(prefix="/instances", tags=["approval-instances"])


@router.post(
    "",
    response_model=InstanceDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create approval instance",
)
async def create_instance(
    data: InstanceCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Create a new approval instance. Typically called by other services."""
    service = InstanceService(db)
    try:
        instance = await service.create(data, tenant_id, current_user["id"])
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return InstanceDetailResponse(
        id=instance.id,
        workflow_id=instance.workflow_id,
        workflow_name=instance.workflow.name if instance.workflow else None,
        entity_type=instance.entity_type,
        entity_id=instance.entity_id,
        requester_id=instance.requester_id,
        current_step_id=instance.current_step_id,
        current_step=StepResponse.model_validate(instance.current_step) if instance.current_step else None,
        status=instance.status,
        started_at=instance.started_at,
        completed_at=instance.completed_at,
        decisions=[],
        created_at=instance.created_at,
        updated_at=instance.updated_at,
    )


@router.get(
    "",
    response_model=InstanceListResponse,
    summary="List approval instances",
)
async def list_instances(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    workflow_id: Optional[UUID] = Query(None, alias="workflowId"),
    entity_type: Optional[str] = Query(None, alias="entityType"),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """List approval instances with pagination."""
    service = InstanceService(db)
    return await service.list(
        tenant_id,
        page=page,
        limit=limit,
        workflow_id=workflow_id,
        entity_type=entity_type,
        status=status,
    )


@router.get(
    "/my-pending",
    response_model=InstanceListResponse,
    summary="Get pending my approval",
)
async def get_pending_my_approval(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Get instances pending the current user's approval."""
    service = InstanceService(db)
    return await service.get_pending_my_approval(
        tenant_id, current_user["id"], page, limit
    )


@router.get(
    "/my-requests",
    response_model=InstanceListResponse,
    summary="Get my approval requests",
)
async def get_my_requests(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Get instances requested by the current user."""
    service = InstanceService(db)
    return await service.get_my_requests(
        tenant_id, current_user["id"], page, limit
    )


@router.get(
    "/{instance_id}",
    response_model=InstanceDetailResponse,
    summary="Get approval instance",
)
async def get_instance(
    instance_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Get an approval instance by ID."""
    service = InstanceService(db)
    instance = await service.get_by_id(instance_id, tenant_id)
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instance not found"
        )

    decisions = await service.get_decision_history(instance_id, tenant_id)

    return InstanceDetailResponse(
        id=instance.id,
        workflow_id=instance.workflow_id,
        workflow_name=instance.workflow.name if instance.workflow else None,
        entity_type=instance.entity_type,
        entity_id=instance.entity_id,
        requester_id=instance.requester_id,
        current_step_id=instance.current_step_id,
        current_step=StepResponse.model_validate(instance.current_step) if instance.current_step else None,
        status=instance.status,
        started_at=instance.started_at,
        completed_at=instance.completed_at,
        decisions=decisions,
        created_at=instance.created_at,
        updated_at=instance.updated_at,
    )


@router.get(
    "/{instance_id}/history",
    response_model=list[DecisionResponse],
    summary="Get decision history",
)
async def get_decision_history(
    instance_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Get decision history for an approval instance."""
    service = InstanceService(db)
    instance = await service.get_by_id(instance_id, tenant_id)
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instance not found"
        )
    return await service.get_decision_history(instance_id, tenant_id)


@router.post(
    "/{instance_id}/approve",
    response_model=InstanceDetailResponse,
    summary="Approve",
)
async def approve_instance(
    instance_id: UUID,
    data: DecisionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Approve the current step."""
    service = InstanceService(db)
    instance = await service.get_by_id(instance_id, tenant_id)
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instance not found"
        )
    if not instance.is_pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Instance is not pending"
        )

    try:
        instance = await service.approve(instance, data, current_user["id"])
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return await get_instance(instance_id, db, current_user, tenant_id)


@router.post(
    "/{instance_id}/reject",
    response_model=InstanceDetailResponse,
    summary="Reject",
)
async def reject_instance(
    instance_id: UUID,
    data: DecisionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Reject the approval."""
    service = InstanceService(db)
    instance = await service.get_by_id(instance_id, tenant_id)
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instance not found"
        )
    if not instance.is_pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Instance is not pending"
        )

    try:
        instance = await service.reject(instance, data, current_user["id"])
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return await get_instance(instance_id, db, current_user, tenant_id)


@router.post(
    "/{instance_id}/delegate",
    response_model=InstanceDetailResponse,
    summary="Delegate",
)
async def delegate_instance(
    instance_id: UUID,
    data: DelegateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Delegate the approval to another user."""
    service = InstanceService(db)
    instance = await service.get_by_id(instance_id, tenant_id)
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instance not found"
        )
    if not instance.is_pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Instance is not pending"
        )

    try:
        instance = await service.delegate(instance, data, current_user["id"])
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return await get_instance(instance_id, db, current_user, tenant_id)


@router.post(
    "/{instance_id}/request-info",
    response_model=InstanceDetailResponse,
    summary="Request more info",
)
async def request_info_instance(
    instance_id: UUID,
    data: DecisionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Request more information from the requester."""
    service = InstanceService(db)
    instance = await service.get_by_id(instance_id, tenant_id)
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instance not found"
        )
    if not instance.is_pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Instance is not pending"
        )

    try:
        instance = await service.request_info(instance, data, current_user["id"])
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return await get_instance(instance_id, db, current_user, tenant_id)
