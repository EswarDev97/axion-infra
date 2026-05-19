"""
MindFlow Mind Map Service - Node API Routes
Per API_CONTRACT.md
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.dependencies import get_current_user, get_tenant_id
from ..schemas import (
    MindMapNodeBulkCreateRequest,
    MindMapNodeBulkDeleteRequest,
    MindMapNodeCreateRequest,
    MindMapNodeMoveRequest,
    MindMapNodeResponse,
    MindMapNodeUpdateRequest,
    NodeAttachmentCreateRequest,
    NodeAttachmentListResponse,
    NodeAttachmentResponse,
    NodeAttachmentSummary,
    NodeToTaskConvertRequest,
    NodeToTaskConvertResponse,
)
from ..services import NodeService

router = APIRouter()


# ==================== Node Endpoints ====================

@router.post(
    "/mindmap/{mind_map_id}",
    response_model=MindMapNodeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a node",
)
async def create_node(
    mind_map_id: UUID,
    data: MindMapNodeCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Create a new node in a mind map."""
    service = NodeService(db)
    node = await service.create_node(
        tenant_id=tenant_id,
        mind_map_id=mind_map_id,
        user_id=current_user["id"],
        data=data,
    )

    if not node:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid mind map or parent node",
        )

    return _build_node_response(node)


