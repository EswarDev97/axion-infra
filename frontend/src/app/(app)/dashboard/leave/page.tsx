/**
 * MindFlow - Leave Management Page
 * Per FRONTEND_ARCHITECTURE.md Section 4
 */

import { Metadata } from 'next';
import { LeavePageClient } from './LeavePageClient';

export const metadata: Metadata = {
  title: 'Leave Management - AxionPCS HRMS',
};

interface LeavePageProps {
  searchParams: {
    view?: 'my' | 'pending' | 'all';
    status?: string;
    type?: string;
  };
}

export default function LeavePage({ searchParams }: LeavePageProps) {
  return <LeavePageClient view={searchParams.view || 'my'} />;
}
