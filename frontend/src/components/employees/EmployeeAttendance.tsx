/**
 * MindFlow - Employee Attendance Component
 * Shows attendance history for a specific employee (used in employee detail tab)
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { DataTable, type Column } from '@/components/data/DataTable';
import { Badge } from '@/components/ui/Badge';
import { attendanceService, type AttendanceRecord } from '@/services/hr';
import type { PaginationMeta } from '@/services/api/types';

interface EmployeeAttendanceProps {
  employeeId: string;
}

const statusColors: Record<string, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  PRESENT: 'success',
  ABSENT: 'error',
  LATE: 'warning',
  HALF_DAY: 'info',
  ON_LEAVE: 'neutral',
  HOLIDAY: 'neutral',
  WORK_FROM_HOME: 'info',
};

export function EmployeeAttendance({ employeeId }: EmployeeAttendanceProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const response = await attendanceService.list({
        page: currentPage,
        pageSize: 20,
        employeeId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setRecords(response.items);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    } finally {
      setLoading(false);
    }
  }, [employeeId, currentPage, startDate, endDate]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const formatTime = (dateString?: string | null): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatHours = (hours?: number | null): string => {
    if (hours === null || hours === undefined) return '-';
    return `${Number(hours).toFixed(1)} hrs`;
  };

  // Calculate summary stats from current page
  const presentDays = records.filter((r) => r.status === 'PRESENT').length;
  const lateDays = records.filter((r) => r.status === 'LATE').length;
  const absentDays = records.filter((r) => r.status === 'ABSENT').length;
  const halfDays = records.filter((r) => r.status === 'HALF_DAY').length;

  const columns: Column<AttendanceRecord>[] = [
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (value) => new Date(value as string).toLocaleDateString(),
    },
    {
      key: 'checkIn',
      header: 'Check In',
      render: (value) => formatTime(value as string | null),
    },
    {
      key: 'checkOut',
      header: 'Check Out',
      render: (value) => formatTime(value as string | null),
    },
    {
      key: 'workHours',
      header: 'Work Hours',
      render: (value) => formatHours(value as number | null),
    },
    {
      key: 'status',
      header: 'Status',
      render: (value) => (
        <Badge variant={statusColors[value as string] || 'neutral'}>
          {(value as string).replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'notes',
      header: 'Notes',
      render: (value) => (
        <span className="text-sm text-gray-500 truncate max-w-[150px] block">
          {(value as string) || '-'}
        </span>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-4">Attendance History</h2>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{presentDays}</p>
            <p className="text-sm text-green-600">Present</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-yellow-700">{lateDays}</p>
            <p className="text-sm text-yellow-600">Late</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-700">{absentDays}</p>
            <p className="text-sm text-red-600">Absent</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-700">{halfDays}</p>
            <p className="text-sm text-blue-600">Half Day</p>
          </div>
        </div>

        {/* Date Filters */}
        <div className="flex gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
              className="border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
              className="border rounded-lg px-3 py-2 text-sm"
              min={startDate}
            />
          </div>
        </div>
      </div>

      <DataTable<AttendanceRecord>
        columns={columns}
        data={records}
        keyField="id"
        loading={loading}
        pagination={pagination || undefined}
        onPageChange={setCurrentPage}
        emptyMessage="No attendance records found"
      />
    </div>
  );
}
