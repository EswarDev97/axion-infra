/**
 * MindFlow - Notification Service Types
 * Per API_CONTRACT.md Section 8.9 (Notification Module)
 */

// ============================================================================
// Notification
// ============================================================================

export type NotificationType =
  | 'task_assigned'
  | 'task_completed'
  | 'task_due_soon'
  | 'task_overdue'
  | 'leave_request'
  | 'leave_approved'
  | 'leave_rejected'
  | 'expense_submitted'
  | 'expense_approved'
  | 'expense_rejected'
  | 'training_assigned'
  | 'training_reminder'
  | 'training_completed'
  | 'complaint_submitted'
  | 'complaint_assigned'
  | 'complaint_updated'
  | 'complaint_resolved'
  | 'approval_pending'
  | 'approval_completed'
  | 'approval_delegated'
  | 'announcement'
  | 'system_alert';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationMetadata {
  entityType?: string | null;
  entityId?: string | null;
  actionUrl?: string | null;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: NotificationMetadata | null;
  priority: NotificationPriority;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationCreateRequest {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  priority?: NotificationPriority;
}

export interface BroadcastRequest {
  userIds: string[];
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  priority?: NotificationPriority;
}

export interface NotificationFilters {
  type?: NotificationType;
  isRead?: boolean;
  priority?: NotificationPriority;
}

export interface NotificationListResponse {
  items: Notification[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface NotificationCountResponse {
  unreadCount: number;
}

// ============================================================================
// Notification Preference
// ============================================================================

export interface NotificationPreference {
  notificationType: NotificationType;
  displayName: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
}

export interface PreferenceUpdateRequest {
  notificationType?: NotificationType;
  inAppEnabled?: boolean;
  emailEnabled?: boolean;
  pushEnabled?: boolean;
}

export interface BulkPreferenceUpdateRequest {
  preferences: PreferenceUpdateRequest[];
}

export interface PreferenceListResponse {
  items: NotificationPreference[];
}
