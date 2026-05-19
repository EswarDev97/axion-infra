/**
 * Report Service Integration Tests
 * Per SDLC Phase 7 Task 7.11
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { server } from '../setup';
import { http, HttpResponse } from 'msw';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const reportService = {
  getReportTypes: async () => {
    const response = await fetch(`${API_BASE}/api/v1/reports/types`);
    const data = await response.json();
    return data;
  },
  generateReport: async (params: { type: string; startDate: string; endDate: string }) => {
    const response = await fetch(`${API_BASE}/api/v1/reports/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await response.json();
  },
  getReport: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/v1/reports/${id}`);
    const data = await response.json();
    return data;
  },
};

describe('Report Service', () => {
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

  describe('getReportTypes', () => {
    it('fetches report types successfully', async () => {
      server.use(
        http.get(`${API_BASE}/api/v1/reports/types`, () => {
          return HttpResponse.json({
            success: true,
            data: [
              { id: 'LEAVE_SUMMARY', name: 'Leave Summary Report' },
              { id: 'EXPENSE_SUMMARY', name: 'Expense Summary Report' },
              { id: 'ATTENDANCE', name: 'Attendance Report' },
            ],
          });
        })
      );

      const result = await reportService.getReportTypes();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
    });
  });

  describe('generateReport', () => {
    it('generates report successfully', async () => {
      server.use(
        http.post(`${API_BASE}/api/v1/reports/generate`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            success: true,
            data: {
              id: 'report-1',
              type: body.type,
              status: 'COMPLETED',
              generatedAt: '2026-01-18T10:00:00Z',
            },
          });
        })
      );

      const result = await reportService.generateReport({
        type: 'LEAVE_SUMMARY',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('COMPLETED');
    });
  });

  describe('getReport', () => {
    it('fetches report successfully', async () => {
      server.use(
        http.get(`${API_BASE}/api/v1/reports/report-1`, () => {
          return HttpResponse.json({
            success: true,
            data: {
              id: 'report-1',
              type: 'LEAVE_SUMMARY',
              data: { totalLeaves: 150, approvedLeaves: 120 },
            },
          });
        })
      );

      const result = await reportService.getReport('report-1');

      expect(result.success).toBe(true);
      expect(result.data.type).toBe('LEAVE_SUMMARY');
    });
  });
});
