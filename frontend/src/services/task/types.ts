/**
 * MindFlow - Task Service Types
 * Per API_CONTRACT.md Section 8.3 (Task Module)
 */

// ============================================================================
// Task Status
// ============================================================================

export interface TaskStatus {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  color: string;
  sortOrder: number;
  isDefault: boolean;
  isTerminal: boolean;
  allowedTransitions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskStatusCreateRequest {
  code: string;
  name: string;
  color?: string;
  sortOrder?: number;
  isDefault?: boolean;
  isTerminal?: boolean;
  allowedTransitions?: string[];
}

export interface TaskStatusUpdateRequest {
  name?: string;
  color?: string;
  sortOrder?: number;
  isDefault?: boolean;
  isTerminal?: boolean;
  allowedTransitions?: string[];
}

// ============================================================================
// Task
// ============================================================================

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Task {
  id: string;
  tenantId: string;
  taskNumber?: string | null;
  title: string;
  description?: string | null;
  statusId: string;
  statusCode?: string;
  statusName?: string;
  statusColor?: string;
  priority: TaskPriority;
  departmentId?: string | null;
  departmentName?: string | null;
  projectId?: string | null;
  projectName?: string | null;
  parentTaskId?: string | null;
  parentTaskTitle?: string | null;
  dueDate?: string | null;
  startDate?: string | null;
  completedAt?: string | null;
  startedAt?: string | null;
  timeTakenMinutes?: number | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  createdById: string;
  createdByName?: string;
  tags: string[];
  assignees: TaskAssignee[];
  commentCount: number;
  attachmentCount: number;
  subtaskCount: number;
  completedSubtaskCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskCreateRequest {
  title: string;
  description?: string;
  statusId?: string;
  priority?: TaskPriority;
  departmentId?: string;
  projectId?: string;
  parentTaskId?: string;
  dueDate?: string;
  startDate?: string;
  estimatedHours?: number;
  tags?: string[];
  assigneeIds?: string[];
}

export interface TaskUpdateRequest {
  title?: string;
  description?: string | null;
  statusId?: string;
  priority?: TaskPriority;
  departmentId?: string | null;
  projectId?: string | null;
  parentTaskId?: string | null;
  dueDate?: string | null;
  startDate?: string | null;
  completedAt?: string | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  tags?: string[];
  assigneeIds?: string[];
}

export interface TaskFilters {
  projectId?: string;
  statusId?: string;
  priority?: TaskPriority;
  assigneeId?: string;
  departmentId?: string;
  createdById?: string;
  parentTaskId?: string | null;
  dueDateFrom?: string;
  dueDateTo?: string;
  search?: string;
  tags?: string[];
}

// ============================================================================
// Task Assignee
// ============================================================================

export interface TaskAssignee {
  id: string;
  taskId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userAvatar?: string | null;
  assignedAt: string;
  assignedById?: string;
  assignedByName?: string;
}

export interface TaskAssignRequest {
  userIds: string[];
}

// ============================================================================
// Task Comment
// ============================================================================

export interface TaskComment {
  id: string;
  taskId: string;
  userId?: string;
  userName?: string;
  authorId?: string;
  authorName?: string;
  userAvatar?: string | null;
  content: string;
  parentCommentId?: string | null;
  parentId?: string | null;
  replies?: TaskComment[];
  replyCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskCommentCreateRequest {
  content: string;
  parentCommentId?: string;
}

export interface TaskCommentUpdateRequest {
  content: string;
}

// ============================================================================
// Task Attachment
// ============================================================================

export interface TaskAttachment {
  id: string;
  taskId: string;
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedById: string;
  uploadedByName?: string;
  createdAt: string;
}

// ============================================================================
// Task Dependency
// ============================================================================

export type DependencyType = 'BLOCKS' | 'BLOCKED_BY' | 'RELATED_TO';

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  dependsOnTaskTitle?: string;
  dependencyType: DependencyType;
  createdAt: string;
}

export interface TaskDependencyCreateRequest {
  dependsOnTaskId: string;
  dependencyType: DependencyType;
}

// ============================================================================
// Task Views
// ============================================================================

export interface KanbanColumn {
  statusId: string;
  statusCode: string;
  statusName: string;
  statusColor: string;
  tasks: Task[];
}

export interface KanbanViewResponse {
  columns: KanbanColumn[];
}

export interface CalendarTask {
  id: string;
  title: string;
  startDate?: string | null;
  dueDate?: string | null;
  statusCode?: string;
  statusColor?: string;
  priority: TaskPriority;
  assignees: Array<{ userId: string; userName?: string }>;
}

export interface CalendarViewResponse {
  tasks: CalendarTask[];
  startDate: string;
  endDate: string;
}

// ============================================================================
// My Tasks
// ============================================================================

export interface MyTasksSummary {
  totalAssigned: number;
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
  inProgress: number;
  completed: number;
}
