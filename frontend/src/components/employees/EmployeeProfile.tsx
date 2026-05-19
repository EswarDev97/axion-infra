/**
 * MindFlow - Employee Profile Component
 * Full profile details view
 */
'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { employeeService, type Employee } from '@/services/hr';

interface EmployeeProfileProps {
  employeeId: string;
}

const statusColors: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  ACTIVE: 'success',
  PROBATION: 'warning',
  ON_LEAVE: 'info',
  TERMINATED: 'error',
  RESIGNED: 'error',
  RETIRED: 'neutral',
  INACTIVE: 'error',
};

export function EmployeeProfile({ employeeId }: EmployeeProfileProps) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await employeeService.getById(employeeId);
        setEmployee(data);
      } catch (err) {
        console.error('Failed to load employee:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [employeeId]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <p className="text-gray-500">Employee not found</p>
      </div>
    );
  }

  const details = [
    { label: 'Employee Code', value: employee.employeeCode },
    { label: 'First Name', value: employee.firstName },
    { label: 'Last Name', value: employee.lastName },
    { label: 'Email', value: employee.email },
    { label: 'Phone', value: employee.phone || 'Not provided' },
    { label: 'Position', value: employee.positionTitle },
    { label: 'Department', value: employee.departmentName || 'Not assigned' },
    { label: 'Role', value: employee.role ? employee.role.replace(/_/g, ' ') : 'Not assigned' },
    { label: 'Reports To', value: employee.managerName || 'Not assigned' },
    { label: 'Date of Joining', value: employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString() : '-' },
    { label: 'Date of Exit', value: employee.dateOfExit ? new Date(employee.dateOfExit).toLocaleDateString() : '-' },
    {
      label: 'Status',
      value: (
        <Badge variant={statusColors[employee.status] || 'neutral'}>
          {employee.status.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    { label: 'Employment Type', value: employee.employmentType.replace(/_/g, ' ') },
    { label: 'Salary', value: employee.salary != null ? Number(employee.salary).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'Not set' },
    { label: 'Created', value: employee.createdAt ? new Date(employee.createdAt).toLocaleDateString() : '-' },
    { label: 'Last Updated', value: employee.updatedAt ? new Date(employee.updatedAt).toLocaleDateString() : '-' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-4">Employee Profile</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-5 gap-x-8">
          {details.map((item) => (
            <div key={item.label}>
              <dt className="text-sm font-medium text-gray-500">{item.label}</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {typeof item.value === 'string' ? item.value : item.value}
              </dd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
