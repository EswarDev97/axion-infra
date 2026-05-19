/**
 * MindFlow - Tasks Page Client Component
 * Per FRONTEND_ARCHITECTURE.md Section 4
 * Enhanced with role-based visibility (manager vs employee)
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { List, LayoutGrid, Calendar, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskKanban } from '@/components/tasks/TaskKanban';
import { TaskForm } from '@/components/tasks/TaskForm';
import { useTaskStore } from '@/stores/taskStore';
import { useAuthStore } from '@/stores/authStore';
import type { Task, TaskFilters, TaskPriority } from '@/services/task/types';

type ViewMode = 'list' | 'kanban' | 'calendar';

export function TasksPageClient() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { viewMode, setViewMode, filters, setFilters, fetchStatuses } = useTaskStore();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [defaultStatusId, setDefaultStatusId] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isManager = isMounted ? hasPermission('task:create:all') : true;

  // For employee view, automatically filter to only their assigned tasks
  useEffect(() => {
    if (isMounted && !isManager && user?.id) {
      setFilters({ assigneeId: user.id });
    }
  }, [isMounted, isManager, user?.id, setFilters]);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  const handleTaskClick = useCallback((task: Task) => {
    router.push(`/dashboard/tasks/${task.id}`);
  }, [router]);

  const handleCreateTask = useCallback((statusId?: string) => {
    setDefaultStatusId(statusId);
    setShowTaskForm(true);
  }, []);

  const handleTaskCreated = useCallback((task: Task) => {
    setShowTaskForm(false);
    router.push(`/dashboard/tasks/${task.id}`);
  }, [router]);

  const handleSearch = () => {
    setFilters({ search: searchQuery || undefined });
  };

  const handlePriorityFilter = (priority: string) => {
    setFilters({ priority: priority as TaskPriority || undefined });
  };

  // Build effective filters - for employees, always include their assigneeId
  const effectiveFilters: TaskFilters = {
    ...filters,
    ...(!isManager && user?.id ? { assigneeId: user.id } : {}),
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-gray-600">
            {isManager
              ? 'Manage and track your tasks'
              : 'View and work on your assigned tasks'}
          </p>
        </div>
        {isManager && (
          <Button onClick={() => handleCreateTask()}>
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        )}
      </div>

      {/* Filters & View Toggle */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full lg:w-auto">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Select
              value={filters.priority || ''}
              onChange={(e) => handlePriorityFilter(e.target.value)}
              className="w-full sm:w-40"
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </Select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => handleViewModeChange('list')}
              className={`p-2 rounded ${
                viewMode === 'list' ? 'bg-white shadow text-primary-600' : 'text-gray-600 hover:text-gray-900'
              }`}
              title="List View"
            >
              <List className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleViewModeChange('kanban')}
              className={`p-2 rounded ${
                viewMode === 'kanban' ? 'bg-white shadow text-primary-600' : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Kanban View"
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleViewModeChange('calendar')}
              className={`p-2 rounded ${
                viewMode === 'calendar' ? 'bg-white shadow text-primary-600' : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Calendar View"
            >
              <Calendar className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Task Views */}
      {viewMode === 'list' && (
        <TaskList filters={effectiveFilters} onTaskClick={handleTaskClick} />
      )}
      {viewMode === 'kanban' && (
        <TaskKanban onTaskClick={handleTaskClick} onCreateTask={isManager ? handleCreateTask : undefined} />
      )}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
          Calendar view coming soon
        </div>
      )}

      {/* Task Form Modal - Manager only */}
      {isManager && (
        <TaskForm
          isOpen={showTaskForm}
          onClose={() => setShowTaskForm(false)}
          defaultStatusId={defaultStatusId}
          onSuccess={handleTaskCreated}
        />
      )}
    </div>
  );
}
