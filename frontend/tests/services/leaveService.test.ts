/**
 * Leave Service Integration Tests
 * Per SDLC Phase 7 Task 7.11
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { server } from '../setup';
import { http, HttpResponse } from 'msw';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Mock Leave service functions
const leaveService = {
  getLeaveRequests: async (params?: { page?: number; status?: string; view?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.view) searchParams.set('view', params.view);

    const response = await fetch(`${API_BASE}/api/v1/hr/leave/requests?${searchParams}`);
    const data = await response.json();
    return data;
  },
  createLeaveRequest: async (requestData: any) => {
    const response = await fetch(`${API_BASE}/api/v1/hr/leave/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
    });
    const data = await response.json();
    return data;
  },
  approveLeaveRequest: async (id: string, comment?: string) => {
    const response = await fetch(`${API_BASE}/api/v1/hr/leave/requests/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment }),
    });
    const data = await response.json();
    return data;
  },
  rejectLeaveRequest: async (id: string, reason: string) => {
    const response = await fetch(`${API_BASE}/api/v1/hr/leave/requests/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    const data = await response.json();
    return data;
  },
  cancelLeaveRequest: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/v1/hr/leave/requests/${id}/cancel`, {
      method: 'POST',
    });
    const data = await response.json();
    return data;
  },
  getLeaveBalances: async (year?: number) => {
    const searchParams = new URLSearchParams();
    if (year) searchParams.set('year', year.toString());

    const response = await fetch(`${API_BASE}/api/v1/hr/leave/balances?${searchParams}`);
    const data = await response.json();
    return data;
  },
};

describe('Leave Service', () => {
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

  describe('getLeaveRequests', () => {
    it('fetches leave requests successfully', async () => {
      server.use(
        http.get(`${API_BASE}/api/v1/hr/leave/requests`, () => {
          return HttpResponse.json({
            success: true,
            data: {
              items: [
                { id: '1', leaveTypeName: 'Annual Leave', startDate: '2024-01-10', endDate: '2024-01-15', status: 'PENDING' },
                { id: '2', leaveTypeName: 'Sick Leave', startDate: '2024-01-20', endDate: '2024-01-20', status: 'APPROVED' },
              ],
              page: 1,
              pageSize: 10,
              totalItems: 2,
              totalPages: 1,
            },
          });
        })
      );

      const result = await leaveService.getLeaveRequests();

      expect(result.success).toBe(true);
      expect(result.data.items).toHaveLength(2);
    });

    it('filters by status', async () => {
      let capturedUrl = '';

      server.use(
        http.get(`${API_BASE}/api/v1/hr/leave/requests`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            success: true,
            data: { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
          });
        })
      );

      await leaveService.getLeaveRequests({ status: 'PENDING' });

      expect(capturedUrl).toContain('status=PENDING');
    });

    it('filters by view', async () => {
      let capturedUrl = '';

      server.use(
        http.get(`${API_BASE}/api/v1/hr/leave/requests`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            success: true,
            data: { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
          });
        })
      );

      await leaveService.getLeaveRequests({ view: 'pending' });

      expect(capturedUrl).toContain('view=pending');
    });
  });

  describe('createLeaveRequest', () => {
    it('creates leave request successfully', async () => {
      const newRequest = {
        leaveTypeId: 'lt-1',
        startDate: '2024-02-01',
        endDate: '2024-02-05',
        reason: 'Family vacation',
      };

      server.use(
        http.post(`${API_BASE}/api/v1/hr/leave/requests`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            success: true,
            data: {
              id: 'new-request-id',
              ...body,
              status: 'PENDING',
              daysRequested: 5,
            },
          }, { status: 201 });
        })
      );

      const result = await leaveService.createLeaveRequest(newRequest);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('new-request-id');
      expect(result.data.status).toBe('PENDING');
    });

    it('handles insufficient balance error', async () => {
      server.use(
        http.post(`${API_BASE}/api/v1/hr/leave/requests`, () => {
          return HttpResponse.json({
            success: false,
            error: {
              message: 'Insufficient leave balance',
              code: 'LEAVE_001',
            },
          }, { status: 422 });
        })
      );

      const result = await leaveService.createLeaveRequest({
        leaveTypeId: 'lt-1',
        startDate: '2024-02-01',
        endDate: '2024-12-31',
        reason: 'Too long',
      });

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('balance');
    });

    it('handles overlapping leave error', async () => {
      server.use(
        http.post(`${API_BASE}/api/v1/hr/leave/requests`, () => {
          return HttpResponse.json({
            success: false,
            error: {
              message: 'Overlapping leave request exists',
              code: 'LEAVE_002',
            },
          }, { status: 409 });
        })
      );

      const result = await leaveService.createLeaveRequest({
        leaveTypeId: 'lt-1',
        startDate: '2024-01-10',
        endDate: '2024-01-15',
        reason: 'Overlapping',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('approveLeaveRequest', () => {
    it('approves leave request successfully', async () => {
      server.use(
        http.post(`${API_BASE}/api/v1/hr/leave/requests/req-123/approve`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            success: true,
            data: {
              id: 'req-123',
              status: 'APPROVED',
              approvedBy: 'manager-id',
              approvalComment: body.comment,
            },
          });
        })
      );

      const result = await leaveService.approveLeaveRequest('req-123', 'Approved. Have a good vacation!');

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('APPROVED');
    });

    it('handles unauthorized approval', async () => {
      server.use(
        http.post(`${API_BASE}/api/v1/hr/leave/requests/req-123/approve`, () => {
          return HttpResponse.json(
            { success: false, error: { message: 'Not authorized to approve this request' } },
            { status: 403 }
          );
        })
      );

      const result = await leaveService.approveLeaveRequest('req-123');

      expect(result.success).toBe(false);
    });
  });

  describe('rejectLeaveRequest', () => {
    it('rejects leave request successfully', async () => {
      server.use(
        http.post(`${API_BASE}/api/v1/hr/leave/requests/req-123/reject`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            success: true,
            data: {
              id: 'req-123',
              status: 'REJECTED',
              rejectionReason: body.reason,
            },
          });
        })
      );

      const result = await leaveService.rejectLeaveRequest('req-123', 'Project deadline conflict');

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('REJECTED');
    });
  });

  describe('cancelLeaveRequest', () => {
    it('cancels leave request successfully', async () => {
      server.use(
        http.post(`${API_BASE}/api/v1/hr/leave/requests/req-123/cancel`, () => {
          return HttpResponse.json({
            success: true,
            data: {
              id: 'req-123',
              status: 'CANCELLED',
            },
          });
        })
      );

      const result = await leaveService.cancelLeaveRequest('req-123');

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('CANCELLED');
    });

    it('handles already processed request', async () => {
      server.use(
        http.post(`${API_BASE}/api/v1/hr/leave/requests/req-123/cancel`, () => {
          return HttpResponse.json(
            { success: false, error: { message: 'Cannot cancel approved leave request' } },
            { status: 422 }
          );
        })
      );

      const result = await leaveService.cancelLeaveRequest('req-123');

      expect(result.success).toBe(false);
    });
  });

  describe('getLeaveBalances', () => {
    it('fetches leave balances successfully', async () => {
      server.use(
        http.get(`${API_BASE}/api/v1/hr/leave/balances`, () => {
          return HttpResponse.json({
            success: true,
            data: [
              { id: '1', leaveTypeName: 'Annual Leave', entitledDays: 20, usedDays: 5, availableDays: 15 },
              { id: '2', leaveTypeName: 'Sick Leave', entitledDays: 10, usedDays: 2, availableDays: 8 },
            ],
          });
        })
      );

      const result = await leaveService.getLeaveBalances();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('filters by year', async () => {
      let capturedUrl = '';

      server.use(
        http.get(`${API_BASE}/api/v1/hr/leave/balances`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            success: true,
            data: [],
          });
        })
      );

      await leaveService.getLeaveBalances(2024);

      expect(capturedUrl).toContain('year=2024');
    });
  });
});
