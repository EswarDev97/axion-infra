/**
 * Payment Service Unit Tests
 * Per aicodepath-docs/plan/2026-07-23-payment-management-module-plan.md Task T9
 *
 * Exercises the real `paymentService` (built on the shared `get/post/put/del`
 * axios helpers) against a mocked API using MSW, mirroring the structure used
 * for other service tests in this suite but targeting the actual module
 * (not a locally re-implemented fetch shim) so the test fails until
 * `paymentService.ts` exists.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { server } from '../setup';
import { http, HttpResponse } from 'msw';
import { paymentService, type Payment } from '@/services/complaint/paymentService';

// Matches apiClient's baseURL resolution: NEXT_PUBLIC_API_BASE_URL, falling
// back to http://localhost:3001/api/v1 (see src/services/api/client.ts).
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api/v1';

const mockPayment: Payment = {
  id: 'payment-1',
  caseReference: 'CASE-2026-001',
  clientId: 'client-1',
  financeId: 'finance-1',
  vehicleRegistrationNumber: 'MH12AB1234',
  executiveEmployeeId: 'employee-1',
  caseStatus: 'ASSIGNED',
  billingStatus: 'CUSTOMER_BILLING',
  paymentMode: 'TRANSFER',
  utrNumber: 'UTR123456789',
  transactionDatetime: '2026-07-20T10:00:00Z',
  amount: 1500.5,
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
};

function envelope<T>(data: T) {
  return {
    success: true,
    data,
    message: 'OK',
    timestamp: '2026-07-23T00:00:00Z',
    requestId: 'req-1',
  };
}

describe('paymentService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('list', () => {
    it('hits GET /complaints/payments and returns typed list data', async () => {
      let capturedUrl = '';

      server.use(
        http.get(`${API_BASE_URL}/complaints/payments`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(
            envelope({
              items: [mockPayment],
              total: 1,
              page: 1,
              limit: 20,
              pages: 1,
            })
          );
        })
      );

      const result = await paymentService.list({ page: 1, limit: 20, search: 'CASE-2026' });

      expect(capturedUrl).toContain('/complaints/payments');
      expect(capturedUrl).toContain('search=CASE-2026');
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual(mockPayment);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.pages).toBe(1);
    });
  });

  describe('getById', () => {
    it('hits GET /complaints/payments/:id and returns typed payment data', async () => {
      server.use(
        http.get(`${API_BASE_URL}/complaints/payments/payment-1`, () => {
          return HttpResponse.json(envelope(mockPayment));
        })
      );

      const result = await paymentService.getById('payment-1');

      expect(result).toEqual(mockPayment);
    });
  });

  describe('create', () => {
    it('hits POST /complaints/payments with the request body and returns created payment', async () => {
      let capturedBody: unknown = null;
      let capturedMethod = '';

      server.use(
        http.post(`${API_BASE_URL}/complaints/payments`, async ({ request }) => {
          capturedMethod = request.method;
          capturedBody = await request.json();
          return HttpResponse.json(envelope(mockPayment), { status: 201 });
        })
      );

      const createRequest = {
        caseReference: 'CASE-2026-001',
        clientId: 'client-1',
        financeId: 'finance-1',
        vehicleRegistrationNumber: 'MH12AB1234',
        executiveEmployeeId: 'employee-1',
        caseStatus: 'ASSIGNED',
        billingStatus: 'CUSTOMER_BILLING',
        paymentMode: 'TRANSFER',
        utrNumber: 'UTR123456789',
        transactionDatetime: '2026-07-20T10:00:00Z',
        amount: 1500.5,
      };

      const result = await paymentService.create(createRequest);

      expect(capturedMethod).toBe('POST');
      expect(capturedBody).toEqual(createRequest);
      expect(result).toEqual(mockPayment);
    });
  });

  describe('update', () => {
    it('hits PUT /complaints/payments/:id with the request body and returns updated payment', async () => {
      let capturedBody: unknown = null;
      let capturedMethod = '';
      const updated: Payment = { ...mockPayment, caseStatus: 'CLOSED' };

      server.use(
        http.put(`${API_BASE_URL}/complaints/payments/payment-1`, async ({ request }) => {
          capturedMethod = request.method;
          capturedBody = await request.json();
          return HttpResponse.json(envelope(updated));
        })
      );

      const updateRequest = { caseStatus: 'CLOSED' };
      const result = await paymentService.update('payment-1', updateRequest);

      expect(capturedMethod).toBe('PUT');
      expect(capturedBody).toEqual(updateRequest);
      expect(result).toEqual(updated);
    });
  });

  describe('delete', () => {
    it('hits DELETE /complaints/payments/:id', async () => {
      let capturedMethod = '';

      server.use(
        http.delete(`${API_BASE_URL}/complaints/payments/payment-1`, ({ request }) => {
          capturedMethod = request.method;
          return HttpResponse.json(envelope(null));
        })
      );

      await paymentService.delete('payment-1');

      expect(capturedMethod).toBe('DELETE');
    });
  });
});
