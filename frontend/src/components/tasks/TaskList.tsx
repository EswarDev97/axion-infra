/**
 * MindFlow - Task List Component
 * Per FRONTEND_ARCHITECTURE.md Section 3
 * Enhanced with department, assigned employee, and time tracking columns
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, type Column } from '@/components/data/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { useTaskStore } from '@/stores/taskStore';
import type { Task, TaskFilters, TaskPriority } from '@/services/task/types';

interface TaskListProps {
  filters?: TaskFilters;
  onTaskClick?: (task: Task) => void;
}

const priorityColors: Record<TaskPriority, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'warning',
  URGENT: 'error',
};

function formatTimeTaken(minutes: number | null | undefined): string {
  if (!minutes) return '-';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TaskList({ filters, onTaskClick }: TaskListProps) {
  const router = useRouter();
  const {
    tasks,
    isLoading,
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    fetchTasks,
  } = useTaskStore();

  const filtersRef = useRef<string>('');

  useEffect(() => {
    const filtersKey = JSON.stringify(filters || {});
    if (filtersRef.current !== filtersKey) {
      filtersRef.current = filtersKey;
      fetchTasks({ ...filters, page: 1 });
    }
  }, [filters, fetchTasks]);

  const handlePageChange = useCallback((page: number) => {
    fetchTasks({ page });
  }, [fetchTasks]);

  const handleRowClick = useCallback((task: Task) => {
    if (onTaskClick) {
      onTaskClick(task);
    } else {
      router.push(`/dashboard/tasks/${task.id}`);
    }
  }, [router, onTaskClick]);

  const columns: Column<Task>[] = [
    {
      key: 'title',
      header: 'Task',
      sortable: true,
      render: (_, row) => (
        <div className="max-w-md">
          <p className="font-medium text-gray-900 truncate">{row.title}</p>
          {row.taskNumber && (
            <p className="text-xs text-gray-400 font-mono">{row.taskNumber}</p>
          )}
          {row.description && (
            <p className="text-sm text-gray-500 truncate">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'statusName',
      header: 'Status',
      sortable: true,
      render: (_, row) => (
        <span
          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
          style={{
            backgroundColor: `${row.statusColor}20`,
            color: row.statusColor,
          }}
        >
          {row.statusName}
        </span>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      render: (value) => (
        <Badge variant={priorityColors[value as TaskPriority]}>
          {value as string}
        </Badge>
      ),
    },
    {
      key: 'departmentName',
      header: 'Department',
      render: (value) => (
        <span className="text-sm text-gray-600">{(value as string) || '-'}</span>
      ),
    },
    {
      key: 'assignees',
      header: 'Assigned To',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          {row.assignees.length > 0 ? (
            <>
              <Avatar
                src={row.assignees[0].userAvatar}
                alt={row.assignees[0].userName || ''}
                fallback={row.assignees[0].userName?.[0] || '?'}
                size="sm"
                className="border-2 border-white"
              />
              <span className="text-sm text-gray-700 truncate max-w-[120px]">
                {row.assignees[0].userName}
              </span>
            </>
          ) : (
            <span className="text-sm text-gray-400">Unassigned</span>
          )}
        </div>
      ),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      sortable: true,
      render: (value) => {
        if (!value) return <span className="text-gray-400">-</span>;
        const date = new Date(value as string);
        const isOverdue = date < new Date() && date.toDateString() !== new Date().toDateString();
        return (
          <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
            {date.toLocaleDateString()}
          </span>
        );
      },
    },
    {
      key: 'startedAt',
      header: 'Start Time',
      render: (value) => (
        <span className="text-sm text-gray-600">{formatDateTime(value as string)}</span>
      ),
    },
    {
      key: 'completedAt',
      header: 'End Time',
      render: (value) => (
        <span className="text-sm text-gray-600">{formatDateTime(value as string)}</span>
      ),
    },
    {
      key: 'timeTakenMinutes',
      header: 'Time Taken',
      render: (value) => (
        <span className="text-sm font-medium text-gray-700">
          {formatTimeTaken(value as number)}
        </span>
      ),
    },
  ];

  const pagination = {
    page: currentPage,
    pageSize,
    totalItems,
    totalPages,
    hasNext: currentPage < totalPages,
    hasPrevious: currentPage > 1,
  };

  return (
    <DataTable
      columns={columns}
      data={tasks}
      keyField="id"
      loading={isLoading}
      pagination={pagination}
      onPageChange={handlePageChange}
      onRowClick={handleRowClick}
      emptyMessage="No tasks found"
    />
  );
}
