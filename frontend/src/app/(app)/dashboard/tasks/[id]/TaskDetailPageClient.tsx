/**
 * MindFlow - Task Detail Page Client Component
 * Per FRONTEND_ARCHITECTURE.md Section 4
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TaskDetail } from '@/components/tasks/TaskDetail';
import { TaskForm } from '@/components/tasks/TaskForm';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useTaskStore } from '@/stores/taskStore';

interface TaskDetailPageClientProps {
  taskId: string;
}

export function TaskDetailPageClient({ taskId }: TaskDetailPageClientProps) {
  const router = useRouter();
  const { currentTask, isLoadingTask, error, fetchTask, clearError } = useTaskStore();
  const [showEditForm, setShowEditForm] = useState(false);

  useEffect(() => {
    fetchTask(taskId);
    return () => clearError();
  }, [taskId, fetchTask, clearError]);

  if (isLoadingTask) {
    return <LoadingState message="Loading task..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load task"
        message={error}
        onRetry={() => fetchTask(taskId)}
      />
    );
  }

  if (!currentTask) {
    return (
      <ErrorState
        title="Task not found"
        message="The task you're looking for doesn't exist or has been deleted."
        onRetry={() => router.push('/dashboard/tasks')}
        retryLabel="Back to Tasks"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push('/dashboard/tasks')}
        className="mb-2"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Tasks
      </Button>

      {/* Task Detail */}
      <TaskDetail task={currentTask} onEdit={() => setShowEditForm(true)} />

      {/* Edit Form Modal */}
      <TaskForm
        isOpen={showEditForm}
        onClose={() => setShowEditForm(false)}
        task={currentTask}
        onSuccess={() => {
          setShowEditForm(false);
          fetchTask(taskId);
        }}
      />
    </div>
  );
}
