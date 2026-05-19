/**
 * MindFlow - Attendance List Component
 * Enhanced with mode-based fetching (my/team/all), filters, CSV export, and correction
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { Download, Edit2 } from 'lucide-react';
import { DataTable, type Column } from '@/components/data/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import {
  attendanceService,
  departmentService,
  employeeService,
  type AttendanceRecord,
  type Department,
  type Employee,
} from '@/services/hr';
import { AttendanceCorrectionModal } from './AttendanceCorrectionModal';
import { useAuthStore } from '@/stores/authStore';
import type { PaginationMeta } from '@/services/api/types';

interface AttendanceListProps {
  mode?: 'my' | 'team' | 'all';
  employeeId?: string;
  startDate?: string;
  endDate?: string;
}

const statusColors: Record<string, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  PRESENT: 'success',
  ABSENT: 'error',
  LATE: 'warning',
  HALF_DAY: 'info',
  ON_LEAVE: 'neutral',
  HOLIDAY: 'info',
  WEEKLY_OFF: 'neutral',
  WORK_FROM_HOME: 'info',
};

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'PRESENT', label: 'Present' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'LATE', label: 'Late' },
  { value: 'HALF_DAY', label: 'Half Day' },
  { value: 'ON_LEAVE', label: 'On Leave' },
  { value: 'HOLIDAY', label: 'Holiday' },
  { value: 'WEEKLY_OFF', label: 'Weekly Off' },
];

export function AttendanceList({ mode = 'all', employeeId, startDate, endDate }: AttendanceListProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  // Correction modal state
  const [correctionRecord, setCorrectionRecord] = useState<AttendanceRecord | null>(null);

  // Filters (for team and all modes)
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filterDeptId, setFilterDeptId] = useState('');
  const [filterEmpId, setFilterEmpId] = useState(employeeId || '');
  const [filterStatus, setFilterStatus] = useState('');

  const { hasPermission } = useAuthStore();
  const canCorrect = hasPermission('hr:update:all');
  const canExport = hasPermission('hr:read:all');
  const showFilters = mode === 'team' || mode === 'all';

  // Load filter options
  useEffect(() => {
    if (!showFilters) return;
    const loadFilters = async () => {
      try {
        const [deptRes, empRes] = await Promise.all([
          departmentService.list({ pageSize: 100 }),
          employeeService.list({ pageSize: 200, status: 'ACTIVE' }),
        ]);
        setDepartments(deptRes.items);
        setEmployees(empRes.items);
      } catch (err) {
        console.error('Failed to load filters:', err);
      }
    };
    loadFilters();
  }, [showFilters]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === 'my') {
        const items = await attendanceService.getMyAttendance({
          startDate,
          endDate,
        });
        setRecords(items);
        setPagination(null);
      } else if (mode === 'team') {
        const response = await attendanceService.listTeam({
          page: currentPage,
          pageSize: 20,
          employeeId: filterEmpId || undefined,
          startDate,
          endDate,
          status: filterStatus || undefined,
        });
        setRecords(response.items);
        setPagination(response.pagination);
      } else {
        const response = await attendanceService.list({
          page: currentPage,
          pageSize: 20,
          employeeId: filterEmpId || undefined,
          departmentId: filterDeptId || undefined,
          startDate,
          endDate,
          status: filterStatus || undefined,
        });
        setRecords(response.items);
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    } finally {
      setLoading(false);
    }
  }, [mode, currentPage, filterEmpId, filterDeptId, filterStatus, startDate, endDate]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterDeptId, filterEmpId, filterStatus, startDate, endDate]);

  const handleExportCsv = async () => {
    if (!startDate || !endDate) {
      alert('Please select a date range to export.');
      return;
    }
    setExporting(true);
    try {
      const blob = await attendanceService.exportCsv({
        startDate,
        endDate,
        departmentId: filterDeptId || undefined,
        employeeId: filterEmpId || undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${startDate}_${endDate}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleCorrected = (updated: AttendanceRecord) => {
    setRecords((prev) =>
      prev.map((r) => (r.id === updated.id ? updated : r))
    );
  };

  const formatTime = (dateString?: string | null): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatHours = (hours?: number | null): string => {
    if (hours === null || hours === undefined) return '-';
    return `${Number(hours).toFixed(1)} hrs`;
  };

  const columns: Column<AttendanceRecord>[] = [
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (value) => new Date(value as string).toLocaleDateString(),
    },
    ...(mode !== 'my'
      ? [
          {
            key: 'employeeName' as keyof AttendanceRecord,
            header: 'Employee',
            render: (value: unknown) => <span className="font-medium">{value as string}</span>,
          },
        ]
      : []),
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
    ...(canCorrect && mode === 'all'
      ? [
          {
            key: 'id' as keyof AttendanceRecord,
            header: '',
            render: (_value: unknown, row: AttendanceRecord) => (
              <button
                onClick={() => setCorrectionRecord(row)}
                className="text-gray-400 hover:text-primary-600 transition-colors"
                title="Edit record"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      {/* Filters row for team/all views */}
      {showFilters && (
        <div className="p-4 border-b flex flex-wrap gap-3 items-center">
          {mode === 'all' && (
            <div className="w-48">
              <Select
                value={filterDeptId}
                onChange={(e) => setFilterDeptId(e.target.value)}
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Select>
            </div>
          )}
          <div className="w-48">
            <Select
              value={filterEmpId}
              onChange={(e) => setFilterEmpId(e.target.value)}
            >
              <option value="">All Employees</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-40">
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              {statusOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </div>
          {canExport && (
            <div className="ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                loading={exporting}
              >
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
            </div>
          )}
        </div>
      )}

      <DataTable<AttendanceRecord>
        columns={columns}
        data={records}
        keyField="id"
        loading={loading}
        pagination={pagination || undefined}
        onPageChange={setCurrentPage}
        emptyMessage="No attendance records found"
      />

      {/* Correction Modal */}
      {correctionRecord && (
        <AttendanceCorrectionModal
          record={correctionRecord}
          isOpen={!!correctionRecord}
          onClose={() => setCorrectionRecord(null)}
          onCorrected={handleCorrected}
        />
      )}
    </div>
  );
}
