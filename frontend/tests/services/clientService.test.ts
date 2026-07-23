/**
 * Client Service Unit Tests
 * Covers the `type` query param support added for the Payment Management
 * module's Client/Finance dropdowns (see Task T10).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { server } from '../setup';
import { http, HttpResponse } from 'msw';
import { clientService } from '@/services/complaint/clientService';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api/v1';

describe('clientService', () => {
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

  describe('list', () => {
    it('test_list_passes_type_query_param', async () => {
      let capturedUrl = '';

      server.use(
        http.get(`${API_BASE_URL}/complaints/clients`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            success: true,
            data: { items: [], total: 0, page: 1, limit: 10, pages: 0 },
          });
        })
      );

      await clientService.list({ type: 'FINANCER' });

      expect(capturedUrl).toContain('type=FINANCER');
    });

    it('fetches clients list without a type filter', async () => {
      server.use(
        http.get(`${API_BASE_URL}/complaints/clients`, () => {
          return HttpResponse.json({
            success: true,
            data: {
              items: [
                { id: '1', name: 'Acme Insurance', code: 'ACME', type: 'CLIENT', isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
              ],
              total: 1,
              page: 1,
              limit: 10,
              pages: 1,
            },
          });
        })
      );

      const result = await clientService.list();

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
