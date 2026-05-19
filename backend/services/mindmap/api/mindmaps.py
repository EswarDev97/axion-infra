"""
MindFlow Mind Map Service - Mind Map API Routes
Per API_CONTRACT.md
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.dependencies import get_current_user, get_tenant_id
from ..schemas import (
    MindMapCreateRequest,
    MindMapDetailResponse,
    MindMapDuplicateRequest,
    MindMapFilters,
    MindMapFromTemplateRequest,
    MindMapListResponse,
    MindMapNodeSummary,
    MindMapResponse,
    MindMapUpdateRequest,
    NodePositionUpdate,
)
from ..services import MindMapService, NodeService

router = APIRouter()


@router.post(
    "",
    response_model=MindMapResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a mind map",
)
async def create_mind_map(
    data: MindMapCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Create a new mind map."""
    service = MindMapService(db)
    mind_map = await service.create_mind_map(
        tenant_id=tenant_id,
        user_id=current_user["id"],
        data=data,
    )
    return mind_map


@router.post(
    "/from-template",
    response_model=MindMapDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create mind map from template",
)
async def create_from_template(
    data: MindMapFromTemplateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Create a new mind map from a template."""
    service = MindMapService(db)
    mind_map = await service.create_from_template(
        tenant_id=tenant_id,
        user_id=current_user["id"],
        data=data,
    )

    if not mind_map:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    # Get with nodes
    mind_map = await service.get_mind_map(tenant_id, mind_map.id, include_nodes=True)

    return _build_detail_response(mind_map)


@router.get(
    "",
    response_model=MindMapListResponse,
    summary="List mind maps",
)
async def list_mind_maps(
    status_filter: str = Query(None, alias="status"),
    template_id: UUID = Query(None, alias="templateId"),
    created_by: UUID = Query(None, alias="createdBy"),
    search: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """List mind maps with filters."""
    filters = MindMapFilters(
        status=status_filter,
        template_id=template_id,
        created_by=created_by,
        search=search,
        page=page,
        page_size=page_size,
    )

    service = MindMapService(db)
    mind_maps, total = await service.list_mind_maps(tenant_id, filters)

    total_pages = (total + page_size - 1) // page_size

    return MindMapListResponse(
        items=mind_maps,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get(
    "/{mind_map_id}",
    response_model=MindMapDetailResponse,
    summary="Get a mind map",
)
async def get_mind_map(
    mind_map_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Get a mind map with all nodes."""
    service = MindMapService(db)
    mind_map = await service.get_mind_map(tenant_id, mind_map_id, include_nodes=True)

    if not mind_map:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mind map not found",
        )

    return _build_detail_response(mind_map)


@router.put(
    "/{mind_map_id}",
    response_model=MindMapResponse,
    summary="Update a mind map",
)
async def update_mind_map(
    mind_map_id: UUID,
    data: MindMapUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Update a mind map."""
    service = MindMapService(db)
    mind_map = await service.update_mind_map(
        tenant_id=tenant_id,
        mind_map_id=mind_map_id,
        user_id=current_user["id"],
        data=data,
    )

    if not mind_map:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mind map not found",
        )

    return mind_map


@router.delete(
    "/{mind_map_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a mind map",
)
async def delete_mind_map(
    mind_map_id: UUID,
    reason: str = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Soft delete a mind map."""
    service = MindMapService(db)
    deleted = await service.delete_mind_map(
        tenant_id=tenant_id,
        mind_map_id=mind_map_id,
        user_id=current_user["id"],
        reason=reason,
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mind map not found",
        )


@router.post(
    "/{mind_map_id}/archive",
    response_model=MindMapResponse,
    summary="Archive a mind map",
)
async def archive_mind_map(
    mind_map_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Archive a mind map."""
    service = MindMapService(db)
    mind_map = await service.archive_mind_map(
        tenant_id=tenant_id,
        mind_map_id=mind_map_id,
        user_id=current_user["id"],
    )

    if not mind_map:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mind map not found",
        )

    return mind_map


@router.post(
    "/{mind_map_id}/restore",
    response_model=MindMapResponse,
    summary="Restore an archived mind map",
)
async def restore_mind_map(
    mind_map_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Restore an archived mind map to active status."""
    service = MindMapService(db)
    mind_map = await service.restore_mind_map(
        tenant_id=tenant_id,
        mind_map_id=mind_map_id,
        user_id=current_user["id"],
    )

    if not mind_map:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mind map not found",
        )

    return mind_map


@router.post(
    "/{mind_map_id}/duplicate",
    response_model=MindMapDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Duplicate a mind map",
)
async def duplicate_mind_map(
    mind_map_id: UUID,
    data: MindMapDuplicateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Duplicate a mind map with all its nodes."""
    service = MindMapService(db)
    mind_map = await service.duplicate_mind_map(
        tenant_id=tenant_id,
        mind_map_id=mind_map_id,
        user_id=current_user["id"],
        data=data,
    )

    if not mind_map:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mind map not found",
        )

    # Get with nodes
    mind_map = await service.get_mind_map(tenant_id, mind_map.id, include_nodes=True)

    return _build_detail_response(mind_map)


@router.put(
    "/{mind_map_id}/positions",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Update node positions",
)
async def update_positions(
    mind_map_id: UUID,
    positions: List[NodePositionUpdate],
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Bulk update node positions for a mind map."""
    node_service = NodeService(db)
    await node_service.update_positions(
        tenant_id=tenant_id,
        mind_map_id=mind_map_id,
        user_id=current_user["id"],
        positions=positions,
    )


def _build_detail_response(mind_map) -> MindMapDetailResponse:
    """Build detailed response with nodes."""
    nodes = []
    if mind_map.nodes:
        for node in mind_map.nodes:
            if not node.is_deleted:
                nodes.append(
                    MindMapNodeSummary(
                        id=node.id,
                        title=node.title,
                        node_type=node.node_type,
                        parent_node_id=node.parent_node_id,
                        x_position=float(node.x_position),
                        y_position=float(node.y_position),
                        display_order=node.display_order,
                        visual_metadata=node.visual_metadata or {},
                        linked_task_id=node.linked_task_id,
                        child_count=node.child_count,
                    )
                )

    return MindMapDetailResponse(
        id=mind_map.id,
        tenant_id=mind_map.tenant_id,
        title=mind_map.title,
        description=mind_map.description,
        status=mind_map.status,
        template_id=mind_map.template_id,
        theme_settings=mind_map.theme_settings or {},
        nodes=nodes,
        node_count=len(nodes),
        created_at=mind_map.created_at,
        updated_at=mind_map.updated_at,
        created_by=mind_map.created_by,
        updated_by=mind_map.updated_by,
    )
