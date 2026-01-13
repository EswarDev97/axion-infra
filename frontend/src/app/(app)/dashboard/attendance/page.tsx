import { Metadata } from 'next';
import { Suspense } from 'react';
import { AttendanceCalendar } from '@/components/attendance/AttendanceCalendar';
import { AttendanceCheckInOut } from '@/components/attendance/AttendanceCheckInOut';
import { AttendanceFilters } from '@/components/attendance/AttendanceFilters';
import { AttendanceTable } from '@/components/attendance/AttendanceTable';
import { TableSkeleton } from '@/components/ui/TableSkeleton';

export const metadata: Metadata = {
  title: 'Attendance - AxionPCS HRMS',
};

interface AttendancePageProps {
  searchParams: {
    view?: 'my' | 'team' | 'all';
    month?: string;
    year?: string;
    department?: string;
  };
}

export default function AttendancePage({ searchParams }: AttendancePageProps) {
  const view = searchParams.view || 'my';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-gray-600">Track and manage attendance records</p>
        </div>
      </div>

      {/* Check In/Out Card (for employees) */}
      {view === 'my' && <AttendanceCheckInOut />}

      {/* View Toggle & Filters */}
      <AttendanceFilters currentView={view} />

      {/* Calendar View */}
      <AttendanceCalendar searchParams={searchParams} />

      {/* Table View */}
      <Suspense fallback={<TableSkeleton rows={10} />}>
        <AttendanceTable searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
