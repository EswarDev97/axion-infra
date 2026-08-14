/**
 * MindFlow - Task Detail Page
 * Per FRONTEND_ARCHITECTURE.md Section 4
 */

import { Metadata } from 'next';
import { TaskDetailPageClient } from './TaskDetailPageClient';

export const metadata: Metadata = {
  title: 'Task Details - Wings Associates HRMS',
};

interface TaskDetailPageProps {
  params: { id: string };
}

export default function TaskDetailPage({ params }: TaskDetailPageProps) {
  return <TaskDetailPageClient taskId={params.id} />;
}
