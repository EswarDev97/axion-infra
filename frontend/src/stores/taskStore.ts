/**
 * MindFlow - Task Store
 * Per FRONTEND_ARCHITECTURE.md Section 5 & 6
 * Zustand store for task state management
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  Task,
  TaskStatus,
  TaskFilters,
  KanbanColumn,
  MyTasksSummary,
  TaskComment,
  TaskAttachment,
  TaskDependency,
} from '@/services/task/types';
import { taskService, taskStatusService } from '@/services/task/taskService';

interface TaskState {
  // Data
  tasks: Task[];
  currentTask: Task | null;
  statuses: TaskStatus[];
  kanbanColumns: KanbanColumn[];
  myTasksSummary: MyTasksSummary | null;
  taskComments: TaskComment[];
  taskAttachments: TaskAttachment[];
  taskDependencies: TaskDependency[];

  // UI State
  isLoading: boolean;
  isLoadingTask: boolean;
  isLoadingComments: boolean;
  error: string | null;
  filters: TaskFilters;
  viewMode: 'list' | 'kanban' | 'calendar';

  // Pagination
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;

  // Actions - Data Fetching
  fetchTasks: (params?: TaskFilters & { page?: number; pageSize?: number }) => Promise<void>;
  fetchTask: (id: string) => Promise<Task | null>;
  fetchStatuses: () => Promise<void>;
  fetchKanbanView: (projectId?: string) => Promise<void>;
  fetchMyTasksSummary: () => Promise<void>;

  // Actions - Task CRUD
  createTask: (data: Parameters<typeof taskService.create>[0]) => Promise<Task | null>;
  updateTask: (id: string, data: Parameters<typeof taskService.update>[1]) => Promise<Task | null>;
  deleteTask: (id: string) => Promise<boolean>;
  updateTaskStatus: (id: string, statusId: string) => Promise<Task | null>;

  // Actions - Task Workflow
  startTask: (id: string) => Promise<Task | null>;
  completeTask: (id: string) => Promise<Task | null>;

  // Actions - Kanban
  moveTaskInKanban: (taskId: string, statusId: string, position?: number) => Promise<void>;

  // Actions - Comments
  fetchComments: (taskId: string) => Promise<void>;
  addComment: (taskId: string, content: string, parentCommentId?: string) => Promise<TaskComment | null>;
  updateComment: (taskId: string, commentId: string, content: string) => Promise<TaskComment | null>;
  deleteComment: (taskId: string, commentId: string) => Promise<boolean>;

  // Actions - Attachments
  fetchAttachments: (taskId: string) => Promise<void>;
  uploadAttachment: (taskId: string, file: File) => Promise<TaskAttachment | null>;
  deleteAttachment: (taskId: string, attachmentId: string) => Promise<boolean>;

  // Actions - Dependencies
  fetchDependencies: (taskId: string) => Promise<void>;
  addDependency: (taskId: string, data: Parameters<typeof taskService.addDependency>[1]) => Promise<TaskDependency | null>;
  removeDependency: (taskId: string, dependencyId: string) => Promise<boolean>;

  // Actions - Assignees
  assignUsers: (taskId: string, userIds: string[]) => Promise<void>;
  unassignUser: (taskId: string, userId: string) => Promise<void>;

  // Actions - UI State
  setFilters: (filters: TaskFilters) => void;
  clearFilters: () => void;
  setViewMode: (mode: 'list' | 'kanban' | 'calendar') => void;
  setCurrentTask: (task: Task | null) => void;
  clearError: () => void;
}

export const useTaskStore = create<TaskState>()(
  devtools(
    (set, get) => ({
      // Initial Data State
      tasks: [],
      currentTask: null,
      statuses: [],
      kanbanColumns: [],
      myTasksSummary: null,
      taskComments: [],
      taskAttachments: [],
      taskDependencies: [],

      // Initial UI State
      isLoading: false,
      isLoadingTask: false,
      isLoadingComments: false,
      error: null,
      filters: {},
      viewMode: 'list',

      // Initial Pagination
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      pageSize: 20,

      // ========================================================================
      // Data Fetching Actions
      // ========================================================================

      fetchTasks: async (params) => {
        set({ isLoading: true, error: null });
        try {
          const { filters } = get();
          const response = await taskService.list({
            ...filters,
            ...params,
            page: params?.page || 1,
            pageSize: params?.pageSize || 20,
          });
          set({
            tasks: response.items,
            currentPage: response.pagination.page,
            totalPages: response.pagination.totalPages,
            totalItems: response.pagination.totalItems,
            pageSize: response.pagination.pageSize,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: (error as Error).message || 'Failed to fetch tasks',
            isLoading: false,
          });
        }
      },

      fetchTask: async (id) => {
        set({ isLoadingTask: true, error: null });
        try {
          const task = await taskService.getById(id);
          set({ currentTask: task, isLoadingTask: false });
          return task;
        } catch (error) {
          set({
            error: (error as Error).message || 'Failed to fetch task',
            isLoadingTask: false,
          });
          return null;
        }
      },

      fetchStatuses: async () => {
        try {
          const statuses = await taskStatusService.list();
          set({ statuses });
        } catch (error) {
          console.error('Failed to fetch statuses:', error);
        }
      },

      fetchKanbanView: async (projectId) => {
        set({ isLoading: true, error: null });
        try {
          const response = await taskService.getKanbanView({ projectId });
          set({ kanbanColumns: response.columns, isLoading: false });
        } catch (error) {
          set({
            error: (error as Error).message || 'Failed to fetch kanban view',
            isLoading: false,
          });
        }
      },

      fetchMyTasksSummary: async () => {
        try {
          const summary = await taskService.getMyTasksSummary();
          set({ myTasksSummary: summary });
        } catch (error) {
          console.error('Failed to fetch summary:', error);
        }
      },

      // ========================================================================
      // Task CRUD Actions
      // ========================================================================

      createTask: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const task = await taskService.create(data);
          const { tasks, viewMode } = get();
          set({
            tasks: [task, ...tasks],
            isLoading: false,
          });
          // Refresh kanban view if in kanban mode
          if (viewMode === 'kanban') {
            get().fetchKanbanView();
          }
          return task;
        } catch (error) {
          set({
            error: (error as Error).message || 'Failed to create task',
            isLoading: false,
          });
          return null;
        }
      },

      updateTask: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
          const updatedTask = await taskService.update(id, data);
          const { tasks, currentTask, viewMode } = get();

          // Update in task list
          set({
            tasks: tasks.map((t) => (t.id === id ? updatedTask : t)),
            currentTask: currentTask?.id === id ? updatedTask : currentTask,
            isLoading: false,
          });

          // Refresh kanban view if in kanban mode
          if (viewMode === 'kanban') {
            get().fetchKanbanView();
          }

          return updatedTask;
        } catch (error) {
          set({
            error: (error as Error).message || 'Failed to update task',
            isLoading: false,
          });
          return null;
        }
      },

      deleteTask: async (id) => {
        set({ isLoading: true, error: null });
        try {
          await taskService.delete(id);
          const { tasks, currentTask, viewMode } = get();
          set({
            tasks: tasks.filter((t) => t.id !== id),
            currentTask: currentTask?.id === id ? null : currentTask,
            isLoading: false,
          });
          // Refresh kanban view if in kanban mode
          if (viewMode === 'kanban') {
            get().fetchKanbanView();
          }
          return true;
        } catch (error) {
          set({
            error: (error as Error).message || 'Failed to delete task',
            isLoading: false,
          });
          return false;
        }
      },

      updateTaskStatus: async (id, statusId) => {
        try {
          const updatedTask = await taskService.updateStatus(id, statusId);
          const { tasks, currentTask, viewMode } = get();

          set({
            tasks: tasks.map((t) => (t.id === id ? updatedTask : t)),
            currentTask: currentTask?.id === id ? updatedTask : currentTask,
          });

          // Refresh kanban view if in kanban mode
          if (viewMode === 'kanban') {
            get().fetchKanbanView();
          }

          return updatedTask;
        } catch (error) {
          set({ error: (error as Error).message || 'Failed to update status' });
          return null;
        }
      },

      // ========================================================================
      // Task Workflow Actions
      // ========================================================================

      startTask: async (id) => {
        try {
          const updatedTask = await taskService.startTask(id);
          const { tasks, currentTask } = get();
          set({
            tasks: tasks.map((t) => (t.id === id ? updatedTask : t)),
            currentTask: currentTask?.id === id ? updatedTask : currentTask,
          });
          return updatedTask;
        } catch (error) {
          set({ error: (error as Error).message || 'Failed to start task' });
          return null;
        }
      },

      completeTask: async (id) => {
        try {
          const updatedTask = await taskService.completeTask(id);
          const { tasks, currentTask, viewMode } = get();
          set({
            tasks: tasks.map((t) => (t.id === id ? updatedTask : t)),
            currentTask: currentTask?.id === id ? updatedTask : currentTask,
          });
          if (viewMode === 'kanban') {
            get().fetchKanbanView();
          }
          return updatedTask;
        } catch (error) {
          set({ error: (error as Error).message || 'Failed to complete task' });
          return null;
        }
      },

      // ========================================================================
      // Kanban Actions
      // ========================================================================

      moveTaskInKanban: async (taskId, statusId, position) => {
        // Optimistic update
        const { kanbanColumns } = get();
        const updatedColumns = kanbanColumns.map((col) => ({
          ...col,
          tasks: col.tasks.filter((t) => t.id !== taskId),
        }));

        // Find task to move
        let taskToMove: Task | undefined;
        for (const col of kanbanColumns) {
          taskToMove = col.tasks.find((t) => t.id === taskId);
          if (taskToMove) break;
        }

        if (taskToMove) {
          const targetColumn = updatedColumns.find((col) => col.statusId === statusId);
          if (targetColumn) {
            const updatedTask = { ...taskToMove, statusId };
            if (position !== undefined) {
              targetColumn.tasks.splice(position, 0, updatedTask);
            } else {
              targetColumn.tasks.push(updatedTask);
            }
          }
        }

        set({ kanbanColumns: updatedColumns });

        // Server sync
        try {
          await taskService.moveTaskInKanban(taskId, statusId, position);
        } catch (error) {
          // Rollback on error
          set({ kanbanColumns, error: 'Failed to move task' });
        }
      },

      // ========================================================================
      // Comment Actions
      // ========================================================================

      fetchComments: async (taskId) => {
        set({ isLoadingComments: true });
        try {
          const comments = await taskService.getComments(taskId);
          set({ taskComments: comments, isLoadingComments: false });
        } catch (error) {
          set({ isLoadingComments: false });
        }
      },

      addComment: async (taskId, content, parentCommentId) => {
        try {
          const comment = await taskService.addComment(taskId, {
            content,
            parentCommentId,
          });
          const { taskComments } = get();
          set({ taskComments: [...taskComments, comment] });
          return comment;
        } catch (error) {
          return null;
        }
      },

      updateComment: async (taskId, commentId, content) => {
        try {
          const comment = await taskService.updateComment(taskId, commentId, { content });
          const { taskComments } = get();
          set({
            taskComments: taskComments.map((c) => (c.id === commentId ? comment : c)),
          });
          return comment;
        } catch (error) {
          return null;
        }
      },

      deleteComment: async (taskId, commentId) => {
        try {
          await taskService.deleteComment(taskId, commentId);
          const { taskComments } = get();
          set({ taskComments: taskComments.filter((c) => c.id !== commentId) });
          return true;
        } catch (error) {
          return false;
        }
      },

      // ========================================================================
      // Attachment Actions
      // ========================================================================

      fetchAttachments: async (taskId) => {
        try {
          const attachments = await taskService.getAttachments(taskId);
          set({ taskAttachments: attachments });
        } catch (error) {
          console.error('Failed to fetch attachments:', error);
        }
      },

      uploadAttachment: async (taskId, file) => {
        try {
          const attachment = await taskService.uploadAttachment(taskId, file);
          const { taskAttachments } = get();
          set({ taskAttachments: [...taskAttachments, attachment] });
          return attachment;
        } catch (error) {
          return null;
        }
      },

      deleteAttachment: async (taskId, attachmentId) => {
        try {
          await taskService.deleteAttachment(taskId, attachmentId);
          const { taskAttachments } = get();
          set({ taskAttachments: taskAttachments.filter((a) => a.id !== attachmentId) });
          return true;
        } catch (error) {
          return false;
        }
      },

      // ========================================================================
      // Dependency Actions
      // ========================================================================

      fetchDependencies: async (taskId) => {
        try {
          const dependencies = await taskService.getDependencies(taskId);
          set({ taskDependencies: dependencies });
        } catch (error) {
          console.error('Failed to fetch dependencies:', error);
        }
      },

      addDependency: async (taskId, data) => {
        try {
          const dependency = await taskService.addDependency(taskId, data);
          const { taskDependencies } = get();
          set({ taskDependencies: [...taskDependencies, dependency] });
          return dependency;
        } catch (error) {
          return null;
        }
      },

      removeDependency: async (taskId, dependencyId) => {
        try {
          await taskService.removeDependency(taskId, dependencyId);
          const { taskDependencies } = get();
          set({ taskDependencies: taskDependencies.filter((d) => d.id !== dependencyId) });
          return true;
        } catch (error) {
          return false;
        }
      },

      // ========================================================================
      // Assignee Actions
      // ========================================================================

      assignUsers: async (taskId, userIds) => {
        try {
          await taskService.assignUsers(taskId, { userIds });
          // Refresh task to get updated assignees
          get().fetchTask(taskId);
        } catch (error) {
          set({ error: 'Failed to assign users' });
        }
      },

      unassignUser: async (taskId, userId) => {
        try {
          await taskService.unassignUser(taskId, userId);
          // Refresh task to get updated assignees
          get().fetchTask(taskId);
        } catch (error) {
          set({ error: 'Failed to unassign user' });
        }
      },

      // ========================================================================
      // UI State Actions
      // ========================================================================

      setFilters: (filters) => {
        set({ filters: { ...get().filters, ...filters } });
      },

      clearFilters: () => {
        set({ filters: {} });
      },

      setViewMode: (viewMode) => {
        set({ viewMode });
        // Fetch data based on view mode
        if (viewMode === 'kanban') {
          get().fetchKanbanView();
        } else if (viewMode === 'list') {
          get().fetchTasks();
        }
      },

      setCurrentTask: (task) => {
        set({ currentTask: task });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    { name: 'taskStore' }
  )
);

// Selector hooks for common use cases
export const useTasks = () => useTaskStore((state) => state.tasks);
export const useCurrentTask = () => useTaskStore((state) => state.currentTask);
export const useTaskStatuses = () => useTaskStore((state) => state.statuses);
export const useKanbanColumns = () => useTaskStore((state) => state.kanbanColumns);
export const useTaskLoading = () => useTaskStore((state) => state.isLoading);
export const useTaskError = () => useTaskStore((state) => state.error);
export const useTaskViewMode = () => useTaskStore((state) => state.viewMode);
