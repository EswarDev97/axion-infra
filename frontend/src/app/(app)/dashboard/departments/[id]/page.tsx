/**
 * MindFlow - Department Detail Page
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/feedback/Alert';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { departmentService, type Department } from '@/services/hr';

export default function DepartmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [department, setDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const fetchDepartment = async () => {
      try {
        const data = await departmentService.getById(id);
        setDepartment(data);
      } catch (err) {
        setError((err as Error).message || 'Failed to load department');
      } finally {
        setLoading(false);
      }
    };
    fetchDepartment();
  }, [id]);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await departmentService.delete(id);
      router.push('/dashboard/departments');
    } catch (err) {
      setError((err as Error).message || 'Failed to delete department');
      setShowDelete(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error && !department) {
    return (
      <div className="space-y-4">
        <Alert variant="error">{error}</Alert>
        <Button variant="outline" onClick={() => router.push('/dashboard/departments')}>
          Back to Departments
        </Button>
      </div>
    );
  }

  if (!department) return null;

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{department.name}</h1>
            <Badge variant="neutral">{department.code}</Badge>
            <Badge variant={department.isActive ? 'success' : 'error'}>
              {department.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="text-gray-600 mt-1">
            {department.description || 'No description'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/departments')}
          >
            Back
          </Button>
          <Button
            onClick={() =>
              router.push(`/dashboard/departments/${department.id}/edit`)
            }
          >
            Edit
          </Button>
          <Button
            variant="danger"
            onClick={() => setShowDelete(true)}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Department Details */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Department Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <dt className="text-sm font-medium text-gray-500">Department Code</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono">{department.code}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Department Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{department.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1">
                <Badge variant={department.isActive ? 'success' : 'error'} size="sm">
                  {department.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Department Manager</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {department.managerName || 'Not assigned'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Employee Count</dt>
              <dd className="mt-1 text-sm text-gray-900">{department.employeeCount}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(department.createdAt).toLocaleDateString()}
              </dd>
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <dt className="text-sm font-medium text-gray-500">Description</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {department.description || 'No description provided'}
              </dd>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Department"
        description={`Are you sure you want to delete "${department.name}"? This cannot be undone. Departments with employees or sub-departments cannot be deleted.`}
        confirmLabel="Delete Department"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
