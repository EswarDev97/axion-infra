/**
 * Approval Service Integration Tests
 * Per SDLC Phase 7 Task 7.11
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { server } from '../setup';
import { http, HttpResponse } from 'msw';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Mock Approval service functions
const approvalService = {
  getPendingApprovals: async (params?: { page?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());

    const response = await fetch(`${API_BASE}/api/v1/approvals/instances/pending?${searchParams}`);
    const data = await response.json();
    return data;
  },
  approveInstance: async (id: string, comment?: string) => {
    const response = await fetch(`${API_BASE}/api/v1/approvals/instances/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comments: comment }),
    });
    const data = await response.json();
    return data;
  },
  rejectInstance: async (id: string, reason: string) => {
    const response = await fetch(`${API_BASE}/api/v1/approvals/instances/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'REJECTED', comments: reason }),
    });
    const data = await response.json();
    return data;
  },
  getWorkflows: async () => {
    const response = await fetch(`${API_BASE}/api/v1/approvals/workflows`);
    const data = await response.json();
    return data;
  },
  getDelegations: async () => {
    const response = await fetch(`${API_BASE}/api/v1/approvals/delegations`);
    const data = await response.json();
    return data;
  },
};

describe('Approval Service', () => {
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

  describe('getPendingApprovals', () => {
    it('fetches pending approvals successfully', async () => {
      server.use(
        http.get(`${API_BASE}/api/v1/approvals/instances/pending`, () => {
          return HttpResponse.json({
            success: true,
            data: {
              items: [
                { id: '1', entityType: 'LEAVE_REQUEST', entityTitle: 'Annual Leave', status: 'PENDING' },
                { id: '2', entityType: 'EXPENSE_REQUEST', entityTitle: 'Travel Expenses', status: 'PENDING' },
              ],
              page: 1,
              pageSize: 10,
              totalItems: 2,
              totalPages: 1,
            },
          });
        })
      );

      const result = await approvalService.getPendingApprovals();

      expect(result.success).toBe(true);
      expect(result.data.items).toHaveLength(2);
    });
  });

  describe('approveInstance', () => {
    it('approves instance successfully', async () => {
      server.use(
        http.post(`${API_BASE}/api/v1/approvals/instances/inst-123/approve`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            success: true,
            data: {
              id: 'inst-123',
              status: 'APPROVED',
              approvalComment: body.comments,
            },
          });
        })
      );

      const result = await approvalService.approveInstance('inst-123', 'Looks good, approved');

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('APPROVED');
    });

    it('handles unauthorized approval', async () => {
      server.use(
        http.post(`${API_BASE}/api/v1/approvals/instances/inst-123/approve`, () => {
          return HttpResponse.json(
            { success: false, error: { message: 'Not authorized to approve this instance' } },
            { status: 403 }
          );
        })
      );

      const result = await approvalService.approveInstance('inst-123');

      expect(result.success).toBe(false);
    });
  });

  describe('rejectInstance', () => {
    it('rejects instance successfully', async () => {
      server.use(
        http.post(`${API_BASE}/api/v1/approvals/instances/inst-123/reject`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            success: true,
            data: {
              id: 'inst-123',
              status: 'REJECTED',
              rejectionReason: body.comments,
            },
          });
        })
      );

      const result = await approvalService.rejectInstance('inst-123', 'Insufficient documentation');

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('REJECTED');
    });
  });

  describe('getWorkflows', () => {
    it('fetches workflows successfully', async () => {
      server.use(
        http.get(`${API_BASE}/api/v1/approvals/workflows`, () => {
          return HttpResponse.json({
            success: true,
            data: [
              { id: '1', name: 'Leave Approval', entityType: 'LEAVE_REQUEST', isActive: true },
              { id: '2', name: 'Expense Approval', entityType: 'EXPENSE_REQUEST', isActive: true },
            ],
          });
        })
      );

      const result = await approvalService.getWorkflows();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('getDelegations', () => {
    it('fetches delegations successfully', async () => {
      server.use(
        http.get(`${API_BASE}/api/v1/approvals/delegations`, () => {
          return HttpResponse.json({
            success: true,
            data: [
              { id: '1', delegateId: 'user-2', startDate: '2026-01-01', endDate: '2026-01-31' },
            ],
          });
        })
      );

      const result = await approvalService.getDelegations();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });
});
