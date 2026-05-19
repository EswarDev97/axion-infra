/**
 * MindFlow - Notification Service
 * Per API_CONTRACT.md Section 8.9 (Notification Module)
 */

import { get, post, put, del } from '@/services/api/client';
import type { PaginationParams } from '@/services/api/types';
import type {
  Notification,
  NotificationCreateRequest,
  BroadcastRequest,
  NotificationFilters,
  NotificationListResponse,
  NotificationCountResponse,
  NotificationPreference,
  PreferenceUpdateRequest,
  BulkPreferenceUpdateRequest,
  PreferenceListResponse,
} from './types';

const NOTIFICATION_BASE = '/notifications';

// ============================================================================
// Notification Service
// ============================================================================

export const notificationService = {
  async list(params?: PaginationParams & NotificationFilters): Promise<NotificationListResponse> {
    return get<NotificationListResponse>(NOTIFICATION_BASE, params);
  },

  async getById(id: string): Promise<Notification> {
    return get<Notification>(`${NOTIFICATION_BASE}/${id}`);
  },

  async getUnreadCount(): Promise<NotificationCountResponse> {
    return get<NotificationCountResponse>(`${NOTIFICATION_BASE}/count`);
  },

  async markAsRead(id: string): Promise<Notification> {
    return post<Notification>(`${NOTIFICATION_BASE}/${id}/read`, {});
  },

  async markAllAsRead(): Promise<{ markedCount: number }> {
    return post<{ markedCount: number }>(`${NOTIFICATION_BASE}/read-all`, {});
  },

  async delete(id: string): Promise<void> {
    return del<void>(`${NOTIFICATION_BASE}/${id}`);
  },

  // ============================================================================
  // Admin/Internal - Send Notifications
  // ============================================================================

  async send(data: NotificationCreateRequest): Promise<Notification> {
    return post<Notification>(NOTIFICATION_BASE, data);
  },

  async broadcast(data: BroadcastRequest): Promise<Notification[]> {
    return post<Notification[]>(`${NOTIFICATION_BASE}/broadcast`, data);
  },
};

// ============================================================================
// Notification Preference Service
// ============================================================================

export const preferenceService = {
  async list(): Promise<PreferenceListResponse> {
    return get<PreferenceListResponse>(`${NOTIFICATION_BASE}/preferences`);
  },

  async update(notificationType: string, data: PreferenceUpdateRequest): Promise<NotificationPreference> {
    return put<NotificationPreference>(`${NOTIFICATION_BASE}/preferences/${notificationType}`, data);
  },

  async bulkUpdate(data: BulkPreferenceUpdateRequest): Promise<PreferenceListResponse> {
    return put<PreferenceListResponse>(`${NOTIFICATION_BASE}/preferences`, data);
  },

  async disableAllEmails(): Promise<{ message: string }> {
    return post<{ message: string }>(`${NOTIFICATION_BASE}/preferences/disable-all-emails`, {});
  },

  async enableAllInApp(): Promise<{ message: string }> {
    return post<{ message: string }>(`${NOTIFICATION_BASE}/preferences/enable-all-in-app`, {});
  },
};

// ============================================================================
// Combined Notification Module Export
// ============================================================================

export const notificationModule = {
  notifications: notificationService,
  preferences: preferenceService,
};

export default notificationService;
