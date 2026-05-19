/**
 * MindFlow - Task Service
 * Per API_CONTRACT.md Section 8.3 (Task Module)
 */

import { get, post, put, patch, del } from '@/services/api/client';
import { getList } from '@/services/api/helpers';
import type { PaginatedResponse, PaginationParams } from '@/services/api/types';
import type {
  TaskStatus,
  TaskStatusCreateRequest,
  TaskStatusUpdateRequest,
  Task,
  TaskCreateRequest,
  TaskUpdateRequest,
  TaskFilters,
  TaskAssignee,
  TaskAssignRequest,
  TaskComment,
  TaskCommentCreateRequest,
  TaskCommentUpdateRequest,
  TaskAttachment,
  TaskDependency,
  TaskDependencyCreateRequest,
  KanbanViewResponse,
  CalendarViewResponse,
  MyTasksSummary,
} from './types';

const TASK_BASE = '/tasks';

// ============================================================================
// Task Status Service
// ============================================================================

export const taskStatusService = {
  async list(): Promise<TaskStatus[]> {
    return getList<TaskStatus>(`${TASK_BASE}/statuses`);
  },

  async getById(id: string): Promise<TaskStatus> {
    return get<TaskStatus>(`${TASK_BASE}/statuses/${id}`);
  },

  async create(data: TaskStatusCreateRequest): Promise<TaskStatus> {
    return post<TaskStatus>(`${TASK_BASE}/statuses`, data);
  },

  async update(id: string, data: TaskStatusUpdateRequest): Promise<TaskStatus> {
    return put<TaskStatus>(`${TASK_BASE}/statuses/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return del<void>(`${TASK_BASE}/statuses/${id}`);
  },

  async initialize(): Promise<TaskStatus[]> {
    return post<TaskStatus[]>(`${TASK_BASE}/statuses/initialize`, {});
  },

  async reorder(statusIds: string[]): Promise<TaskStatus[]> {
    return post<TaskStatus[]>(`${TASK_BASE}/statuses/reorder`, { statusIds });
  },
};

// ============================================================================
// Task Service
// ============================================================================

export const taskService = {
  async list(params?: PaginationParams & TaskFilters): Promise<PaginatedResponse<Task>> {
    return get<PaginatedResponse<Task>>(TASK_BASE, params);
  },

  async getById(id: string): Promise<Task> {
    return get<Task>(`${TASK_BASE}/${id}`);
  },

  async create(data: TaskCreateRequest): Promise<Task> {
    return post<Task>(TASK_BASE, data);
  },

  async update(id: string, data: TaskUpdateRequest): Promise<Task> {
    return put<Task>(`${TASK_BASE}/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return del<void>(`${TASK_BASE}/${id}`);
  },

  async updateStatus(id: string, statusId: string): Promise<Task> {
    return patch<Task>(`${TASK_BASE}/${id}/status`, { statusId });
  },

  async startTask(id: string): Promise<Task> {
    return post<Task>(`${TASK_BASE}/${id}/start`, {});
  },

  async completeTask(id: string): Promise<Task> {
    return post<Task>(`${TASK_BASE}/${id}/complete`, {});
  },

  async getSubtasks(parentTaskId: string): Promise<Task[]> {
    return get<Task[]>(`${TASK_BASE}/${parentTaskId}/subtasks`);
  },

  async search(query: string, params?: PaginationParams): Promise<PaginatedResponse<Task>> {
    return get<PaginatedResponse<Task>>(`${TASK_BASE}/search`, { query, ...params });
  },

  // ============================================================================
  // Task Views
  // ============================================================================

  async getKanbanView(params?: { projectId?: string }): Promise<KanbanViewResponse> {
    return get<KanbanViewResponse>(`${TASK_BASE}/views/kanban`, params);
  },

  async getCalendarView(params: {
    startDate: string;
    endDate: string;
    projectId?: string;
  }): Promise<CalendarViewResponse> {
    return get<CalendarViewResponse>(`${TASK_BASE}/views/calendar`, params);
  },

  async moveTaskInKanban(taskId: string, statusId: string, position?: number): Promise<Task> {
    return patch<Task>(`${TASK_BASE}/${taskId}/kanban-move`, { statusId, position });
  },

  // ============================================================================
  // My Tasks
  // ============================================================================

  async getMyTasks(params?: PaginationParams & { status?: string }): Promise<PaginatedResponse<Task>> {
    return get<PaginatedResponse<Task>>(`${TASK_BASE}/me`, params);
  },

  async getMyTasksSummary(): Promise<MyTasksSummary> {
    return get<MyTasksSummary>(`${TASK_BASE}/me/summary`);
  },

  async getCreatedByMe(params?: PaginationParams): Promise<PaginatedResponse<Task>> {
    return get<PaginatedResponse<Task>>(`${TASK_BASE}/me/created`, params);
  },

  // ============================================================================
  // Task Assignees
  // ============================================================================

  async getAssignees(taskId: string): Promise<TaskAssignee[]> {
    return get<TaskAssignee[]>(`${TASK_BASE}/${taskId}/assignees`);
  },

  async assignUsers(taskId: string, data: TaskAssignRequest): Promise<TaskAssignee[]> {
    return post<TaskAssignee[]>(`${TASK_BASE}/${taskId}/assignees`, data);
  },

  async unassignUser(taskId: string, userId: string): Promise<void> {
    return del<void>(`${TASK_BASE}/${taskId}/assignees/${userId}`);
  },

  async reassignTask(taskId: string, fromUserId: string, toUserId: string): Promise<TaskAssignee> {
    return post<TaskAssignee>(`${TASK_BASE}/${taskId}/reassign`, {
      fromUserId,
      toUserId,
    });
  },

  // ============================================================================
  // Task Comments
  // ============================================================================

  async getComments(taskId: string): Promise<TaskComment[]> {
    return getList<TaskComment>(`${TASK_BASE}/${taskId}/comments`);
  },

  async addComment(taskId: string, data: TaskCommentCreateRequest): Promise<TaskComment> {
    return post<TaskComment>(`${TASK_BASE}/${taskId}/comments`, data);
  },

  async updateComment(taskId: string, commentId: string, data: TaskCommentUpdateRequest): Promise<TaskComment> {
    return put<TaskComment>(`${TASK_BASE}/${taskId}/comments/${commentId}`, data);
  },

  async deleteComment(taskId: string, commentId: string): Promise<void> {
    return del<void>(`${TASK_BASE}/${taskId}/comments/${commentId}`);
  },

  // ============================================================================
  // Task Attachments
  // ============================================================================

  async getAttachments(taskId: string): Promise<TaskAttachment[]> {
    return get<TaskAttachment[]>(`${TASK_BASE}/${taskId}/attachments`);
  },

  async uploadAttachment(taskId: string, file: File): Promise<TaskAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    return post<TaskAttachment>(`${TASK_BASE}/${taskId}/attachments`, formData);
  },

  async deleteAttachment(taskId: string, attachmentId: string): Promise<void> {
    return del<void>(`${TASK_BASE}/${taskId}/attachments/${attachmentId}`);
  },

  // ============================================================================
  // Task Dependencies
  // ============================================================================

  async getDependencies(taskId: string): Promise<TaskDependency[]> {
    return get<TaskDependency[]>(`${TASK_BASE}/${taskId}/dependencies`);
  },

  async addDependency(taskId: string, data: TaskDependencyCreateRequest): Promise<TaskDependency> {
    return post<TaskDependency>(`${TASK_BASE}/${taskId}/dependencies`, data);
  },

  async removeDependency(taskId: string, dependencyId: string): Promise<void> {
    return del<void>(`${TASK_BASE}/${taskId}/dependencies/${dependencyId}`);
  },

  async getDependencyGraph(taskId: string): Promise<{
    task: Task;
    blockedBy: Task[];
    blocks: Task[];
    relatedTo: Task[];
  }> {
    return get(`${TASK_BASE}/${taskId}/dependency-graph`);
  },
};

// ============================================================================
// Combined Task Module Export
// ============================================================================

export const taskModule = {
  statuses: taskStatusService,
  tasks: taskService,
};

export default taskService;
