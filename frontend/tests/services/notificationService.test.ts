/**
 * Notification Service Integration Tests
 * Per SDLC Phase 7 Task 7.11
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { server } from '../setup';
import { http, HttpResponse } from 'msw';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const notificationService = {
  getNotifications: async (params?: { page?: number; isRead?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.isRead !== undefined) searchParams.set('isRead', params.isRead.toString());

    const response = await fetch(`${API_BASE}/api/v1/notifications?${searchParams}`);
    const data = await response.json();
    return data;
  },
  getUnreadCount: async () => {
    const response = await fetch(`${API_BASE}/api/v1/notifications/unread-count`);
    const data = await response.json();
    return data;
  },
  markAsRead: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/v1/notifications/${id}/read`, {
      method: 'PATCH',
    });
    const data = await response.json();
    return data;
  },
  markAllAsRead: async () => {
    const response = await fetch(`${API_BASE}/api/v1/notifications/read-all`, {
      method: 'PATCH',
    });
    const data = await response.json();
    return data;
  },
};

describe('Notification Service', () => {
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

  describe('getNotifications', () => {
    it('fetches notifications successfully', async () => {
      server.use(
        http.get(`${API_BASE}/api/v1/notifications`, () => {
          return HttpResponse.json({
            success: true,
            data: {
              items: [
                { id: '1', title: 'Leave Approved', message: 'Your leave request has been approved', isRead: false },
                { id: '2', title: 'Task Assigned', message: 'You have been assigned a new task', isRead: true },
              ],
              page: 1,
              pageSize: 10,
              totalItems: 2,
              totalPages: 1,
            },
          });
        })
      );

      const result = await notificationService.getNotifications();

      expect(result.success).toBe(true);
      expect(result.data.items).toHaveLength(2);
    });
  });

  describe('getUnreadCount', () => {
    it('fetches unread count successfully', async () => {
      server.use(
        http.get(`${API_BASE}/api/v1/notifications/unread-count`, () => {
          return HttpResponse.json({
            success: true,
            data: { unreadCount: 5 },
          });
        })
      );

      const result = await notificationService.getUnreadCount();

      expect(result.success).toBe(true);
      expect(result.data.unreadCount).toBe(5);
    });
  });

  describe('markAsRead', () => {
    it('marks notification as read successfully', async () => {
      server.use(
        http.patch(`${API_BASE}/api/v1/notifications/notif-123/read`, () => {
          return HttpResponse.json({
            success: true,
            data: { id: 'notif-123', isRead: true },
          });
        })
      );

      const result = await notificationService.markAsRead('notif-123');

      expect(result.success).toBe(true);
      expect(result.data.isRead).toBe(true);
    });
  });

  describe('markAllAsRead', () => {
    it('marks all notifications as read successfully', async () => {
      server.use(
        http.patch(`${API_BASE}/api/v1/notifications/read-all`, () => {
          return HttpResponse.json({
            success: true,
            data: { markedCount: 5 },
          });
        })
      );

      const result = await notificationService.markAllAsRead();

      expect(result.success).toBe(true);
      expect(result.data.markedCount).toBe(5);
    });
  });
});
