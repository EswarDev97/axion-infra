/**
 * MindFlow - Mind Map Service Types
 * Per API_CONTRACT.md Section 8.6 (Mind Map Module)
 */

// ============================================================================
// Mind Map Template
// ============================================================================

export interface MindMapTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  category?: string | null;
  thumbnailUrl?: string | null;
  templateData: Record<string, unknown>;
  isSystemTemplate: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface MindMapTemplateCreateRequest {
  name: string;
  description?: string;
  category?: string;
  thumbnailUrl?: string;
  templateData?: Record<string, unknown>;
  isSystemTemplate?: boolean;
}

export interface MindMapTemplateUpdateRequest {
  name?: string;
  description?: string | null;
  category?: string | null;
  thumbnailUrl?: string | null;
  templateData?: Record<string, unknown>;
  isActive?: boolean;
}

export interface TemplateFilters {
  category?: string;
  isSystemTemplate?: boolean;
  isActive?: boolean;
  search?: string;
}

// ============================================================================
// Mind Map
// ============================================================================

export type MindMapStatus = 'ACTIVE' | 'ARCHIVED';

export interface MindMap {
  id: string;
  tenantId: string;
  title: string;
  description?: string | null;
  status: MindMapStatus;
  templateId?: string | null;
  themeSettings: MindMapThemeSettings;
  nodeCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface MindMapDetail extends MindMap {
  nodes: MindMapNodeSummary[];
}

export interface MindMapThemeSettings {
  backgroundColor?: string;
  nodeColor?: string;
  lineColor?: string;
  fontFamily?: string;
  fontSize?: number;
  [key: string]: unknown;
}

export interface MindMapCreateRequest {
  title: string;
  description?: string;
  templateId?: string;
  themeSettings?: MindMapThemeSettings;
}

export interface MindMapUpdateRequest {
  title?: string;
  description?: string | null;
  status?: MindMapStatus;
  themeSettings?: MindMapThemeSettings;
}

export interface MindMapFilters {
  status?: MindMapStatus;
  templateId?: string;
  createdBy?: string;
  search?: string;
}

export interface MindMapDuplicateRequest {
  title: string;
  description?: string;
}

export interface MindMapFromTemplateRequest {
  templateId: string;
  title: string;
  description?: string;
  themeSettings?: MindMapThemeSettings;
}

// ============================================================================
// Mind Map Node
// ============================================================================

export type NodeType = 'IDEA' | 'ACTIVITY' | 'REFERENCE' | 'LINKED_TASK';

export interface MindMapNode {
  id: string;
  tenantId: string;
  mindMapId: string;
  parentNodeId?: string | null;
  title: string;
  description?: string | null;
  nodeType: NodeType;
  linkedTaskId?: string | null;
  xPosition: number;
  yPosition: number;
  displayOrder: number;
  visualMetadata: NodeVisualMetadata;
  childCount: number;
  attachments: NodeAttachmentSummary[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface MindMapNodeSummary {
  id: string;
  title: string;
  nodeType: NodeType;
  parentNodeId?: string | null;
  xPosition: number;
  yPosition: number;
  displayOrder: number;
  visualMetadata: NodeVisualMetadata;
  linkedTaskId?: string | null;
  childCount: number;
}

export interface NodeVisualMetadata {
  color?: string;
  backgroundColor?: string;
  icon?: string;
  shape?: 'rectangle' | 'ellipse' | 'diamond' | 'rounded';
  width?: number;
  height?: number;
  collapsed?: boolean;
  [key: string]: unknown;
}

export interface MindMapNodeCreateRequest {
  title: string;
  description?: string;
  nodeType?: NodeType;
  parentNodeId?: string;
  linkedTaskId?: string;
  xPosition?: number;
  yPosition?: number;
  displayOrder?: number;
  visualMetadata?: NodeVisualMetadata;
}

export interface MindMapNodeUpdateRequest {
  title?: string;
  description?: string | null;
  nodeType?: NodeType;
  linkedTaskId?: string | null;
  xPosition?: number;
  yPosition?: number;
  displayOrder?: number;
  visualMetadata?: NodeVisualMetadata;
}

export interface MindMapNodeMoveRequest {
  newParentNodeId?: string | null;
  displayOrder?: number;
}

export interface NodePositionUpdate {
  nodeId: string;
  xPosition: number;
  yPosition: number;
}

export interface MindMapNodeBulkCreateRequest {
  nodes: MindMapNodeCreateRequest[];
}

export interface MindMapNodeBulkDeleteRequest {
  nodeIds: string[];
  deletionReason?: string;
}

// ============================================================================
// Node Attachment
// ============================================================================

export interface NodeAttachment {
  id: string;
  tenantId: string;
  nodeId: string;
  fileId: string;
  attachedAt: string;
  attachedBy: string;
  createdAt: string;
}

export interface NodeAttachmentSummary {
  id: string;
  fileId: string;
  attachedAt: string;
  attachedBy: string;
}

export interface NodeAttachmentCreateRequest {
  fileId: string;
}

// ============================================================================
// Mind Map Canvas State (for frontend state management)
// ============================================================================

export interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
  selectedNodeId?: string | null;
  selectedNodes: string[];
  isEditing: boolean;
  isDragging: boolean;
}

export interface NodeConnection {
  sourceId: string;
  targetId: string;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  lineColor?: string;
}

// ============================================================================
// Mind Map Export/Import
// ============================================================================

export interface MindMapExportOptions {
  format: 'json' | 'png' | 'svg' | 'pdf';
  includeAttachments?: boolean;
}

export interface MindMapImportRequest {
  data: string;
  format: 'json' | 'freemind' | 'xmind';
  title?: string;
}
