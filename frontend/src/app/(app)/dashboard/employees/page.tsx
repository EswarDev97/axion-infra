import { Metadata } from 'next';
import { Suspense } from 'react';
import { EmployeeList } from '@/components/employees/EmployeeList';
import { EmployeeFilters } from '@/components/employees/EmployeeFilters';
import { TableSkeleton } from '@/components/ui/TableSkeleton';

export const metadata: Metadata = {
  title: 'Employees - Wings Associates HRMS',
};

interface EmployeesPageProps {
  searchParams: {
    search?: string;
    department?: string;
    status?: string;
    type?: string;
    page?: string;
  };
}

export default function EmployeesPage({ searchParams }: EmployeesPageProps) {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-gray-600">Manage your organization&apos;s employees</p>
        </div>
        <a
          href="/dashboard/employees/new"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
        >
          Add Employee
        </a>
      </div>

      {/* Filters */}
      <EmployeeFilters />

      {/* Employee List */}
      <Suspense fallback={<TableSkeleton rows={10} />}>
        <EmployeeList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
