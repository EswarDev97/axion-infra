/**
 * MindFlow - Employee List Component
 * Full implementation with Actions column
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, type Column } from '@/components/data/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/feedback/Alert';
import { Modal, ModalFooter } from '@/components/feedback/Modal';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { FormField } from '@/components/form/FormField';
import { employeeService, type Employee, type EmployeeFilters } from '@/services/hr';
import { useAuthStore } from '@/stores/authStore';
import type { PaginationMeta } from '@/services/api/types';

interface EmployeeListProps {
  searchParams: {
    search?: string;
    department?: string;
    status?: string;
    type?: string;
    page?: string;
  };
}

const statusColors: Record<string, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  ACTIVE: 'success',
  PROBATION: 'warning',
  ON_LEAVE: 'info',
  TERMINATED: 'error',
  RESIGNED: 'error',
  RETIRED: 'neutral',
  INACTIVE: 'error',
};

export function EmployeeList({ searchParams }: EmployeeListProps) {
  const router = useRouter();
  const { hasRole } = useAuthStore();
  const isSuperAdmin = hasRole('SUPER_ADMIN');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Alerts
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Status toggle
  const [statusConfirm, setStatusConfirm] = useState<Employee | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // Change Password modal
  const [passwordEmployee, setPasswordEmployee] = useState<Employee | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const filters: EmployeeFilters & { page?: number; pageSize?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {};

      if (searchParams.search) filters.search = searchParams.search;
      if (searchParams.department) filters.departmentId = searchParams.department;
      if (searchParams.status) filters.status = searchParams.status;
      if (searchParams.type) filters.employmentType = searchParams.type as Employee['employmentType'];
      if (searchParams.page) filters.page = parseInt(searchParams.page);
      if (sortKey) {
        filters.sortBy = sortKey;
        filters.sortOrder = sortDirection;
      }

      const response = await employeeService.list(filters);
      setEmployees(response.items);
      setPagination(response.pagination);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setLoading(false);
    }
  }, [searchParams, sortKey, sortDirection]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams();
    if (searchParams.search) params.set('search', searchParams.search);
    if (searchParams.department) params.set('department', searchParams.department);
    if (searchParams.status) params.set('status', searchParams.status);
    if (searchParams.type) params.set('type', searchParams.type);
    params.set('page', String(page));
    router.push(`/dashboard/employees?${params.toString()}`);
  };

  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    setSortKey(key);
    setSortDirection(direction);
  };

  const handleRowClick = (employee: Employee) => {
    router.push(`/dashboard/employees/${employee.id}`);
  };

  // Status toggle
  const handleStatusToggle = async () => {
    if (!statusConfirm) return;
    setStatusLoading(true);
    try {
      const newStatus = statusConfirm.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await employeeService.updateStatus(statusConfirm.id, newStatus);
      setSuccess(`Employee "${statusConfirm.firstName} ${statusConfirm.lastName}" status changed to ${newStatus}`);
      setStatusConfirm(null);
      await fetchEmployees();
    } catch (err) {
      setError((err as Error).message || 'Failed to change status');
      setStatusConfirm(null);
    } finally {
      setStatusLoading(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordEmployee) return;

    if (!newPassword) { setError('New Password is required'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (!confirmPassword) { setError('Confirm Password is required'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }

    setPasswordLoading(true);
    try {
      await employeeService.changePassword(passwordEmployee.id, newPassword);
      setSuccess(`Password changed for "${passwordEmployee.firstName} ${passwordEmployee.lastName}"`);
      setPasswordEmployee(null);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError((err as Error).message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  const EyeOffIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

  const columns: Column<Employee>[] = [
    {
      key: 'avatar',
      header: '',
      width: '50px',
      render: (_, row) => (
        <Avatar
          alt={`${row.firstName} ${row.lastName}`}
          fallback={`${row.firstName[0]}${row.lastName[0]}`}
          size="sm"
        />
      ),
    },
    {
      key: 'employeeCode',
      header: 'Code',
      sortable: true,
      render: (value) => (
        <span className="font-mono text-sm">{String(value)}</span>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (_, row) => (
        <span className="font-medium">{row.firstName} {row.lastName}</span>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
    },
    {
      key: 'phone',
      header: 'Mobile',
      render: (value) => (value ? String(value) : <span className="text-gray-400">-</span>),
    },
    {
      key: 'departmentName',
      header: 'Department',
      sortable: true,
      render: (value) => (value ? String(value) : <span className="text-gray-400">-</span>),
    },
    {
      key: 'role',
      header: 'Role',
      render: (value) => (
        value ? (
          <Badge variant="purple" size="sm">
            {String(value).replace(/_/g, ' ')}
          </Badge>
        ) : (
          <span className="text-gray-400">-</span>
        )
      ),
    },
    {
      key: 'salary',
      header: 'Salary',
      sortable: true,
      render: (value) => (
        value != null
          ? <span className="font-mono text-sm">{Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          : <span className="text-gray-400">-</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value) => {
        const status = String(value || 'ACTIVE');
        return (
          <Badge variant={statusColors[status] || 'neutral'}>
            {status.replace(/_/g, ' ')}
          </Badge>
        );
      },
    },
    {
      key: 'dateOfJoining',
      header: 'Created',
      sortable: true,
      render: (value) => value ? new Date(value as string).toLocaleDateString() : '-',
    },
    {
      key: 'id',
      header: 'Actions',
      render: (_value, row) => {
        const emp = row as Employee;
        return (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/dashboard/employees/${emp.id}`)}
            >
              View
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/dashboard/employees/${emp.id}/edit`)}
            >
              Edit
            </Button>
            {isSuperAdmin && (
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                onClick={() => {
                  setPasswordEmployee(emp);
                  setNewPassword('');
                  setConfirmPassword('');
                  setShowNewPassword(false);
                  setShowConfirmPwd(false);
                }}
              >
                Password
              </Button>
            )}
            <button
              type="button"
              title={emp.status === 'ACTIVE' ? 'Inactivate employee' : 'Activate employee'}
              onClick={() => setStatusConfirm(emp)}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500"
              style={{ backgroundColor: emp.status === 'ACTIVE' ? '#22c55e' : '#ef4444' }}
            >
              <span
                className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                style={{ transform: emp.status === 'ACTIVE' ? 'translateX(1.375rem)' : 'translateX(0.25rem)' }}
              />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <DataTable
        columns={columns}
        data={employees}
        keyField="id"
        loading={loading}
        pagination={pagination || undefined}
        onPageChange={handlePageChange}
        onSort={handleSort}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onRowClick={handleRowClick}
        emptyMessage="No employees found"
      />

      {/* Status Toggle Confirmation */}
      <ConfirmDialog
        isOpen={!!statusConfirm}
        onClose={() => setStatusConfirm(null)}
        onConfirm={handleStatusToggle}
        title={statusConfirm?.status === 'ACTIVE' ? 'Inactivate Employee' : 'Activate Employee'}
        description={
          statusConfirm?.status === 'ACTIVE'
            ? `Are you sure you want to inactivate "${statusConfirm?.firstName} ${statusConfirm?.lastName}"? They will no longer be able to login to the portal.`
            : `Are you sure you want to activate "${statusConfirm?.firstName} ${statusConfirm?.lastName}"? They will be able to login to the portal again.`
        }
        confirmLabel={statusConfirm?.status === 'ACTIVE' ? 'Inactivate' : 'Activate'}
        variant={statusConfirm?.status === 'ACTIVE' ? 'danger' : 'info'}
        loading={statusLoading}
      />

      {/* Change Password Modal (Super Admin only) */}
      <Modal
        isOpen={!!passwordEmployee}
        onClose={() => setPasswordEmployee(null)}
        title="Change Password"
        description={`Change password for ${passwordEmployee?.firstName} ${passwordEmployee?.lastName}`}
        size="sm"
      >
        <form onSubmit={handleChangePassword}>
          <div className="space-y-4">
            <FormField label="Employee" >
              <Input
                value={`${passwordEmployee?.firstName} ${passwordEmployee?.lastName} (${passwordEmployee?.employeeCode})`}
                disabled
              />
            </FormField>

            <FormField
              label="New Password"
              required
              error={newPassword && newPassword.length < 6 ? 'Password must be at least 6 characters' : false}
            >
              <Input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                minLength={6}
                error={!!(newPassword && newPassword.length < 6)}
                rightIcon={
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="focus:outline-none" tabIndex={-1}>
                    {showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                }
              />
            </FormField>

            <FormField
              label="Confirm Password"
              required
              error={confirmPassword && newPassword !== confirmPassword ? 'Passwords do not match' : false}
            >
              <Input
                type={showConfirmPwd ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                minLength={6}
                error={!!(confirmPassword && newPassword !== confirmPassword)}
                rightIcon={
                  <button type="button" onClick={() => setShowConfirmPwd(!showConfirmPwd)} className="focus:outline-none" tabIndex={-1}>
                    {showConfirmPwd ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                }
              />
            </FormField>
          </div>

          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setPasswordEmployee(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={passwordLoading}>
              Change Password
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
