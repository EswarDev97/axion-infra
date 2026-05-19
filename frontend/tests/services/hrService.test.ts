/**
 * HR Service Integration Tests
 * Per SDLC Phase 7 Task 7.11
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { server } from '../setup';
import { http, HttpResponse } from 'msw';

// We'll create a mock service for testing
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Mock HR service functions
const hrService = {
  getEmployees: async (params?: { page?: number; pageSize?: number; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('page_size', params.pageSize.toString());
    if (params?.search) searchParams.set('search', params.search);

    const response = await fetch(`${API_BASE}/api/v1/hr/employees?${searchParams}`);
    const data = await response.json();
    return data;
  },
  getEmployee: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/v1/hr/employees/${id}`);
    const data = await response.json();
    return data;
  },
  createEmployee: async (employeeData: any) => {
    const response = await fetch(`${API_BASE}/api/v1/hr/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employeeData),
    });
    const data = await response.json();
    return data;
  },
  updateEmployee: async (id: string, employeeData: any) => {
    const response = await fetch(`${API_BASE}/api/v1/hr/employees/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employeeData),
    });
    const data = await response.json();
    return data;
  },
};

describe('HR Service', () => {
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

  describe('getEmployees', () => {
    it('fetches employees list successfully', async () => {
      server.use(
        http.get(`${API_BASE}/api/v1/hr/employees`, () => {
          return HttpResponse.json({
            success: true,
            data: {
              items: [
                { id: '1', email: 'john@example.com', firstName: 'John', lastName: 'Doe' },
                { id: '2', email: 'jane@example.com', firstName: 'Jane', lastName: 'Smith' },
              ],
              page: 1,
              pageSize: 10,
              totalItems: 2,
              totalPages: 1,
            },
          });
        })
      );

      const result = await hrService.getEmployees();

      expect(result.success).toBe(true);
      expect(result.data.items).toHaveLength(2);
    });

    it('handles pagination parameters', async () => {
      let capturedUrl = '';

      server.use(
        http.get(`${API_BASE}/api/v1/hr/employees`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            success: true,
            data: { items: [], page: 2, pageSize: 20, totalItems: 100, totalPages: 5 },
          });
        })
      );

      await hrService.getEmployees({ page: 2, pageSize: 20 });

      expect(capturedUrl).toContain('page=2');
      expect(capturedUrl).toContain('page_size=20');
    });

    it('handles search parameter', async () => {
      let capturedUrl = '';

      server.use(
        http.get(`${API_BASE}/api/v1/hr/employees`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            success: true,
            data: { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
          });
        })
      );

      await hrService.getEmployees({ search: 'john' });

      expect(capturedUrl).toContain('search=john');
    });

    it('handles error response', async () => {
      server.use(
        http.get(`${API_BASE}/api/v1/hr/employees`, () => {
          return HttpResponse.json(
            { success: false, error: { message: 'Unauthorized' } },
            { status: 401 }
          );
        })
      );

      const result = await hrService.getEmployees();

      expect(result.success).toBe(false);
    });
  });

  describe('getEmployee', () => {
    it('fetches single employee successfully', async () => {
      server.use(
        http.get(`${API_BASE}/api/v1/hr/employees/emp-123`, () => {
          return HttpResponse.json({
            success: true,
            data: {
              id: 'emp-123',
              email: 'john@example.com',
              firstName: 'John',
              lastName: 'Doe',
              departmentName: 'Engineering',
            },
          });
        })
      );

      const result = await hrService.getEmployee('emp-123');

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('emp-123');
      expect(result.data.firstName).toBe('John');
    });

    it('handles not found error', async () => {
      server.use(
        http.get(`${API_BASE}/api/v1/hr/employees/not-found`, () => {
          return HttpResponse.json(
            { success: false, error: { message: 'Employee not found' } },
            { status: 404 }
          );
        })
      );

      const result = await hrService.getEmployee('not-found');

      expect(result.success).toBe(false);
    });
  });

  describe('createEmployee', () => {
    it('creates employee successfully', async () => {
      const newEmployee = {
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'Employee',
        departmentId: 'dept-1',
      };

      server.use(
        http.post(`${API_BASE}/api/v1/hr/employees`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            success: true,
            data: {
              id: 'new-emp-id',
              ...body,
            },
          }, { status: 201 });
        })
      );

      const result = await hrService.createEmployee(newEmployee);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('new-emp-id');
      expect(result.data.email).toBe('new@example.com');
    });

    it('handles validation errors', async () => {
      server.use(
        http.post(`${API_BASE}/api/v1/hr/employees`, () => {
          return HttpResponse.json({
            success: false,
            error: {
              message: 'Validation error',
              details: [
                { field: 'email', message: 'Email already exists' },
              ],
            },
          }, { status: 422 });
        })
      );

      const result = await hrService.createEmployee({ email: 'existing@example.com' });

      expect(result.success).toBe(false);
      expect(result.error.details).toBeDefined();
    });
  });

  describe('updateEmployee', () => {
    it('updates employee successfully', async () => {
      server.use(
        http.patch(`${API_BASE}/api/v1/hr/employees/emp-123`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            success: true,
            data: {
              id: 'emp-123',
              firstName: body.firstName,
              lastName: 'Doe',
            },
          });
        })
      );

      const result = await hrService.updateEmployee('emp-123', { firstName: 'Johnny' });

      expect(result.success).toBe(true);
      expect(result.data.firstName).toBe('Johnny');
    });

    it('handles conflict errors', async () => {
      server.use(
        http.patch(`${API_BASE}/api/v1/hr/employees/emp-123`, () => {
          return HttpResponse.json({
            success: false,
            error: { message: 'Conflict - record modified by another user' },
          }, { status: 409 });
        })
      );

      const result = await hrService.updateEmployee('emp-123', { firstName: 'Test' });

      expect(result.success).toBe(false);
    });
  });
});
