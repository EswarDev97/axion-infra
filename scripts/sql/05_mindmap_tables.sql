-- =============================================================================
-- MindFlow Database Migration: Mindmap Service Tables
-- Service: mindmap-service
-- Tables: mind_map_templates, mind_maps, mind_map_nodes, node_attachments
-- =============================================================================

-- Mind Map Templates (predefined structures)
CREATE TABLE IF NOT EXISTS mind_map_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    thumbnail_url VARCHAR(500),
    template_data JSONB NOT NULL DEFAULT '{}',
    is_system_template BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_mind_map_templates_tenant_id ON mind_map_templates(tenant_id);

-- Mind Maps (main container entity)
CREATE TABLE IF NOT EXISTS mind_maps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    template_id UUID REFERENCES mind_map_templates(id),
    theme_settings JSONB DEFAULT '{}',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deletion_reason VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_mind_maps_tenant_id ON mind_maps(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mind_maps_template_id ON mind_maps(template_id);
CREATE INDEX IF NOT EXISTS idx_mind_maps_is_deleted ON mind_maps(tenant_id, is_deleted);

-- Mind Map Nodes (individual nodes within a mind map)
CREATE TABLE IF NOT EXISTS mind_map_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    mind_map_id UUID NOT NULL REFERENCES mind_maps(id) ON DELETE CASCADE,
    parent_node_id UUID REFERENCES mind_map_nodes(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    node_type VARCHAR(30) NOT NULL DEFAULT 'IDEA',
    linked_task_id UUID REFERENCES tasks(id),
    x_position DECIMAL(10,2) NOT NULL DEFAULT 0,
    y_position DECIMAL(10,2) NOT NULL DEFAULT 0,
    display_order INTEGER NOT NULL DEFAULT 0,
    visual_metadata JSONB DEFAULT '{}',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deletion_reason VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_mind_map_nodes_tenant_id ON mind_map_nodes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mind_map_nodes_mind_map_id ON mind_map_nodes(mind_map_id);
CREATE INDEX IF NOT EXISTS idx_mind_map_nodes_parent_node_id ON mind_map_nodes(parent_node_id);
CREATE INDEX IF NOT EXISTS idx_mind_map_nodes_linked_task_id ON mind_map_nodes(linked_task_id);

-- Node Attachments (file attachments to nodes)
CREATE TABLE IF NOT EXISTS node_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    node_id UUID NOT NULL REFERENCES mind_map_nodes(id) ON DELETE CASCADE,
    file_id UUID NOT NULL,
    attached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    attached_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_node_attachments_tenant_id ON node_attachments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_node_attachments_node_id ON node_attachments(node_id);

-- =============================================================================
-- End of Mindmap Service Tables
-- =============================================================================
