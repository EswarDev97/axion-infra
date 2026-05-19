/**
 * MindFlow - Department List Component
 * Per FRONTEND_ARCHITECTURE.md Section 3
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, type Column } from '@/components/data/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/feedback/Alert';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { departmentService, type Department } from '@/services/hr';
import type { PaginationMeta } from '@/services/api/types';

interface DepartmentListProps {
  searchParams: {
    search?: string;
    page?: string;
  };
}

export function DepartmentList({ searchParams }: DepartmentListProps) {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Department | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {};

      if (searchParams.search) params.search = searchParams.search;
      if (searchParams.page) params.page = parseInt(searchParams.page);
      if (sortKey) {
        params.sortBy = sortKey;
        params.sortOrder = sortDirection;
      }

      const response = await departmentService.list(params);
      setDepartments(response.items);
      setPagination(response.pagination);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    } finally {
      setLoading(false);
    }
  }, [searchParams, sortKey, sortDirection]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams();
    if (searchParams.search) params.set('search', searchParams.search);
    params.set('page', String(page));
    router.push(`/dashboard/departments?${params.toString()}`);
  };

  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    setSortKey(key);
    setSortDirection(direction);
  };

  const handleRowClick = (department: Department) => {
    router.push(`/dashboard/departments/${department.id}`);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      await departmentService.delete(deleteConfirm.id);
      setSuccess(`Department "${deleteConfirm.name}" deleted successfully`);
      setDeleteConfirm(null);
      await fetchDepartments();
    } catch (err) {
      setError((err as Error).message || 'Failed to delete department');
      setDeleteConfirm(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns: Column<Department>[] = [
    {
      key: 'code',
      header: 'Code',
      sortable: true,
      render: (value) => (
        <span className="font-mono text-sm font-medium">{String(value)}</span>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (value) => (
        <span className="font-medium">{String(value)}</span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (value) => (
        value ? (
          <span className="text-gray-600 truncate max-w-xs block">{String(value)}</span>
        ) : (
          <span className="text-gray-400">-</span>
        )
      ),
    },
    {
      key: 'managerName',
      header: 'Department Manager',
      render: (value) => (
        value ? (
          <span className="text-gray-600">{String(value)}</span>
        ) : (
          <span className="text-gray-400">Not assigned</span>
        )
      ),
    },
    {
      key: 'employeeCount',
      header: 'Employees',
      sortable: true,
      render: (value) => (
        <span className="text-center">{String(value ?? 0)}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      sortable: true,
      render: (value) => (
        <Badge variant={value ? 'success' : 'neutral'}>
          {value ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'id',
      header: 'Actions',
      render: (_value, row) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              router.push(`/dashboard/departments/${(row as Department).id}/edit`)
            }
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => setDeleteConfirm(row as Department)}
          >
            Delete
          </Button>
        </div>
      ),
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
        data={departments}
        keyField="id"
        loading={loading}
        pagination={pagination || undefined}
        onPageChange={handlePageChange}
        onSort={handleSort}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onRowClick={handleRowClick}
        emptyMessage="No departments found"
      />

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Department"
        description={`Are you sure you want to delete "${deleteConfirm?.name}"? This cannot be undone. Departments with employees or sub-departments cannot be deleted.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