@router.post(
    "/mindmap/{mind_map_id}/bulk",
    response_model=List[MindMapNodeResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Bulk create nodes",
)
async def bulk_create_nodes(
    mind_map_id: UUID,
    data: MindMapNodeBulkCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Create multiple nodes at once."""
    service = NodeService(db)
    nodes = await service.bulk_create_nodes(
        tenant_id=tenant_id,
        mind_map_id=mind_map_id,
        user_id=current_user["id"],
        data=data,
    )

    return [_build_node_response(node) for node in nodes]


@router.get(
    "/mindmap/{mind_map_id}",
    response_model=List[MindMapNodeResponse],
    summary="Get nodes for a mind map",
)
async def get_nodes_by_mind_map(
    mind_map_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Get all nodes for a mind map."""
    service = NodeService(db)
    nodes = await service.get_nodes_by_mind_map(tenant_id, mind_map_id)
    return [_build_node_response(node) for node in nodes]


@router.get(
    "/{node_id}",
    response_model=MindMapNodeResponse,
    summary="Get a node",
)
async def get_node(
    node_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Get a node by ID."""
    service = NodeService(db)
    node = await service.get_node(tenant_id, node_id, include_attachments=True)

    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found",
        )

    return _build_node_response(node)


@router.put(
    "/{node_id}",
    response_model=MindMapNodeResponse,
    summary="Update a node",
)
async def update_node(
    node_id: UUID,
    data: MindMapNodeUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Update a node."""
    service = NodeService(db)
    node = await service.update_node(
        tenant_id=tenant_id,
        node_id=node_id,
        user_id=current_user["id"],
        data=data,
    )

    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found",
        )

    return _build_node_response(node)


@router.delete(
    "/{node_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a node",
)
async def delete_node(
    node_id: UUID,
    reason: str = Query(None),
    cascade: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Soft delete a node (and optionally its children)."""
    service = NodeService(db)
    deleted = await service.delete_node(
        tenant_id=tenant_id,
        node_id=node_id,
        user_id=current_user["id"],
        reason=reason,
        cascade=cascade,
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found",
        )


@router.post(
    "/bulk-delete",
    status_code=status.HTTP_200_OK,
    summary="Bulk delete nodes",
)
async def bulk_delete_nodes(
    data: MindMapNodeBulkDeleteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Soft delete multiple nodes."""
    service = NodeService(db)
    deleted_count = await service.bulk_delete_nodes(
        tenant_id=tenant_id,
        user_id=current_user["id"],
        data=data,
    )

    return {"deleted_count": deleted_count}


@router.post(
    "/{node_id}/move",
    response_model=MindMapNodeResponse,
    summary="Move a node",
)
async def move_node(
    node_id: UUID,
    data: MindMapNodeMoveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Move a node to a new parent."""
    service = NodeService(db)
    node = await service.move_node(
        tenant_id=tenant_id,
        node_id=node_id,
        user_id=current_user["id"],
        data=data,
    )

    if not node:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid move operation (node not found or would create cycle)",
        )

    return _build_node_response(node)


# ==================== Node to Task Conversion ====================

@router.post(
    "/{node_id}/convert-to-task",
    response_model=NodeToTaskConvertResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Convert node to task",
)
async def convert_node_to_task(
    node_id: UUID,
    data: NodeToTaskConvertRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """
    Convert a mind map node to a task in task-service.

    This creates a task based on the node's title and description,
    and links the node to the created task.
    """
    from shared.integrations import get_task_client
    from datetime import datetime

    service = NodeService(db)
    node = await service.get_node(tenant_id, node_id)

    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found",
        )

    if node.linked_task_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Node is already linked to a task",
        )

    # Get auth token from request
    auth_header = request.headers.get("Authorization", "")
    auth_token = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else None

    if not auth_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization token required",
        )

    # Parse due date if provided
    due_date = None
    if data.due_date:
        try:
            due_date = datetime.fromisoformat(data.due_date).date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid due_date format. Use ISO format (YYYY-MM-DD)",
            )

    # Create task via task-service
    task_client = get_task_client()
    try:
        task_data = await task_client.create_task(
            tenant_id=tenant_id,
            auth_token=auth_token,
            title=node.title,
            created_by=current_user["id"],
            description=node.description,
            assignee_id=data.assignee_id,
            due_date=due_date,
            priority=data.priority,
            origin_type="MINDMAP",
            origin_reference_id=node_id,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to create task: {str(e)}",
        )
    finally:
        await task_client.close()

    # Link the node to the created task
    task_id = UUID(task_data["id"])
    from ..schemas import MindMapNodeUpdateRequest
    update_data = MindMapNodeUpdateRequest(linked_task_id=task_id)
    await service.update_node(tenant_id, node_id, current_user["id"], update_data)

    return NodeToTaskConvertResponse(
        node_id=node_id,
        task_id=task_id,
        task_title=task_data["title"],
        message="Node successfully converted to task",
    )


# ==================== Attachment Endpoints ====================

@router.post(
    "/{node_id}/attachments",
    response_model=NodeAttachmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add attachment to node",
)
async def add_attachment(
    node_id: UUID,
    data: NodeAttachmentCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Add a file attachment to a node."""
    service = NodeService(db)
    attachment = await service.add_attachment(
        tenant_id=tenant_id,
        node_id=node_id,
        user_id=current_user["id"],
        data=data,
    )

    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found",
        )

    return attachment


@router.get(
    "/{node_id}/attachments",
    response_model=NodeAttachmentListResponse,
    summary="Get node attachments",
)
async def get_attachments(
    node_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Get all attachments for a node."""
    service = NodeService(db)
    attachments = await service.get_attachments_by_node(tenant_id, node_id)

    return NodeAttachmentListResponse(
        items=attachments,
        total=len(attachments),
    )


@router.delete(
    "/attachments/{attachment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete attachment",
)
async def delete_attachment(
    attachment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Delete a node attachment."""
    service = NodeService(db)
    deleted = await service.delete_attachment(tenant_id, attachment_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment not found",
        )


def _build_node_response(node) -> MindMapNodeResponse:
    """Build node response with attachments."""
    attachments = []
    if hasattr(node, 'attachments') and node.attachments:
        for att in node.attachments:
            attachments.append(
                NodeAttachmentSummary(
                    id=att.id,
                    file_id=att.file_id,
                    attached_at=att.attached_at,
                    attached_by=att.attached_by,
                )
            )

    return MindMapNodeResponse(
        id=node.id,
        tenant_id=node.tenant_id,
        mind_map_id=node.mind_map_id,
        parent_node_id=node.parent_node_id,
        title=node.title,
        description=node.description,
        node_type=node.node_type,
        linked_task_id=node.linked_task_id,
        x_position=node.x_position,
        y_position=node.y_position,
        display_order=node.display_order,
        visual_metadata=node.visual_metadata or {},
        child_count=node.child_count,
        attachments=attachments,
        created_at=node.created_at,
        updated_at=node.updated_at,
        created_by=node.created_by,
        updated_by=node.updated_by,
    )
