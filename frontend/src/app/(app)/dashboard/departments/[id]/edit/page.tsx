/**
 * MindFlow - Edit Department Page
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Alert } from '@/components/feedback/Alert';
import { Button } from '@/components/ui/Button';
import { DepartmentForm } from '@/components/departments/DepartmentForm';
import { departmentService, type Department } from '@/services/hr';

export default function EditDepartmentPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [department, setDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error) {
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
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Edit Department</h1>
          <p className="text-gray-600">
            Update details for {department.name}
          </p>
        </div>
        <a
          href={`/dashboard/departments/${id}`}
          className="text-gray-600 hover:text-gray-900 transition"
        >
          Back to Details
        </a>
      </div>

      {/* Edit Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <DepartmentForm
          department={department}
          onSuccess={() => router.push(`/dashboard/departments/${id}`)}
        />
      </div>
    </div>
  );
}
