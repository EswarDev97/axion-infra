"""
Mind Map Service Model Unit Tests
Per SDLC Phase 7 Task 7.1

Tests for:
- MindMapTemplate model
- MindMap model
- MindMapNode model
- NodeAttachment model
"""

import pytest
from datetime import datetime
from uuid import uuid4

pytestmark = [pytest.mark.unit, pytest.mark.asyncio]


class TestMindMapTemplateModel:
    """Tests for MindMapTemplate model."""

    async def test_template_creation(self, db_session, test_tenant, test_user):
        """Test mind map template creation."""
        from services.mindmap.models.mind_map_template import MindMapTemplate

        template = MindMapTemplate(
            tenant_id=test_tenant.id,
            name="Project Planning",
            description="Template for project planning mind maps",
            category="PROJECT",
            default_structure={
                "root": {"text": "Project Name", "children": [
                    {"text": "Goals"},
                    {"text": "Resources"},
                    {"text": "Timeline"},
                ]}
            },
            is_system=False,
            is_active=True,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(template)
        await db_session.commit()
        await db_session.refresh(template)

        assert template.id is not None
        assert template.name == "Project Planning"
        assert template.category == "PROJECT"
        assert template.is_system is False
        assert template.is_active is True

    async def test_system_template(self, db_session, test_tenant, test_user):
        """Test system template flag."""
        from services.mindmap.models.mind_map_template import MindMapTemplate

        template = MindMapTemplate(
            tenant_id=test_tenant.id,
            name="SWOT Analysis",
            description="SWOT analysis template",
            category="ANALYSIS",
            is_system=True,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(template)
        await db_session.commit()
        await db_session.refresh(template)

        assert template.is_system is True

    async def test_template_soft_delete(self, db_session, test_tenant, test_user):
        """Test template soft delete."""
        from services.mindmap.models.mind_map_template import MindMapTemplate

        template = MindMapTemplate(
            tenant_id=test_tenant.id,
            name="To Delete",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(template)
        await db_session.commit()

        template.is_deleted = True
        template.deleted_at = datetime.utcnow()
        template.deletion_reason = "No longer needed"
        await db_session.commit()
        await db_session.refresh(template)

        assert template.is_deleted is True
        assert template.deleted_at is not None


class TestMindMapModel:
    """Tests for MindMap model."""

    async def test_mindmap_creation(self, db_session, test_tenant, test_user):
        """Test mind map creation."""
        from services.mindmap.models.mind_map import MindMap

        mindmap = MindMap(
            tenant_id=test_tenant.id,
            title="Q1 2026 Strategy",
            description="Strategic planning for Q1",
            status="ACTIVE",
            theme_settings={
                "primaryColor": "#4287f5",
                "fontFamily": "Inter",
            },
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(mindmap)
        await db_session.commit()
        await db_session.refresh(mindmap)

        assert mindmap.id is not None
        assert mindmap.title == "Q1 2026 Strategy"
        assert mindmap.status == "ACTIVE"
        assert mindmap.theme_settings["primaryColor"] == "#4287f5"

    async def test_mindmap_from_template(self, db_session, test_tenant, test_user):
        """Test creating mind map from template."""
        from services.mindmap.models.mind_map_template import MindMapTemplate
        from services.mindmap.models.mind_map import MindMap

        template = MindMapTemplate(
            tenant_id=test_tenant.id,
            name="Brainstorm Template",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(template)
        await db_session.commit()

        mindmap = MindMap(
            tenant_id=test_tenant.id,
            title="Team Brainstorm",
            template_id=template.id,
            status="ACTIVE",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(mindmap)
        await db_session.commit()
        await db_session.refresh(mindmap)

        assert mindmap.template_id == template.id

    async def test_mindmap_status_values(self, db_session, test_tenant, test_user):
        """Test valid mind map status values."""
        from services.mindmap.models.mind_map import MindMap

        for status in ["ACTIVE", "ARCHIVED"]:
            mindmap = MindMap(
                tenant_id=test_tenant.id,
                title=f"Map {status}",
                status=status,
                created_by=test_user.id,
                updated_by=test_user.id,
            )
            db_session.add(mindmap)
            await db_session.commit()
            await db_session.refresh(mindmap)
            assert mindmap.status == status

    async def test_mindmap_soft_delete(self, db_session, test_tenant, test_user):
        """Test mind map soft delete."""
        from services.mindmap.models.mind_map import MindMap

        mindmap = MindMap(
            tenant_id=test_tenant.id,
            title="To Delete",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(mindmap)
        await db_session.commit()

        mindmap.is_deleted = True
        mindmap.deleted_at = datetime.utcnow()
        mindmap.deletion_reason = "Project cancelled"
        await db_session.commit()
        await db_session.refresh(mindmap)

        assert mindmap.is_deleted is True
        assert mindmap.deleted_at is not None


class TestMindMapNodeModel:
    """Tests for MindMapNode model."""

    async def test_node_creation(self, db_session, test_tenant, test_user):
        """Test mind map node creation."""
        from services.mindmap.models.mind_map import MindMap
        from services.mindmap.models.mind_map_node import MindMapNode

        mindmap = MindMap(
            tenant_id=test_tenant.id,
            title="Node Test Map",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(mindmap)
        await db_session.commit()

        root_node = MindMapNode(
            tenant_id=test_tenant.id,
            mind_map_id=mindmap.id,
            text="Central Idea",
            node_type="ROOT",
            position_x=0.0,
            position_y=0.0,
            color="#4287f5",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(root_node)
        await db_session.commit()
        await db_session.refresh(root_node)

        assert root_node.id is not None
        assert root_node.text == "Central Idea"
        assert root_node.node_type == "ROOT"
        assert root_node.parent_node_id is None

    async def test_node_hierarchy(self, db_session, test_tenant, test_user):
        """Test node parent-child hierarchy."""
        from services.mindmap.models.mind_map import MindMap
        from services.mindmap.models.mind_map_node import MindMapNode

        mindmap = MindMap(
            tenant_id=test_tenant.id,
            title="Hierarchy Test Map",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(mindmap)
        await db_session.commit()

        # Root node
        root = MindMapNode(
            tenant_id=test_tenant.id,
            mind_map_id=mindmap.id,
            text="Root",
            node_type="ROOT",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(root)
        await db_session.commit()

        # Child nodes
        child1 = MindMapNode(
            tenant_id=test_tenant.id,
            mind_map_id=mindmap.id,
            parent_node_id=root.id,
            text="Child 1",
            node_type="BRANCH",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        child2 = MindMapNode(
            tenant_id=test_tenant.id,
            mind_map_id=mindmap.id,
            parent_node_id=root.id,
            text="Child 2",
            node_type="BRANCH",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add_all([child1, child2])
        await db_session.commit()

        # Grandchild
        grandchild = MindMapNode(
            tenant_id=test_tenant.id,
            mind_map_id=mindmap.id,
            parent_node_id=child1.id,
            text="Grandchild",
            node_type="LEAF",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(grandchild)
        await db_session.commit()

        await db_session.refresh(grandchild)
        assert grandchild.parent_node_id == child1.id

    async def test_node_types(self, db_session, test_tenant, test_user):
        """Test valid node types."""
        from services.mindmap.models.mind_map import MindMap
        from services.mindmap.models.mind_map_node import MindMapNode

        mindmap = MindMap(
            tenant_id=test_tenant.id,
            title="Types Test Map",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(mindmap)
        await db_session.commit()

        for node_type in ["ROOT", "BRANCH", "LEAF"]:
            node = MindMapNode(
                tenant_id=test_tenant.id,
                mind_map_id=mindmap.id,
                text=f"Node {node_type}",
                node_type=node_type,
                created_by=test_user.id,
                updated_by=test_user.id,
            )
            db_session.add(node)
            await db_session.commit()
            await db_session.refresh(node)
            assert node.node_type == node_type

    async def test_node_task_conversion(self, db_session, test_tenant, test_user):
        """Test node to task conversion tracking."""
        from services.mindmap.models.mind_map import MindMap
        from services.mindmap.models.mind_map_node import MindMapNode

        mindmap = MindMap(
            tenant_id=test_tenant.id,
            title="Task Conversion Map",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(mindmap)
        await db_session.commit()

        node = MindMapNode(
            tenant_id=test_tenant.id,
            mind_map_id=mindmap.id,
            text="Action Item",
            node_type="LEAF",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(node)
        await db_session.commit()

        # Simulate task conversion
        task_id = uuid4()
        node.linked_task_id = task_id
        node.converted_to_task_at = datetime.utcnow()
        await db_session.commit()
        await db_session.refresh(node)

        assert node.linked_task_id == task_id
        assert node.converted_to_task_at is not None

    async def test_node_soft_delete(self, db_session, test_tenant, test_user):
        """Test node soft delete."""
        from services.mindmap.models.mind_map import MindMap
        from services.mindmap.models.mind_map_node import MindMapNode

        mindmap = MindMap(
            tenant_id=test_tenant.id,
            title="Delete Test Map",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(mindmap)
        await db_session.commit()

        node = MindMapNode(
            tenant_id=test_tenant.id,
            mind_map_id=mindmap.id,
            text="To Delete",
            node_type="BRANCH",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(node)
        await db_session.commit()

        node.is_deleted = True
        node.deleted_at = datetime.utcnow()
        await db_session.commit()
        await db_session.refresh(node)

        assert node.is_deleted is True

    async def test_mindmap_root_node_property(self, db_session, test_tenant, test_user):
        """Test root_node property of MindMap."""
        from services.mindmap.models.mind_map import MindMap
        from services.mindmap.models.mind_map_node import MindMapNode

        mindmap = MindMap(
            tenant_id=test_tenant.id,
            title="Root Property Test",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(mindmap)
        await db_session.commit()

        root = MindMapNode(
            tenant_id=test_tenant.id,
            mind_map_id=mindmap.id,
            text="Central",
            node_type="ROOT",
            parent_node_id=None,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(root)
        await db_session.commit()

        await db_session.refresh(mindmap)

        assert mindmap.root_node is not None
        assert mindmap.root_node.text == "Central"

    async def test_mindmap_node_count_property(self, db_session, test_tenant, test_user):
        """Test node_count property of MindMap."""
        from services.mindmap.models.mind_map import MindMap
        from services.mindmap.models.mind_map_node import MindMapNode

        mindmap = MindMap(
            tenant_id=test_tenant.id,
            title="Count Test Map",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(mindmap)
        await db_session.commit()

        for i in range(5):
            node = MindMapNode(
                tenant_id=test_tenant.id,
                mind_map_id=mindmap.id,
                text=f"Node {i}",
                node_type="BRANCH" if i > 0 else "ROOT",
                created_by=test_user.id,
                updated_by=test_user.id,
            )
            db_session.add(node)

        await db_session.commit()
        await db_session.refresh(mindmap)

        assert mindmap.node_count == 5


class TestNodeAttachmentModel:
    """Tests for NodeAttachment model."""

    async def test_attachment_creation(self, db_session, test_tenant, test_user):
        """Test node attachment creation."""
        from services.mindmap.models.mind_map import MindMap
        from services.mindmap.models.mind_map_node import MindMapNode
        from services.mindmap.models.node_attachment import NodeAttachment

        mindmap = MindMap(
            tenant_id=test_tenant.id,
            title="Attachment Test Map",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(mindmap)
        await db_session.commit()

        node = MindMapNode(
            tenant_id=test_tenant.id,
            mind_map_id=mindmap.id,
            text="Node with Attachment",
            node_type="LEAF",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(node)
        await db_session.commit()

        attachment = NodeAttachment(
            tenant_id=test_tenant.id,
            node_id=node.id,
            file_name="document.pdf",
            file_path="/attachments/mindmap/document.pdf",
            file_size=204800,
            content_type="application/pdf",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(attachment)
        await db_session.commit()
        await db_session.refresh(attachment)

        assert attachment.id is not None
        assert attachment.file_name == "document.pdf"
        assert attachment.content_type == "application/pdf"
