/**
 * MindFlow - Department Form Component
 * Per FRONTEND_ARCHITECTURE.md Section 3
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/feedback/Alert';
import { FormField } from '@/components/form/FormField';
import {
  departmentService,
  employeeService,
  type Department,
  type DepartmentCreateRequest,
  type DepartmentUpdateRequest,
  type Employee,
} from '@/services/hr';

interface DepartmentFormProps {
  department?: Department | null;
  onSuccess?: (department: Department) => void;
}

export function DepartmentForm({ department, onSuccess }: DepartmentFormProps) {
  const router = useRouter();
  const isEditing = !!department;

  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: department?.name || '',
    code: department?.code || '',
    description: department?.description || '',
    parentId: department?.parentId || '',
    managerId: department?.managerId || '',
    isActive: department?.isActive ?? true,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deptResponse, empResponse] = await Promise.all([
          departmentService.list({ pageSize: 100 }),
          employeeService.list({ pageSize: 100, status: 'ACTIVE' }),
        ]);
        // Filter out current department from parent options
        setDepartments(deptResponse.items.filter((d) => d.id !== department?.id));
        setEmployees(empResponse.items);
      } catch (err) {
        console.error('Failed to load form data:', err);
      }
    };
    fetchData();
  }, [department?.id]);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let result: Department;

      if (isEditing) {
        const updateData: DepartmentUpdateRequest = {
          name: formData.name,
          description: formData.description || null,
          parentId: formData.parentId || null,
          managerId: formData.managerId || null,
          isActive: formData.isActive,
        };
        result = await departmentService.update(department.id, updateData);
      } else {
        const createData: DepartmentCreateRequest = {
          name: formData.name,
          code: formData.code,
          description: formData.description || undefined,
          parentId: formData.parentId || undefined,
          managerId: formData.managerId || undefined,
        };
        result = await departmentService.create(createData);
      }

      if (onSuccess) {
        onSuccess(result);
      } else {
        router.push('/dashboard/departments');
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to save department');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Department Name" required>
          <Input
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="e.g., Engineering"
          />
        </FormField>

        <FormField label="Department Code" required>
          <Input
            value={formData.code}
            onChange={(e) => handleChange('code', e.target.value)}
            placeholder="e.g., ENG"
            disabled={isEditing}
          />
        </FormField>

        <div className="md:col-span-2">
          <FormField label="Description">
            <Textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Brief description of the department"
              rows={3}
            />
          </FormField>
        </div>

        <FormField label="Parent Department">
          <Select
            value={formData.parentId}
            onChange={(e) => handleChange('parentId', e.target.value)}
          >
            <option value="">No Parent (Top Level)</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Department Manager">
          <Select
            value={formData.managerId}
            onChange={(e) => handleChange('managerId', e.target.value)}
          >
            <option value="">Select Department Manager</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Status">
          <Select
            value={formData.isActive ? 'true' : 'false'}
            onChange={(e) => handleChange('isActive', e.target.value === 'true')}
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
        </FormField>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {isEditing ? 'Update Department' : 'Create Department'}
        </Button>
      </div>
    </form>
  );
}
