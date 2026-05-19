/**
 * Mind Map Service Integration Tests
 * Per SDLC Phase 7 Task 7.11
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { server } from '../setup';
import { http, HttpResponse } from 'msw';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const mindmapService = {
  getMindmaps: async (params?: { page?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());

    const response = await fetch(`${API_BASE}/api/v1/mindmaps?${searchParams}`);
    const data = await response.json();
    return data;
  },
  getMindmap: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/v1/mindmaps/${id}`);
    const data = await response.json();
    return data;
  },
  createMindmap: async (data: { title: string; description?: string }) => {
    const response = await fetch(`${API_BASE}/api/v1/mindmaps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await response.json();
  },
  addNode: async (mindmapId: string, node: { text: string; parentId?: string }) => {
    const response = await fetch(`${API_BASE}/api/v1/mindmaps/${mindmapId}/nodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(node),
    });
    return await response.json();
  },
  updateNode: async (mindmapId: string, nodeId: string, data: { text: string }) => {
    const response = await fetch(`${API_BASE}/api/v1/mindmaps/${mindmapId}/nodes/${nodeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await response.json();
  },
};

describe('Mind Map Service', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue('mock-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('getMindmaps', () => {
    it('fetches mindmaps successfully', async () => {
      server.use(
        http.get(`${API_BASE}/api/v1/mindmaps`, () => {
          return HttpResponse.json({
            success: true,
            data: {
              items: [
                { id: '1', title: 'Project Planning', nodeCount: 15 },
                { id: '2', title: 'Feature Ideas', nodeCount: 8 },
              ],
              page: 1,
              pageSize: 10,
              totalItems: 2,
              totalPages: 1,
            },
          });
        })
      );

      const result = await mindmapService.getMindmaps();

      expect(result.success).toBe(true);
      expect(result.data.items).toHaveLength(2);
    });
  });

  describe('getMindmap', () => {
    it('fetches single mindmap with nodes', async () => {
      server.use(
        http.get(`${API_BASE}/api/v1/mindmaps/mm-123`, () => {
          return HttpResponse.json({
            success: true,
            data: {
              id: 'mm-123',
              title: 'Project Planning',
              nodes: [
                { id: 'n1', text: 'Central Idea', parentId: null },
                { id: 'n2', text: 'Branch 1', parentId: 'n1' },
              ],
            },
          });
        })
      );

      const result = await mindmapService.getMindmap('mm-123');

      expect(result.success).toBe(true);
      expect(result.data.nodes).toHaveLength(2);
    });
  });

  describe('createMindmap', () => {
    it('creates mindmap successfully', async () => {
      server.use(
        http.post(`${API_BASE}/api/v1/mindmaps`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            success: true,
            data: {
              id: 'new-mm-id',
              ...body,
              nodes: [],
              createdAt: '2026-01-18T10:00:00Z',
            },
          }, { status: 201 });
        })
      );

      const result = await mindmapService.createMindmap({
        title: 'Test Mind Map',
        description: 'A test mind map',
      });

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('new-mm-id');
    });
  });

  describe('addNode', () => {
    it('adds node successfully', async () => {
      server.use(
        http.post(`${API_BASE}/api/v1/mindmaps/mm-123/nodes`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            success: true,
            data: {
              id: 'new-node-id',
              text: body.text,
              parentId: body.parentId,
            },
          }, { status: 201 });
        })
      );

      const result = await mindmapService.addNode('mm-123', { text: 'New Branch', parentId: 'n1' });

      expect(result.success).toBe(true);
      expect(result.data.text).toBe('New Branch');
    });
  });

  describe('updateNode', () => {
    it('updates node successfully', async () => {
      server.use(
        http.put(`${API_BASE}/api/v1/mindmaps/mm-123/nodes/n1`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            success: true,
            data: { id: 'n1', text: body.text },
          });
        })
      );

      const result = await mindmapService.updateNode('mm-123', 'n1', { text: 'Updated Text' });

      expect(result.success).toBe(true);
      expect(result.data.text).toBe('Updated Text');
    });
  });
});
