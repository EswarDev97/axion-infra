/**
 * MindFlow - Task Detail Component
 * Per FRONTEND_ARCHITECTURE.md Section 3
 * Enhanced with Start/Complete workflow and time tracking
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  Tag,
  User,
  MessageSquare,
  Paperclip,
  Link2,
  Edit,
  Trash2,
  Plus,
  Play,
  CheckCircle,
  Building2,
  Timer,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { useTaskStore } from '@/stores/taskStore';
import { useAuthStore } from '@/stores/authStore';
import type { Task, TaskPriority, TaskComment } from '@/services/task/types';

interface TaskDetailProps {
  task: Task;
  onEdit?: () => void;
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
  return new Date(dateStr).toLocaleString();
}

export function TaskDetail({ task, onEdit }: TaskDetailProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const {
    statuses,
    taskComments,
    taskAttachments,
    taskDependencies,
    fetchStatuses,
    fetchComments,
    fetchAttachments,
    fetchDependencies,
    deleteTask,
    updateTaskStatus,
    startTask,
    completeTask,
    addComment,
    deleteComment,
  } = useTaskStore();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const isManager = hasPermission('task:create:all');
  const isAssignee = task.assignees?.some((a) => a.userId === user?.id);
  const isNotStarted = task.statusCode === 'NOT_STARTED' || task.statusName === 'Not Started';
  const isInProgress = task.statusCode === 'IN_PROGRESS' || task.statusName === 'In Progress';
  const isCompleted = task.statusCode === 'COMPLETED' || task.statusName === 'Completed';

  useEffect(() => {
    fetchStatuses();
    fetchComments(task.id);
    fetchAttachments(task.id);
    fetchDependencies(task.id);
  }, [task.id, fetchStatuses, fetchComments, fetchAttachments, fetchDependencies]);

  const handleDelete = async () => {
    setDeleting(true);
    const success = await deleteTask(task.id);
    if (success) {
      router.push('/dashboard/tasks');
    }
    setDeleting(false);
    setShowDeleteDialog(false);
  };

  const handleStatusChange = async (statusId: string) => {
    await updateTaskStatus(task.id, statusId);
  };

  const handleStartTask = async () => {
    setActionLoading(true);
    await startTask(task.id);
    setActionLoading(false);
  };

  const handleCompleteTask = async () => {
    setActionLoading(true);
    await completeTask(task.id);
    setActionLoading(false);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSubmittingComment(true);
    await addComment(task.id, newComment);
    setNewComment('');
    setSubmittingComment(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    await deleteComment(task.id, commentId);
  };

  const InfoRow = ({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) => (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-5 w-5 text-gray-400 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm text-gray-500">{label}</p>
        <div className="text-sm font-medium text-gray-900">{children}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: `${task.statusColor}20`,
                  color: task.statusColor,
                }}
              >
                {task.statusName}
              </span>
              <Badge variant={priorityColors[task.priority]}>{task.priority}</Badge>
              {task.departmentName && (
                <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                  <Building2 className="h-4 w-4" />
                  {task.departmentName}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{task.title}</h1>
            {task.description && (
              <p className="text-gray-600">{task.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            {/* Task Action Buttons - Start/Complete for assignees */}
            {isAssignee && isNotStarted && !task.startedAt && (
              <Button onClick={handleStartTask} loading={actionLoading}>
                <Play className="h-4 w-4 mr-2" />
                Start Task
              </Button>
            )}
            {isAssignee && isInProgress && !task.completedAt && (
              <Button onClick={handleCompleteTask} loading={actionLoading}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Task
              </Button>
            )}
            {isManager && (
              <>
                <Button variant="outline" onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button variant="danger" onClick={() => setShowDeleteDialog(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex items-center gap-2 mt-4">
            <Tag className="h-4 w-4 text-gray-400" />
            {task.tags.map((tag) => (
              <span
                key={tag}
                className="text-sm bg-gray-100 text-gray-600 px-2 py-1 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Time Tracking Card */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Time Tracking
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-600 mb-1">Started</p>
                <p className="text-sm font-medium text-blue-900">
                  {formatDateTime(task.startedAt)}
                </p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-green-600 mb-1">Completed</p>
                <p className="text-sm font-medium text-green-900">
                  {formatDateTime(task.completedAt)}
                </p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-xs text-purple-600 mb-1">Time Taken</p>
                <p className="text-sm font-medium text-purple-900">
                  {formatTimeTaken(task.timeTakenMinutes)}
                </p>
              </div>
            </div>
          </div>

          {/* Status Change - Manager only */}
          {isManager && (
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Change Status</h2>
              <div className="flex flex-wrap gap-2">
                {statuses.map((status) => (
                  <button
                    key={status.id}
                    onClick={() => handleStatusChange(status.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                      task.statusId === status.id
                        ? 'ring-2 ring-offset-2'
                        : 'hover:opacity-80'
                    }`}
                    style={{
                      backgroundColor: `${status.color}20`,
                      color: status.color,
                      ...(task.statusId === status.id && { ringColor: status.color }),
                    }}
                  >
                    {status.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Comments ({taskComments.length})
            </h2>

            {/* Comment Form */}
            <div className="mb-4">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                rows={2}
              />
              <div className="flex justify-end mt-2">
                <Button
                  size="sm"
                  onClick={handleAddComment}
                  loading={submittingComment}
                  disabled={!newComment.trim()}
                >
                  Add Comment
                </Button>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-4">
              {taskComments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar
                    src={comment.userAvatar}
                    alt={comment.authorName || comment.userName || ''}
                    fallback={(comment.authorName || comment.userName)?.[0] || '?'}
                    size="sm"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {comment.authorName || comment.userName}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{comment.content}</p>
                  </div>
                </div>
              ))}
              {taskComments.length === 0 && (
                <p className="text-center text-gray-500 text-sm py-4">
                  No comments yet
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Details</h2>
            <div className="divide-y">
              <InfoRow icon={User} label="Created By">
                {task.createdByName}
              </InfoRow>
              {task.departmentName && (
                <InfoRow icon={Building2} label="Department">
                  {task.departmentName}
                </InfoRow>
              )}
              <InfoRow icon={Calendar} label="Due Date">
                {task.dueDate ? (
                  <span className={new Date(task.dueDate) < new Date() ? 'text-red-600' : ''}>
                    {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                ) : '-'}
              </InfoRow>
              <InfoRow icon={Clock} label="Estimated Hours">
                {task.estimatedHours ? `${task.estimatedHours} hrs` : '-'}
              </InfoRow>
              <InfoRow icon={Clock} label="Actual Hours">
                {task.actualHours ? `${task.actualHours} hrs` : '-'}
              </InfoRow>
            </div>
          </div>

          {/* Assignees */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Assigned Employee</h2>
            </div>
            <div className="space-y-2">
              {task.assignees.map((assignee) => (
                <div key={assignee.id} className="flex items-center gap-2">
                  <Avatar
                    src={assignee.userAvatar}
                    alt={assignee.userName || ''}
                    fallback={assignee.userName?.[0] || '?'}
                    size="sm"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{assignee.userName}</p>
                    <p className="text-xs text-gray-500">{assignee.userEmail}</p>
                  </div>
                </div>
              ))}
              {task.assignees.length === 0 && (
                <p className="text-sm text-gray-500">No employee assigned</p>
              )}
            </div>
          </div>

          {/* Attachments */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                Attachments ({taskAttachments.length})
              </h2>
              {isManager && (
                <Button variant="ghost" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {taskAttachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <Paperclip className="h-4 w-4 text-gray-400" />
                  <span className="text-sm truncate flex-1">{attachment.fileName}</span>
                  <span className="text-xs text-gray-500">
                    {(attachment.fileSize / 1024).toFixed(1)} KB
                  </span>
                </div>
              ))}
              {taskAttachments.length === 0 && (
                <p className="text-sm text-gray-500">No attachments</p>
              )}
            </div>
          </div>

          {/* Dependencies */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Dependencies ({taskDependencies.length})
              </h2>
              {isManager && (
                <Button variant="ghost" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {taskDependencies.map((dep) => (
                <div key={dep.id} className="flex items-center gap-2 text-sm">
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                    {dep.dependencyType.replace('_', ' ')}
                  </span>
                  <span className="truncate">{dep.dependsOnTaskTitle}</span>
                </div>
              ))}
              {taskDependencies.length === 0 && (
                <p className="text-sm text-gray-500">No dependencies</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Task"
        description={`Are you sure you want to delete "${task.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
