"""
MindFlow Mind Map Service - Mind Map Service
Business logic for mind maps.
"""

from datetime import datetime
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models import MindMap, MindMapNode, MindMapTemplate
from ..schemas import (
    MindMapCreateRequest,
    MindMapDuplicateRequest,
    MindMapFilters,
    MindMapFromTemplateRequest,
    MindMapUpdateRequest,
)


class MindMapService:
    """Service for mind map operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_mind_map(
        self,
        tenant_id: UUID,
        user_id: UUID,
        data: MindMapCreateRequest,
    ) -> MindMap:
        """Create a new mind map."""
        mind_map = MindMap(
            tenant_id=tenant_id,
            title=data.title,
            description=data.description,
            status="ACTIVE",
            template_id=data.template_id,
            theme_settings=data.theme_settings,
            is_deleted=False,
            created_by=user_id,
            updated_by=user_id,
        )

        self.db.add(mind_map)
        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(MindMap).where(MindMap.id == mind_map.id).options(
            selectinload(MindMap.template),
            selectinload(MindMap.nodes)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def create_from_template(
        self,
        tenant_id: UUID,
        user_id: UUID,
        data: MindMapFromTemplateRequest,
    ) -> Optional[MindMap]:
        """Create a mind map from a template."""
        # Get template
        template_query = select(MindMapTemplate).where(
            and_(
                MindMapTemplate.id == data.template_id,
                MindMapTemplate.tenant_id == tenant_id,
                MindMapTemplate.is_active == True,
            )
        )
        result = await self.db.execute(template_query)
        template = result.scalar_one_or_none()

        if not template:
            return None

        # Create mind map
        theme_settings = data.theme_settings or template.template_data.get("theme_settings", {})

        mind_map = MindMap(
            tenant_id=tenant_id,
            title=data.title,
            description=data.description,
            status="ACTIVE",
            template_id=template.id,
            theme_settings=theme_settings,
            is_deleted=False,
            created_by=user_id,
            updated_by=user_id,
        )

        self.db.add(mind_map)
        await self.db.flush()

        # Create nodes from template data
        template_nodes = template.template_data.get("nodes", [])
        await self._create_nodes_from_template(
            mind_map.id, tenant_id, user_id, template_nodes
        )

        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(MindMap).where(MindMap.id == mind_map.id).options(
            selectinload(MindMap.template),
            selectinload(MindMap.nodes)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def _create_nodes_from_template(
        self,
        mind_map_id: UUID,
        tenant_id: UUID,
        user_id: UUID,
        template_nodes: List[dict],
        parent_node_id: Optional[UUID] = None,
        node_id_map: Optional[dict] = None,
    ) -> None:
        """Recursively create nodes from template data."""
        if node_id_map is None:
            node_id_map = {}

        for node_data in template_nodes:
            template_node_id = node_data.get("id")

            node = MindMapNode(
                tenant_id=tenant_id,
                mind_map_id=mind_map_id,
                parent_node_id=parent_node_id,
                title=node_data.get("title", "New Node"),
                description=node_data.get("description"),
                node_type=node_data.get("node_type", "IDEA"),
                x_position=node_data.get("x_position", 0),
                y_position=node_data.get("y_position", 0),
                display_order=node_data.get("display_order", 0),
                visual_metadata=node_data.get("visual_metadata", {}),
                is_deleted=False,
                created_by=user_id,
                updated_by=user_id,
            )

            self.db.add(node)
            await self.db.flush()

            if template_node_id:
                node_id_map[template_node_id] = node.id

            # Create child nodes recursively
            children = node_data.get("children", [])
            if children:
                await self._create_nodes_from_template(
                    mind_map_id, tenant_id, user_id, children, node.id, node_id_map
                )

    async def get_mind_map(
        self,
        tenant_id: UUID,
        mind_map_id: UUID,
        include_nodes: bool = False,
    ) -> Optional[MindMap]:
        """Get a mind map by ID."""
        query = select(MindMap).where(
            and_(
                MindMap.id == mind_map_id,
                MindMap.tenant_id == tenant_id,
                MindMap.is_deleted == False,
            )
        )

        if include_nodes:
            query = query.options(selectinload(MindMap.nodes))

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_mind_maps(
        self,
        tenant_id: UUID,
        filters: MindMapFilters,
    ) -> Tuple[List[MindMap], int]:
        """List mind maps with filters."""
        query = select(MindMap).where(
            and_(
                MindMap.tenant_id == tenant_id,
                MindMap.is_deleted == False,
            )
        )

        # Apply filters
        if filters.status:
            query = query.where(MindMap.status == filters.status)

        if filters.template_id:
            query = query.where(MindMap.template_id == filters.template_id)

        if filters.created_by:
            query = query.where(MindMap.created_by == filters.created_by)

        if filters.search:
            search_term = f"%{filters.search}%"
            query = query.where(
                or_(
                    MindMap.title.ilike(search_term),
                    MindMap.description.ilike(search_term),
                )
            )

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply pagination
        offset = (filters.page - 1) * filters.page_size
        query = query.order_by(MindMap.updated_at.desc()).offset(offset).limit(filters.page_size)

        result = await self.db.execute(query)
        mind_maps = list(result.scalars().all())

        return mind_maps, total

    async def update_mind_map(
        self,
        tenant_id: UUID,
        mind_map_id: UUID,
        user_id: UUID,
        data: MindMapUpdateRequest,
    ) -> Optional[MindMap]:
        """Update a mind map."""
        mind_map = await self.get_mind_map(tenant_id, mind_map_id)
        if not mind_map:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(mind_map, field, value)

        mind_map.updated_by = user_id
        mind_map.updated_at = datetime.utcnow()

        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(MindMap).where(MindMap.id == mind_map.id).options(
            selectinload(MindMap.template),
            selectinload(MindMap.nodes)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def delete_mind_map(
        self,
        tenant_id: UUID,
        mind_map_id: UUID,
        user_id: UUID,
        reason: Optional[str] = None,
    ) -> bool:
        """Soft delete a mind map."""
        mind_map = await self.get_mind_map(tenant_id, mind_map_id)
        if not mind_map:
            return False

        mind_map.is_deleted = True
        mind_map.deleted_at = datetime.utcnow()
        mind_map.deletion_reason = reason
        mind_map.updated_by = user_id

        await self.db.commit()

        return True

    async def archive_mind_map(
        self,
        tenant_id: UUID,
        mind_map_id: UUID,
        user_id: UUID,
    ) -> Optional[MindMap]:
        """Archive a mind map."""
        mind_map = await self.get_mind_map(tenant_id, mind_map_id)
        if not mind_map:
            return None

        mind_map.status = "ARCHIVED"
        mind_map.updated_by = user_id
        mind_map.updated_at = datetime.utcnow()

        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(MindMap).where(MindMap.id == mind_map.id).options(
            selectinload(MindMap.template),
            selectinload(MindMap.nodes)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def restore_mind_map(
        self,
        tenant_id: UUID,
        mind_map_id: UUID,
        user_id: UUID,
    ) -> Optional[MindMap]:
        """Restore an archived mind map to active status."""
        mind_map = await self.get_mind_map(tenant_id, mind_map_id)
        if not mind_map:
            return None

        mind_map.status = "ACTIVE"
        mind_map.updated_by = user_id
        mind_map.updated_at = datetime.utcnow()

        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(MindMap).where(MindMap.id == mind_map.id).options(
            selectinload(MindMap.template),
            selectinload(MindMap.nodes)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def duplicate_mind_map(
        self,
        tenant_id: UUID,
        mind_map_id: UUID,
        user_id: UUID,
        data: MindMapDuplicateRequest,
    ) -> Optional[MindMap]:
        """Duplicate a mind map with all its nodes."""
        # Get original with nodes
        original = await self.get_mind_map(tenant_id, mind_map_id, include_nodes=True)
        if not original:
            return None

        # Create new mind map
        new_mind_map = MindMap(
            tenant_id=tenant_id,
            title=data.title,
            description=data.description or original.description,
            status="ACTIVE",
            template_id=original.template_id,
            theme_settings=original.theme_settings.copy() if original.theme_settings else {},
            is_deleted=False,
            created_by=user_id,
            updated_by=user_id,
        )

        self.db.add(new_mind_map)
        await self.db.flush()

        # Duplicate nodes
        if original.nodes:
            await self._duplicate_nodes(
                new_mind_map.id, tenant_id, user_id, original.nodes
            )

        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(MindMap).where(MindMap.id == new_mind_map.id).options(
            selectinload(MindMap.template),
            selectinload(MindMap.nodes)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def _duplicate_nodes(
        self,
        new_mind_map_id: UUID,
        tenant_id: UUID,
        user_id: UUID,
        nodes: List[MindMapNode],
        old_to_new_id_map: Optional[dict] = None,
    ) -> None:
        """Duplicate nodes, preserving hierarchy."""
        if old_to_new_id_map is None:
            old_to_new_id_map = {}

        # First pass: create all nodes without parent references
        for node in nodes:
            if node.is_deleted:
                continue

            new_node = MindMapNode(
                tenant_id=tenant_id,
                mind_map_id=new_mind_map_id,
                parent_node_id=None,  # Will set in second pass
                title=node.title,
                description=node.description,
                node_type=node.node_type,
                x_position=node.x_position,
                y_position=node.y_position,
                display_order=node.display_order,
                visual_metadata=node.visual_metadata.copy() if node.visual_metadata else {},
                is_deleted=False,
                created_by=user_id,
                updated_by=user_id,
            )

            self.db.add(new_node)
            await self.db.flush()
            old_to_new_id_map[node.id] = new_node.id

        # Second pass: update parent references
        for node in nodes:
            if node.is_deleted or node.parent_node_id is None:
                continue

            if node.parent_node_id in old_to_new_id_map:
                new_node_id = old_to_new_id_map[node.id]
                new_parent_id = old_to_new_id_map[node.parent_node_id]

                update_query = select(MindMapNode).where(MindMapNode.id == new_node_id)
                result = await self.db.execute(update_query)
                new_node = result.scalar_one()
                new_node.parent_node_id = new_parent_id
