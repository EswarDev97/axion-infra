"""
MindFlow Mind Map Service - Node Service
Business logic for mind map nodes and attachments.
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models import MindMap, MindMapNode, NodeAttachment
from ..schemas import (
    MindMapNodeBulkCreateRequest,
    MindMapNodeBulkDeleteRequest,
    MindMapNodeCreateRequest,
    MindMapNodeMoveRequest,
    MindMapNodeUpdateRequest,
    NodeAttachmentCreateRequest,
    NodePositionUpdate,
)


class NodeService:
    """Service for mind map node operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ==================== Node Operations ====================

    async def create_node(
        self,
        tenant_id: UUID,
        mind_map_id: UUID,
        user_id: UUID,
        data: MindMapNodeCreateRequest,
    ) -> Optional[MindMapNode]:
        """Create a new node in a mind map."""
        # Verify mind map exists
        mind_map = await self._get_mind_map(tenant_id, mind_map_id)
        if not mind_map:
            return None

        # Verify parent node if specified
        if data.parent_node_id:
            parent = await self.get_node(tenant_id, data.parent_node_id)
            if not parent or parent.mind_map_id != mind_map_id:
                return None

        node = MindMapNode(
            tenant_id=tenant_id,
            mind_map_id=mind_map_id,
            parent_node_id=data.parent_node_id,
            title=data.title,
            description=data.description,
            node_type=data.node_type,
            linked_task_id=data.linked_task_id,
            x_position=data.x_position,
            y_position=data.y_position,
            display_order=data.display_order,
            visual_metadata=data.visual_metadata,
            is_deleted=False,
            created_by=user_id,
            updated_by=user_id,
        )

        self.db.add(node)
        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(MindMapNode).where(MindMapNode.id == node.id).options(
            selectinload(MindMapNode.mind_map),
            selectinload(MindMapNode.parent_node),
            selectinload(MindMapNode.child_nodes),
            selectinload(MindMapNode.attachments)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def get_node(
        self,
        tenant_id: UUID,
        node_id: UUID,
        include_attachments: bool = False,
    ) -> Optional[MindMapNode]:
        """Get a node by ID."""
        query = select(MindMapNode).where(
            and_(
                MindMapNode.id == node_id,
                MindMapNode.tenant_id == tenant_id,
                MindMapNode.is_deleted == False,
            )
        )

        if include_attachments:
            query = query.options(selectinload(MindMapNode.attachments))

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_nodes_by_mind_map(
        self,
        tenant_id: UUID,
        mind_map_id: UUID,
    ) -> List[MindMapNode]:
        """Get all nodes for a mind map."""
        query = select(MindMapNode).where(
            and_(
                MindMapNode.mind_map_id == mind_map_id,
                MindMapNode.tenant_id == tenant_id,
                MindMapNode.is_deleted == False,
            )
        ).options(selectinload(MindMapNode.attachments))

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update_node(
        self,
        tenant_id: UUID,
        node_id: UUID,
        user_id: UUID,
        data: MindMapNodeUpdateRequest,
    ) -> Optional[MindMapNode]:
        """Update a node."""
        node = await self.get_node(tenant_id, node_id)
        if not node:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(node, field, value)

        node.updated_by = user_id
        node.updated_at = datetime.utcnow()

        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(MindMapNode).where(MindMapNode.id == node.id).options(
            selectinload(MindMapNode.mind_map),
            selectinload(MindMapNode.parent_node),
            selectinload(MindMapNode.child_nodes),
            selectinload(MindMapNode.attachments)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def delete_node(
        self,
        tenant_id: UUID,
        node_id: UUID,
        user_id: UUID,
        reason: Optional[str] = None,
        cascade: bool = True,
    ) -> bool:
        """Soft delete a node (and optionally its children)."""
        node = await self.get_node(tenant_id, node_id)
        if not node:
            return False

        await self._soft_delete_node(node, user_id, reason, cascade)
        await self.db.commit()

        return True

    async def _soft_delete_node(
        self,
        node: MindMapNode,
        user_id: UUID,
        reason: Optional[str],
        cascade: bool,
    ) -> None:
        """Recursively soft delete a node and its children."""
        node.is_deleted = True
        node.deleted_at = datetime.utcnow()
        node.deletion_reason = reason
        node.updated_by = user_id

        if cascade:
            # Get and delete child nodes
            children_query = select(MindMapNode).where(
                and_(
                    MindMapNode.parent_node_id == node.id,
                    MindMapNode.is_deleted == False,
                )
            )
            result = await self.db.execute(children_query)
            children = result.scalars().all()

            for child in children:
                await self._soft_delete_node(child, user_id, reason, cascade)

    async def move_node(
        self,
        tenant_id: UUID,
        node_id: UUID,
        user_id: UUID,
        data: MindMapNodeMoveRequest,
    ) -> Optional[MindMapNode]:
        """Move a node to a new parent."""
        node = await self.get_node(tenant_id, node_id)
        if not node:
            return None

        # Validate new parent if specified
        if data.new_parent_node_id:
            new_parent = await self.get_node(tenant_id, data.new_parent_node_id)
            if not new_parent or new_parent.mind_map_id != node.mind_map_id:
                return None

            # Prevent circular reference
            if await self._would_create_cycle(node_id, data.new_parent_node_id):
                return None

        node.parent_node_id = data.new_parent_node_id

        if data.display_order is not None:
            node.display_order = data.display_order

        node.updated_by = user_id
        node.updated_at = datetime.utcnow()

        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(MindMapNode).where(MindMapNode.id == node.id).options(
            selectinload(MindMapNode.mind_map),
            selectinload(MindMapNode.parent_node),
            selectinload(MindMapNode.child_nodes),
            selectinload(MindMapNode.attachments)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def _would_create_cycle(
        self,
        node_id: UUID,
        new_parent_id: UUID,
    ) -> bool:
        """Check if moving node to new parent would create a cycle."""
        current_id = new_parent_id
        visited = set()

        while current_id:
            if current_id == node_id:
                return True
            if current_id in visited:
                return True
            visited.add(current_id)

            query = select(MindMapNode.parent_node_id).where(
                MindMapNode.id == current_id
            )
            result = await self.db.execute(query)
            row = result.first()
            current_id = row[0] if row else None

        return False

    async def update_positions(
        self,
        tenant_id: UUID,
        mind_map_id: UUID,
        user_id: UUID,
        positions: List[NodePositionUpdate],
    ) -> bool:
        """Bulk update node positions."""
        for pos in positions:
            node = await self.get_node(tenant_id, pos.node_id)
            if node and node.mind_map_id == mind_map_id:
                node.x_position = pos.x_position
                node.y_position = pos.y_position
                node.updated_by = user_id
                node.updated_at = datetime.utcnow()

        await self.db.commit()
        return True

    async def bulk_create_nodes(
        self,
        tenant_id: UUID,
        mind_map_id: UUID,
        user_id: UUID,
        data: MindMapNodeBulkCreateRequest,
    ) -> List[MindMapNode]:
        """Create multiple nodes at once."""
        # Verify mind map exists
        mind_map = await self._get_mind_map(tenant_id, mind_map_id)
        if not mind_map:
            return []

        created_nodes = []

        for node_data in data.nodes:
            node = MindMapNode(
                tenant_id=tenant_id,
                mind_map_id=mind_map_id,
                parent_node_id=node_data.parent_node_id,
                title=node_data.title,
                description=node_data.description,
                node_type=node_data.node_type,
                linked_task_id=node_data.linked_task_id,
                x_position=node_data.x_position,
                y_position=node_data.y_position,
                display_order=node_data.display_order,
                visual_metadata=node_data.visual_metadata,
                is_deleted=False,
                created_by=user_id,
                updated_by=user_id,
            )
            self.db.add(node)
            created_nodes.append(node)

        await self.db.commit()

        # Re-fetch all nodes with eager-loaded relationships to avoid lazy loading issues
        node_ids = [node.id for node in created_nodes]
        stmt = select(MindMapNode).where(MindMapNode.id.in_(node_ids)).options(
            selectinload(MindMapNode.mind_map),
            selectinload(MindMapNode.parent_node),
            selectinload(MindMapNode.child_nodes),
            selectinload(MindMapNode.attachments)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def bulk_delete_nodes(
        self,
        tenant_id: UUID,
        user_id: UUID,
        data: MindMapNodeBulkDeleteRequest,
    ) -> int:
        """Soft delete multiple nodes."""
        deleted_count = 0

        for node_id in data.node_ids:
            if await self.delete_node(
                tenant_id, node_id, user_id, data.deletion_reason, cascade=True
            ):
                deleted_count += 1

        return deleted_count

    # ==================== Attachment Operations ====================

    async def add_attachment(
        self,
        tenant_id: UUID,
        node_id: UUID,
        user_id: UUID,
        data: NodeAttachmentCreateRequest,
    ) -> Optional[NodeAttachment]:
        """Add an attachment to a node."""
        node = await self.get_node(tenant_id, node_id)
        if not node:
            return None

        attachment = NodeAttachment(
            tenant_id=tenant_id,
            node_id=node_id,
            file_id=data.file_id,
            attached_by=user_id,
        )

        self.db.add(attachment)
        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(NodeAttachment).where(NodeAttachment.id == attachment.id).options(
            selectinload(NodeAttachment.node)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def get_attachment(
        self,
        tenant_id: UUID,
        attachment_id: UUID,
    ) -> Optional[NodeAttachment]:
        """Get an attachment by ID."""
        query = select(NodeAttachment).where(
            and_(
                NodeAttachment.id == attachment_id,
                NodeAttachment.tenant_id == tenant_id,
            )
        )

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_attachments_by_node(
        self,
        tenant_id: UUID,
        node_id: UUID,
    ) -> List[NodeAttachment]:
        """Get all attachments for a node."""
        query = select(NodeAttachment).where(
            and_(
                NodeAttachment.node_id == node_id,
                NodeAttachment.tenant_id == tenant_id,
            )
        ).order_by(NodeAttachment.attached_at.desc())

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def delete_attachment(
        self,
        tenant_id: UUID,
        attachment_id: UUID,
    ) -> bool:
        """Delete an attachment (hard delete)."""
        attachment = await self.get_attachment(tenant_id, attachment_id)
        if not attachment:
            return False

        await self.db.delete(attachment)
        await self.db.commit()

        return True

    # ==================== Helper Methods ====================

    async def _get_mind_map(
        self,
        tenant_id: UUID,
        mind_map_id: UUID,
    ) -> Optional[MindMap]:
        """Get a mind map by ID."""
        query = select(MindMap).where(
            and_(
                MindMap.id == mind_map_id,
                MindMap.tenant_id == tenant_id,
                MindMap.is_deleted == False,
            )
        )

        result = await self.db.execute(query)
        return result.scalar_one_or_none()
