/**
 * Expense Service Integration Tests
 * Per SDLC Phase 7 Task 7.11
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { server } from '../setup';
import { http, HttpResponse } from 'msw';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Mock Expense service functions
const expenseService = {
  getExpenseRequests: async (params?: { page?: number; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.status) searchParams.set('status', params.status);

    const response = await fetch(`${API_BASE}/api/v1/expenses/requests?${searchParams}`);
    const data = await response.json();
    return data;
  },
  createExpenseRequest: async (requestData: any) => {
    const response = await fetch(`${API_BASE}/api/v1/expenses/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
    });
    const data = await response.json();
    return data;
  },
  submitExpenseRequest: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/v1/expenses/requests/${id}/submit`, {
      method: 'POST',
    });
    const data = await response.json();
    return data;
  },
  managerApprove: async (id: string, comment?: string) => {
    const response = await fetch(`${API_BASE}/api/v1/expenses/requests/${id}/manager-approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment }),
    });
    const data = await response.json();
    return data;
  },
  getCategories: async () => {
    const response = await fetch(`${API_BASE}/api/v1/expenses/categories`);
    const data = await response.json();
    return data;
  },
};

describe('Expense Service', () => {
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

  describe('getExpenseRequests', () => {
    it('fetches expense requests successfully', async () => {
      server.use(
        http.get(`${API_BASE}/api/v1/expenses/requests`, () => {
          return HttpResponse.json({
            success: true,
            data: {
              items: [
                { id: '1', title: 'Travel Expenses', status: 'SUBMITTED', totalAmount: 1500 },
                { id: '2', title: 'Office Supplies', status: 'DRAFT', totalAmount: 250 },
              ],
              page: 1,
              pageSize: 10,
              totalItems: 2,
              totalPages: 1,
            },
          });
        })
      );

      const result = await expenseService.getExpenseRequests();

      expect(result.success).toBe(true);
      expect(result.data.items).toHaveLength(2);
    });

    it('filters by status', async () => {
      let capturedUrl = '';

      server.use(
        http.get(`${API_BASE}/api/v1/expenses/requests`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            success: true,
            data: { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
          });
        })
      );

      await expenseService.getExpenseRequests({ status: 'SUBMITTED' });

      expect(capturedUrl).toContain('status=SUBMITTED');
    });
  });

  describe('createExpenseRequest', () => {
    it('creates expense request successfully', async () => {
      const newRequest = {
        title: 'Conference Travel',
        description: 'Travel expenses for tech conference',
      };

      server.use(
        http.post(`${API_BASE}/api/v1/expenses/requests`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            success: true,
            data: {
              id: 'new-expense-id',
              ...body,
              status: 'DRAFT',
              requestNumber: 'EXP-2026-0001',
            },
          }, { status: 201 });
        })
      );

      const result = await expenseService.createExpenseRequest(newRequest);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('new-expense-id');
      expect(result.data.status).toBe('DRAFT');
    });
  });

  describe('submitExpenseRequest', () => {
    it('submits expense request successfully', async () => {
      server.use(
        http.post(`${API_BASE}/api/v1/expenses/requests/exp-123/submit`, () => {
          return HttpResponse.json({
            success: true,
            data: {
              id: 'exp-123',
              status: 'SUBMITTED',
              submittedAt: '2026-01-18T10:00:00Z',
            },
          });
        })
      );

      const result = await expenseService.submitExpenseRequest('exp-123');

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('SUBMITTED');
    });
  });

  describe('managerApprove', () => {
    it('approves expense request successfully', async () => {
      server.use(
        http.post(`${API_BASE}/api/v1/expenses/requests/exp-123/manager-approve`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            success: true,
            data: {
              id: 'exp-123',
              status: 'MANAGER_APPROVED',
              managerApprovalComment: body.comment,
            },
          });
        })
      );

      const result = await expenseService.managerApprove('exp-123', 'Approved for reimbursement');

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('MANAGER_APPROVED');
    });

    it('handles unauthorized approval', async () => {
      server.use(
        http.post(`${API_BASE}/api/v1/expenses/requests/exp-123/manager-approve`, () => {
          return HttpResponse.json(
            { success: false, error: { message: 'Not authorized to approve this expense' } },
            { status: 403 }
          );
        })
      );

      const result = await expenseService.managerApprove('exp-123');

      expect(result.success).toBe(false);
    });
  });

  describe('getCategories', () => {
    it('fetches expense categories successfully', async () => {
      server.use(
        http.get(`${API_BASE}/api/v1/expenses/categories`, () => {
          return HttpResponse.json({
            success: true,
            data: [
              { id: '1', name: 'Travel', code: 'TRAVEL', maxAmount: 10000 },
              { id: '2', name: 'Office Supplies', code: 'OFFICE', maxAmount: 500 },
              { id: '3', name: 'Client Entertainment', code: 'CLIENT', maxAmount: 2000 },
            ],
          });
        })
      );

      const result = await expenseService.getCategories();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
    });
  });
});
