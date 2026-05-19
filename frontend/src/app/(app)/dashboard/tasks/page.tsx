/**
 * MindFlow - Tasks Page
 * Per FRONTEND_ARCHITECTURE.md Section 4
 */

import { Metadata } from 'next';
import { TasksPageClient } from './TasksPageClient';

export const metadata: Metadata = {
  title: 'Tasks - AxionPCS HRMS',
};

export default function TasksPage() {
  return <TasksPageClient />;
}
