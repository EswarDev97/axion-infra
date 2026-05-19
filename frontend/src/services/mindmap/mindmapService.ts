/**
 * MindFlow - Mind Map Service
 * Per API_CONTRACT.md Section 8.6 (Mind Map Module)
 */

import { get, post, put, del } from '@/services/api/client';
import type { PaginatedResponse, PaginationParams } from '@/services/api/types';
import type {
  MindMapTemplate,
  MindMapTemplateCreateRequest,
  MindMapTemplateUpdateRequest,
  TemplateFilters,
  MindMap,
  MindMapDetail,
  MindMapCreateRequest,
  MindMapUpdateRequest,
  MindMapFilters,
  MindMapDuplicateRequest,
  MindMapFromTemplateRequest,
  MindMapNode,
  MindMapNodeCreateRequest,
  MindMapNodeUpdateRequest,
  MindMapNodeMoveRequest,
  MindMapNodeBulkCreateRequest,
  MindMapNodeBulkDeleteRequest,
  NodePositionUpdate,
  NodeAttachment,
  NodeAttachmentCreateRequest,
} from './types';

const MINDMAP_BASE = '/mindmaps';

// ============================================================================
// Template Service
// ============================================================================

export const templateService = {
  async list(params?: PaginationParams & TemplateFilters): Promise<PaginatedResponse<MindMapTemplate>> {
    return get<PaginatedResponse<MindMapTemplate>>(`${MINDMAP_BASE}/templates`, params);
  },

  async getById(id: string): Promise<MindMapTemplate> {
    return get<MindMapTemplate>(`${MINDMAP_BASE}/templates/${id}`);
  },

  async create(data: MindMapTemplateCreateRequest): Promise<MindMapTemplate> {
    return post<MindMapTemplate>(`${MINDMAP_BASE}/templates`, data);
  },

  async update(id: string, data: MindMapTemplateUpdateRequest): Promise<MindMapTemplate> {
    return put<MindMapTemplate>(`${MINDMAP_BASE}/templates/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return del<void>(`${MINDMAP_BASE}/templates/${id}`);
  },

  async getCategories(): Promise<string[]> {
    return get<string[]>(`${MINDMAP_BASE}/templates/categories`);
  },
};

// ============================================================================
// Mind Map Service
// ============================================================================

export const mindMapService = {
  async list(params?: PaginationParams & MindMapFilters): Promise<PaginatedResponse<MindMap>> {
    return get<PaginatedResponse<MindMap>>(MINDMAP_BASE, params);
  },

  async getById(id: string): Promise<MindMapDetail> {
    return get<MindMapDetail>(`${MINDMAP_BASE}/${id}`);
  },

  async create(data: MindMapCreateRequest): Promise<MindMap> {
    return post<MindMap>(MINDMAP_BASE, data);
  },

  async createFromTemplate(data: MindMapFromTemplateRequest): Promise<MindMapDetail> {
    return post<MindMapDetail>(`${MINDMAP_BASE}/from-template`, data);
  },

  async update(id: string, data: MindMapUpdateRequest): Promise<MindMap> {
    return put<MindMap>(`${MINDMAP_BASE}/${id}`, data);
  },

  async delete(id: string, reason?: string): Promise<void> {
    return del<void>(`${MINDMAP_BASE}/${id}?reason=${encodeURIComponent(reason || '')}`);
  },

  async archive(id: string): Promise<MindMap> {
    return post<MindMap>(`${MINDMAP_BASE}/${id}/archive`, {});
  },

  async restore(id: string): Promise<MindMap> {
    return post<MindMap>(`${MINDMAP_BASE}/${id}/restore`, {});
  },

  async duplicate(id: string, data: MindMapDuplicateRequest): Promise<MindMapDetail> {
    return post<MindMapDetail>(`${MINDMAP_BASE}/${id}/duplicate`, data);
  },

  async updatePositions(id: string, positions: NodePositionUpdate[]): Promise<void> {
    return put<void>(`${MINDMAP_BASE}/${id}/positions`, positions);
  },
};

// ============================================================================
// Node Service
// ============================================================================

export const nodeService = {
  async getByMindMap(mindMapId: string): Promise<MindMapNode[]> {
    return get<MindMapNode[]>(`${MINDMAP_BASE}/nodes/mindmap/${mindMapId}`);
  },

  async getById(nodeId: string): Promise<MindMapNode> {
    return get<MindMapNode>(`${MINDMAP_BASE}/nodes/${nodeId}`);
  },

  async create(mindMapId: string, data: MindMapNodeCreateRequest): Promise<MindMapNode> {
    return post<MindMapNode>(`${MINDMAP_BASE}/nodes/mindmap/${mindMapId}`, data);
  },

  async bulkCreate(mindMapId: string, data: MindMapNodeBulkCreateRequest): Promise<MindMapNode[]> {
    return post<MindMapNode[]>(`${MINDMAP_BASE}/nodes/mindmap/${mindMapId}/bulk`, data);
  },

  async update(nodeId: string, data: MindMapNodeUpdateRequest): Promise<MindMapNode> {
    return put<MindMapNode>(`${MINDMAP_BASE}/nodes/${nodeId}`, data);
  },

  async delete(nodeId: string, reason?: string, cascade?: boolean): Promise<void> {
    const params = new URLSearchParams();
    if (reason) params.append('reason', reason);
    if (cascade !== undefined) params.append('cascade', String(cascade));
    return del<void>(`${MINDMAP_BASE}/nodes/${nodeId}?${params.toString()}`);
  },

  async bulkDelete(data: MindMapNodeBulkDeleteRequest): Promise<{ deletedCount: number }> {
    return post<{ deletedCount: number }>(`${MINDMAP_BASE}/nodes/bulk-delete`, data);
  },

  async move(nodeId: string, data: MindMapNodeMoveRequest): Promise<MindMapNode> {
    return post<MindMapNode>(`${MINDMAP_BASE}/nodes/${nodeId}/move`, data);
  },

  // Attachments
  async getAttachments(nodeId: string): Promise<{ items: NodeAttachment[]; total: number }> {
    return get<{ items: NodeAttachment[]; total: number }>(`${MINDMAP_BASE}/nodes/${nodeId}/attachments`);
  },

  async addAttachment(nodeId: string, data: NodeAttachmentCreateRequest): Promise<NodeAttachment> {
    return post<NodeAttachment>(`${MINDMAP_BASE}/nodes/${nodeId}/attachments`, data);
  },

  async deleteAttachment(attachmentId: string): Promise<void> {
    return del<void>(`${MINDMAP_BASE}/nodes/attachments/${attachmentId}`);
  },
};

// ============================================================================
// Combined Mind Map Module Export
// ============================================================================

export const mindMapModule = {
  templates: templateService,
  mindMaps: mindMapService,
  nodes: nodeService,
};

export default mindMapModule;
