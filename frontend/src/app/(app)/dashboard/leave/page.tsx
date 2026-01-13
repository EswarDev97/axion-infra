import { Metadata } from 'next';
import { Suspense } from 'react';
import { LeaveBalanceCards } from '@/components/leave/LeaveBalanceCards';
import { LeaveFilters } from '@/components/leave/LeaveFilters';
import { LeaveList } from '@/components/leave/LeaveList';
import { LeaveCalendar } from '@/components/leave/LeaveCalendar';
import { TableSkeleton } from '@/components/ui/TableSkeleton';

export const metadata: Metadata = {
  title: 'Leave Management - AxionPCS HRMS',
};

interface LeavePageProps {
  searchParams: {
    view?: 'my' | 'approvals' | 'team' | 'all';
    status?: string;
    type?: string;
    year?: string;
    month?: string;
  };
}

export default function LeavePage({ searchParams }: LeavePageProps) {
  const view = searchParams.view || 'my';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Leave Management</h1>
          <p className="text-gray-600">Apply for leave and track your balance</p>
        </div>
        <a
          href="/dashboard/leave/apply"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
        >
          Apply for Leave
        </a>
      </div>

      {/* Leave Balance Cards (for employees) */}
      {view === 'my' && <LeaveBalanceCards />}

      {/* Filters */}
      <LeaveFilters currentView={view} />

      {/* Grid Layout */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Leave List */}
        <div className="lg:col-span-2">
          <Suspense fallback={<TableSkeleton rows={10} />}>
            <LeaveList searchParams={searchParams} />
          </Suspense>
        </div>

        {/* Calendar */}
        <div>
          <LeaveCalendar searchParams={searchParams} />
        </div>
      </div>
    </div>
  );
}
