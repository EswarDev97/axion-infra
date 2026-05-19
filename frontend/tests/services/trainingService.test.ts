/**
 * Training Service Integration Tests
 * Per SDLC Phase 7 Task 7.11
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { server } from '../setup';
import { http, HttpResponse } from 'msw';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const trainingService = {
  getCourses: async (params?: { page?: number; category?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.category) searchParams.set('category', params.category);

    const response = await fetch(`${API_BASE}/api/v1/training/courses?${searchParams}`);
    const data = await response.json();
    return data;
  },
  enroll: async (courseId: string) => {
    const response = await fetch(`${API_BASE}/api/v1/training/enrollments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId }),
    });
    return await response.json();
  },
  getEnrollments: async () => {
    const response = await fetch(`${API_BASE}/api/v1/training/enrollments/me`);
    const data = await response.json();
    return data;
  },
  updateProgress: async (enrollmentId: string, progress: number) => {
    const response = await fetch(`${API_BASE}/api/v1/training/enrollments/${enrollmentId}/progress`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progress }),
    });
    return await response.json();
  },
};

describe('Training Service', () => {
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

  describe('getCourses', () => {
    it('fetches courses successfully', async () => {
      server.use(
        http.get(`${API_BASE}/api/v1/training/courses`, () => {
          return HttpResponse.json({
            success: true,
            data: {
              items: [
                { id: '1', title: 'TypeScript Fundamentals', durationHours: 8 },
                { id: '2', title: 'React Best Practices', durationHours: 6 },
              ],
              page: 1,
              pageSize: 10,
              totalItems: 2,
              totalPages: 1,
            },
          });
        })
      );

      const result = await trainingService.getCourses();

      expect(result.success).toBe(true);
      expect(result.data.items).toHaveLength(2);
    });
  });

  describe('enroll', () => {
    it('enrolls in course successfully', async () => {
      server.use(
        http.post(`${API_BASE}/api/v1/training/enrollments`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            success: true,
            data: {
              id: 'enrollment-1',
              courseId: body.courseId,
              status: 'ENROLLED',
              progress: 0,
            },
          }, { status: 201 });
        })
      );

      const result = await trainingService.enroll('course-1');

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('ENROLLED');
    });
  });

  describe('getEnrollments', () => {
    it('fetches my enrollments successfully', async () => {
      server.use(
        http.get(`${API_BASE}/api/v1/training/enrollments/me`, () => {
          return HttpResponse.json({
            success: true,
            data: [
              { id: '1', courseTitle: 'TypeScript Fundamentals', progress: 50 },
              { id: '2', courseTitle: 'React Best Practices', progress: 25 },
            ],
          });
        })
      );

      const result = await trainingService.getEnrollments();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('updateProgress', () => {
    it('updates progress successfully', async () => {
      server.use(
        http.patch(`${API_BASE}/api/v1/training/enrollments/enrollment-1/progress`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            success: true,
            data: { id: 'enrollment-1', progress: body.progress },
          });
        })
      );

      const result = await trainingService.updateProgress('enrollment-1', 75);

      expect(result.success).toBe(true);
      expect(result.data.progress).toBe(75);
    });
  });
});
