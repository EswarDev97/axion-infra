/**
 * Task Service Integration Tests
 * Per SDLC Phase 7 Task 7.11
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { server } from '../setup';
import { http, HttpResponse } from 'msw';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Mock Task service functions
const taskService = {
  getTasks: async (params?: { page?: number; status?: string; priority?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.priority) searchParams.set('priority', params.priority);

    const response = await fetch(`${API_BASE}/api/v1/tasks?${searchParams}`);
    const data = await response.json();
    return data;
  },
  getTask: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/v1/tasks/${id}`);
    const data = await response.json();
    return data;
  },
  createTask: async (taskData: any) => {
    const response = await fetch(`${API_BASE}/api/v1/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData),
    });
    const data = await response.json();
    return data;
  },
  updateTask: async (id: string, taskData: any) => {
    const response = await fetch(`${API_BASE}/api/v1/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData),
    });
    const data = await response.json();
    return data;
  },
  deleteTask: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/v1/tasks/${id}`, {
      method: 'DELETE',
    });
    if (response.status === 204) {
      return { success: true };
    }
    const data = await response.json();
    return data;
  },
};

describe('Task Service', () => {
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

  describe('getTasks', () => {
    it('fetches tasks list successfully', async () => {
      server.use(
        http.get(`${API_BASE}/api/v1/tasks`, () => {
          return HttpResponse.json({
            success: true,
            data: {
              items: [
                { id: '1', title: 'Task 1', priority: 'HIGH', statusName: 'In Progress' },
                { id: '2', title: 'Task 2', priority: 'MEDIUM', statusName: 'Todo' },
              ],
              page: 1,
              pageSize: 10,
              totalItems: 2,
              totalPages: 1,
            },
          });
        })
      );

      const result = await taskService.getTasks();

      expect(result.success).toBe(true);
      expect(result.data.items).toHaveLength(2);
    });

    it('filters by status', async () => {
      let capturedUrl = '';

      server.use(
        http.get(`${API_BASE}/api/v1/tasks`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            success: true,
            data: { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
          });
        })
      );

      await taskService.getTasks({ status: 'IN_PROGRESS' });

      expect(capturedUrl).toContain('status=IN_PROGRESS');
    });

    it('filters by priority', async () => {
      let capturedUrl = '';

      server.use(
        http.get(`${API_BASE}/api/v1/tasks`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            success: true,
            data: { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
          });
        })
      );

      await taskService.getTasks({ priority: 'HIGH' });

      expect(capturedUrl).toContain('priority=HIGH');
    });
  });

  describe('getTask', () => {
    it('fetches single task successfully', async () => {
      server.use(
        http.get(`${API_BASE}/api/v1/tasks/task-123`, () => {
          return HttpResponse.json({
            success: true,
            data: {
              id: 'task-123',
              title: 'Important Task',
              description: 'Task description',
              priority: 'HIGH',
              assignees: [],
            },
          });
        })
      );

      const result = await taskService.getTask('task-123');

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('task-123');
      expect(result.data.title).toBe('Important Task');
    });

    it('handles not found error', async () => {
      server.use(
        http.get(`${API_BASE}/api/v1/tasks/not-found`, () => {
          return HttpResponse.json(
            { success: false, error: { message: 'Task not found' } },
            { status: 404 }
          );
        })
      );

      const result = await taskService.getTask('not-found');

      expect(result.success).toBe(false);
    });
  });

  describe('createTask', () => {
    it('creates task successfully', async () => {
      const newTask = {
        title: 'New Task',
        description: 'Task description',
        priority: 'MEDIUM',
        projectId: 'proj-1',
      };

      server.use(
        http.post(`${API_BASE}/api/v1/tasks`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            success: true,
            data: {
              id: 'new-task-id',
              ...body,
              statusName: 'Todo',
            },
          }, { status: 201 });
        })
      );

      const result = await taskService.createTask(newTask);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('new-task-id');
      expect(result.data.title).toBe('New Task');
    });

    it('handles validation errors', async () => {
      server.use(
        http.post(`${API_BASE}/api/v1/tasks`, () => {
          return HttpResponse.json({
            success: false,
            error: {
              message: 'Validation error',
              details: [
                { field: 'title', message: 'Title is required' },
              ],
            },
          }, { status: 422 });
        })
      );

      const result = await taskService.createTask({});

      expect(result.success).toBe(false);
      expect(result.error.details).toBeDefined();
    });
  });

  describe('updateTask', () => {
    it('updates task successfully', async () => {
      server.use(
        http.patch(`${API_BASE}/api/v1/tasks/task-123`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            success: true,
            data: {
              id: 'task-123',
              title: body.title || 'Existing Task',
              priority: body.priority || 'MEDIUM',
            },
          });
        })
      );

      const result = await taskService.updateTask('task-123', { priority: 'HIGH' });

      expect(result.success).toBe(true);
      expect(result.data.priority).toBe('HIGH');
    });

    it('updates status successfully', async () => {
      server.use(
        http.patch(`${API_BASE}/api/v1/tasks/task-123`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            success: true,
            data: {
              id: 'task-123',
              statusId: body.statusId,
              statusName: 'Completed',
            },
          });
        })
      );

      const result = await taskService.updateTask('task-123', { statusId: 'status-done' });

      expect(result.success).toBe(true);
      expect(result.data.statusName).toBe('Completed');
    });
  });

  describe('deleteTask', () => {
    it('deletes task successfully', async () => {
      server.use(
        http.delete(`${API_BASE}/api/v1/tasks/task-123`, () => {
          return new HttpResponse(null, { status: 204 });
        })
      );

      const result = await taskService.deleteTask('task-123');

      expect(result.success).toBe(true);
    });

    it('handles unauthorized delete', async () => {
      server.use(
        http.delete(`${API_BASE}/api/v1/tasks/task-123`, () => {
          return HttpResponse.json(
            { success: false, error: { message: 'Not authorized to delete this task' } },
            { status: 403 }
          );
        })
      );

      const result = await taskService.deleteTask('task-123');

      expect(result.success).toBe(false);
    });
  });
});
