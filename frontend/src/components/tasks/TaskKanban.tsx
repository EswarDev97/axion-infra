/**
 * MindFlow - Task Kanban Board Component
 * Per FRONTEND_ARCHITECTURE.md Section 3
 */

'use client';

import { useEffect, useCallback, useState } from 'react';
import { MoreHorizontal, Plus } from 'lucide-react';
import { useTaskStore } from '@/stores/taskStore';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import type { Task, TaskPriority } from '@/services/task/types';

interface TaskKanbanProps {
  projectId?: string;
  onTaskClick?: (task: Task) => void;
  onCreateTask?: (statusId: string) => void;
}

const priorityColors: Record<TaskPriority, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'warning',
  URGENT: 'error',
};

export function TaskKanban({ projectId, onTaskClick, onCreateTask }: TaskKanbanProps) {
  const { kanbanColumns, isLoading, fetchKanbanView, moveTaskInKanban } = useTaskStore();
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  useEffect(() => {
    fetchKanbanView(projectId);
  }, [fetchKanbanView, projectId]);

  const handleDragStart = useCallback((e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(statusId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (draggedTask && draggedTask.statusId !== statusId) {
      moveTaskInKanban(draggedTask.id, statusId);
    }
    setDraggedTask(null);
  }, [draggedTask, moveTaskInKanban]);

  const handleDragEnd = useCallback(() => {
    setDraggedTask(null);
    setDragOverColumn(null);
  }, []);

  if (isLoading && kanbanColumns.length === 0) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-shrink-0 w-80 bg-gray-100 rounded-lg p-4 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/2 mb-4" />
            <div className="space-y-3">
              <div className="h-24 bg-gray-200 rounded" />
              <div className="h-24 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[600px]">
      {kanbanColumns.map((column) => (
        <div
          key={column.statusId}
          className={`flex-shrink-0 w-80 bg-gray-50 rounded-lg ${
            dragOverColumn === column.statusId ? 'ring-2 ring-primary-500 bg-primary-50' : ''
          }`}
          onDragOver={(e) => handleDragOver(e, column.statusId)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, column.statusId)}
        >
          {/* Column Header */}
          <div
            className="p-3 border-b border-gray-200 sticky top-0 bg-gray-50 rounded-t-lg"
            style={{ borderLeftColor: column.statusColor, borderLeftWidth: '4px' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{column.statusName}</span>
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                  {column.tasks.length}
                </span>
              </div>
              {onCreateTask && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onCreateTask(column.statusId)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Tasks */}
          <div className="p-2 space-y-2 min-h-[100px]">
            {column.tasks.map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => handleDragStart(e, task)}
                onDragEnd={handleDragEnd}
                onClick={() => onTaskClick?.(task)}
                className={`bg-white rounded-lg border shadow-sm p-3 cursor-pointer hover:shadow-md transition-shadow ${
                  draggedTask?.id === task.id ? 'opacity-50' : ''
                }`}
              >
                {/* Task Title */}
                <h4 className="font-medium text-gray-900 text-sm mb-2 line-clamp-2">
                  {task.title}
                </h4>

                {/* Tags */}
                {task.tags && task.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {task.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {task.tags.length > 2 && (
                      <span className="text-xs text-gray-400">+{task.tags.length - 2}</span>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={priorityColors[task.priority]} className="text-xs">
                      {task.priority}
                    </Badge>
                    {task.dueDate && (
                      <span
                        className={`text-xs ${
                          new Date(task.dueDate) < new Date() ? 'text-red-600' : 'text-gray-500'
                        }`}
                      >
                        {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Assignees */}
                  <div className="flex -space-x-1">
                    {task.assignees.slice(0, 2).map((assignee) => (
                      <Avatar
                        key={assignee.id}
                        src={assignee.userAvatar}
                        alt={assignee.userName || ''}
                        fallback={assignee.userName?.[0] || '?'}
                        size="sm"
                        className="border border-white h-6 w-6"
                      />
                    ))}
                    {task.assignees.length > 2 && (
                      <div className="h-6 w-6 rounded-full bg-gray-100 border border-white flex items-center justify-center text-xs text-gray-600">
                        +{task.assignees.length - 2}
                      </div>
                    )}
                  </div>
                </div>

                {/* Subtask Progress */}
                {task.subtaskCount > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{
                          width: `${(task.completedSubtaskCount / task.subtaskCount) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">
                      {task.completedSubtaskCount}/{task.subtaskCount}
                    </span>
                  </div>
                )}
              </div>
            ))}

            {column.tasks.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                No tasks in this column
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
