"""
MindFlow Approval Service - Workflow API Endpoints
Per API_CONTRACT.md Section 8.8.1-8.8.2
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.dependencies import get_current_user, get_tenant_id

from ..schemas.workflow import (
    WorkflowCreateRequest,
    WorkflowUpdateRequest,
    WorkflowResponse,
    WorkflowDetailResponse,
    WorkflowListResponse,
)
from ..schemas.step import StepCreateRequest, StepUpdateRequest, StepResponse, StepReorderRequest
from ..services.workflow_service import WorkflowService

router = APIRouter(prefix="/workflows", tags=["approval-workflows"])


@router.post(
    "",
    response_model=WorkflowDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create approval workflow",
)
async def create_workflow(
    data: WorkflowCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Create a new approval workflow. Requires SYSTEM_ADMIN role."""
    service = WorkflowService(db)
    workflow = await service.create(data, tenant_id, current_user["id"])

    return WorkflowDetailResponse(
        id=workflow.id,
        name=workflow.name,
        code=workflow.code,
        entity_type=workflow.entity_type,
        description=workflow.description,
        is_active=workflow.is_active,
        steps=[StepResponse.model_validate(s) for s in workflow.steps],
        created_at=workflow.created_at,
        updated_at=workflow.updated_at,
    )


@router.get(
    "",
    response_model=WorkflowListResponse,
    summary="List approval workflows",
)
async def list_workflows(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    entity_type: Optional[str] = Query(None, alias="entityType"),
    is_active: Optional[bool] = Query(None, alias="isActive"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """List approval workflows with pagination."""
    service = WorkflowService(db)
    return await service.list(
        tenant_id,
        page=page,
        limit=limit,
        entity_type=entity_type,
        is_active=is_active,
    )


@router.get(
    "/{workflow_id}",
    response_model=WorkflowDetailResponse,
    summary="Get approval workflow",
)
async def get_workflow(
    workflow_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Get an approval workflow by ID."""
    service = WorkflowService(db)
    workflow = await service.get_by_id(workflow_id, tenant_id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )

    return WorkflowDetailResponse(
        id=workflow.id,
        name=workflow.name,
        code=workflow.code,
        entity_type=workflow.entity_type,
        description=workflow.description,
        is_active=workflow.is_active,
        steps=[StepResponse.model_validate(s) for s in workflow.steps],
        created_at=workflow.created_at,
        updated_at=workflow.updated_at,
    )


@router.put(
    "/{workflow_id}",
    response_model=WorkflowDetailResponse,
    summary="Update approval workflow",
)
async def update_workflow(
    workflow_id: UUID,
    data: WorkflowUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Update an approval workflow. Requires SYSTEM_ADMIN role."""
    service = WorkflowService(db)
    workflow = await service.get_by_id(workflow_id, tenant_id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )
    workflow = await service.update(workflow, data, current_user["id"])
    return await get_workflow(workflow_id, db, current_user, tenant_id)


@router.delete(
    "/{workflow_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete approval workflow",
)
async def delete_workflow(
    workflow_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Delete an approval workflow. Requires SYSTEM_ADMIN role."""
    service = WorkflowService(db)
    workflow = await service.get_by_id(workflow_id, tenant_id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )

    # Check if workflow has instances
    has_instances = await service.has_instances(workflow_id, tenant_id)
    if has_instances:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete workflow with existing instances"
        )

    await service.delete(workflow)


@router.post(
    "/{workflow_id}/activate",
    response_model=WorkflowDetailResponse,
    summary="Activate approval workflow",
)
async def activate_workflow(
    workflow_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Activate an approval workflow. Requires SYSTEM_ADMIN role."""
    service = WorkflowService(db)
    workflow = await service.get_by_id(workflow_id, tenant_id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )
    workflow = await service.activate(workflow, current_user["id"])
    return await get_workflow(workflow_id, db, current_user, tenant_id)


@router.post(
    "/{workflow_id}/deactivate",
    response_model=WorkflowDetailResponse,
    summary="Deactivate approval workflow",
)
async def deactivate_workflow(
    workflow_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Deactivate an approval workflow. Requires SYSTEM_ADMIN role."""
    service = WorkflowService(db)
    workflow = await service.get_by_id(workflow_id, tenant_id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )
    workflow = await service.deactivate(workflow, current_user["id"])
    return await get_workflow(workflow_id, db, current_user, tenant_id)


# Step endpoints
@router.get(
    "/{workflow_id}/steps",
    response_model=list[StepResponse],
    summary="List workflow steps",
)
async def list_steps(
    workflow_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """List steps for a workflow."""
    service = WorkflowService(db)
    workflow = await service.get_by_id(workflow_id, tenant_id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )
    return [StepResponse.model_validate(s) for s in workflow.steps]


@router.post(
    "/{workflow_id}/steps",
    response_model=StepResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add workflow step",
)
async def add_step(
    workflow_id: UUID,
    data: StepCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Add a step to a workflow. Requires SYSTEM_ADMIN role."""
    service = WorkflowService(db)
    workflow = await service.get_by_id(workflow_id, tenant_id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )
    step = await service.add_step(workflow, data, tenant_id, current_user["id"])
    return StepResponse.model_validate(step)


@router.put(
    "/{workflow_id}/steps/{step_id}",
    response_model=StepResponse,
    summary="Update workflow step",
)
async def update_step(
    workflow_id: UUID,
    step_id: UUID,
    data: StepUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Update a workflow step. Requires SYSTEM_ADMIN role."""
    service = WorkflowService(db)
    step = await service.get_step(step_id, tenant_id)
    if not step or step.workflow_id != workflow_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Step not found"
        )
    step = await service.update_step(step, data, current_user["id"])
    return StepResponse.model_validate(step)


@router.delete(
    "/{workflow_id}/steps/{step_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete workflow step",
)
async def delete_step(
    workflow_id: UUID,
    step_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Delete a workflow step. Requires SYSTEM_ADMIN role."""
    service = WorkflowService(db)
    step = await service.get_step(step_id, tenant_id)
    if not step or step.workflow_id != workflow_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Step not found"
        )
    await service.delete_step(step)


@router.put(
    "/{workflow_id}/steps/reorder",
    response_model=list[StepResponse],
    summary="Reorder workflow steps",
)
async def reorder_steps(
    workflow_id: UUID,
    data: StepReorderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Reorder steps in a workflow. Requires SYSTEM_ADMIN role."""
    service = WorkflowService(db)
    workflow = await service.get_by_id(workflow_id, tenant_id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )
    steps = await service.reorder_steps(workflow, data, current_user["id"])
    return [StepResponse.model_validate(s) for s in steps]
