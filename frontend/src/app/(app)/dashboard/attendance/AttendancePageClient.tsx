/**
 * MindFlow - Attendance Page Client Component
 * Enhanced with role-based tabs: My | Team (Manager) | All (HR/Admin)
 * Includes monthly summary, team today status, CSV export
 */

'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AttendanceCheckInOut } from '@/components/attendance/AttendanceCheckInOut';
import { AttendanceList } from '@/components/attendance/AttendanceList';
import { AttendanceMonthlySummary } from '@/components/attendance/AttendanceMonthlySummary';
import { TeamTodayStatusPanel } from '@/components/attendance/TeamTodayStatus';
import { useAuthStore } from '@/stores/authStore';

interface AttendancePageClientProps {
  view: 'my' | 'team' | 'all';
}

export function AttendancePageClient({ view }: AttendancePageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission, hasRole, hasAnyRole } = useAuthStore();

  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });

  // Determine which tabs the user can see based on role
  const tabs = useMemo(() => {
    const result: { id: string; label: string }[] = [
      { id: 'my', label: 'My Attendance' },
    ];

    // Managers see Team tab
    if (hasAnyRole(['MANAGER']) || hasPermission('hr:read:subordinates')) {
      result.push({ id: 'team', label: 'Team Attendance' });
    }

    // HR Admin / Super Admin see All tab
    if (hasAnyRole(['SUPER_ADMIN', 'HR_ADMIN']) || hasPermission('hr:read:all')) {
      result.push({ id: 'all', label: 'All Attendance' });
    }

    return result;
  }, [hasPermission, hasRole, hasAnyRole]);

  // If view is not in available tabs, default to 'my'
  const activeView = tabs.some((t) => t.id === view) ? view : 'my';

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', tabId);
    // Reset filters when switching tabs
    setDateRange({ startDate: '', endDate: '' });
    router.push(`/dashboard/attendance?${params.toString()}`);
  };

  // Determine which mode the AttendanceList should use
  const listMode: 'my' | 'team' | 'all' = activeView as 'my' | 'team' | 'all';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-gray-600">Track and manage attendance records</p>
        </div>
      </div>

      {/* Check In/Out Card (only on my attendance view) */}
      {activeView === 'my' && <AttendanceCheckInOut />}

      {/* Monthly Summary (only on my attendance view) */}
      {activeView === 'my' && <AttendanceMonthlySummary />}

      {/* Team Today Status (only on team view) */}
      {activeView === 'team' && <TeamTodayStatusPanel />}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                activeView === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm"
              min={dateRange.startDate}
            />
          </div>
        </div>
      </div>

      {/* Attendance List */}
      <div className="bg-white rounded-lg border">
        <AttendanceList
          mode={listMode}
          startDate={dateRange.startDate || undefined}
          endDate={dateRange.endDate || undefined}
        />
      </div>
    </div>
  );
}
