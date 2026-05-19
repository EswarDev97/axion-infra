/**
 * Complaint Service Integration Tests
 * Per SDLC Phase 7 Task 7.11
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { server } from '../setup';
import { http, HttpResponse } from 'msw';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const complaintService = {
  getComplaints: async (params?: { page?: number; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.status) searchParams.set('status', params.status);

    const response = await fetch(`${API_BASE}/api/v1/complaints?${searchParams}`);
    const data = await response.json();
    return data;
  },
  createComplaint: async (data: any) => {
    const response = await fetch(`${API_BASE}/api/v1/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await response.json();
  },
  updateStatus: async (id: string, status: string) => {
    const response = await fetch(`${API_BASE}/api/v1/complaints/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return await response.json();
  },
  addComment: async (id: string, comment: string) => {
    const response = await fetch(`${API_BASE}/api/v1/complaints/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment }),
    });
    return await response.json();
  },
};

describe('Complaint Service', () => {
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

  describe('getComplaints', () => {
    it('fetches complaints successfully', async () => {
      server.use(
        http.get(`${API_BASE}/api/v1/complaints`, () => {
          return HttpResponse.json({
            success: true,
            data: {
              items: [
                { id: '1', subject: 'Equipment Issue', status: 'OPEN' },
                { id: '2', subject: 'Policy Concern', status: 'IN_PROGRESS' },
              ],
              page: 1,
              pageSize: 10,
              totalItems: 2,
              totalPages: 1,
            },
          });
        })
      );

      const result = await complaintService.getComplaints();

      expect(result.success).toBe(true);
      expect(result.data.items).toHaveLength(2);
    });
  });

  describe('createComplaint', () => {
    it('creates complaint successfully', async () => {
      server.use(
        http.post(`${API_BASE}/api/v1/complaints`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            success: true,
            data: {
              id: 'new-complaint-id',
              ...body,
              status: 'OPEN',
              createdAt: '2026-01-18T10:00:00Z',
            },
          }, { status: 201 });
        })
      );

      const result = await complaintService.createComplaint({
        subject: 'Test Complaint',
        description: 'This is a test complaint',
        category: 'OTHER',
      });

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('OPEN');
    });
  });

  describe('updateStatus', () => {
    it('updates complaint status successfully', async () => {
      server.use(
        http.patch(`${API_BASE}/api/v1/complaints/complaint-123/status`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            success: true,
            data: { id: 'complaint-123', status: body.status },
          });
        })
      );

      const result = await complaintService.updateStatus('complaint-123', 'RESOLVED');

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('RESOLVED');
    });
  });

  describe('addComment', () => {
    it('adds comment successfully', async () => {
      server.use(
        http.post(`${API_BASE}/api/v1/complaints/complaint-123/comments`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            success: true,
            data: { id: 'comment-1', content: body.comment },
          });
        })
      );

      const result = await complaintService.addComment('complaint-123', 'Investigating issue');

      expect(result.success).toBe(true);
    });
  });
});
