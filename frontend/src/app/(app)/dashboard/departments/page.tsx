import { Metadata } from 'next';
import { Suspense } from 'react';
import { DepartmentList } from '@/components/departments/DepartmentList';
import { DepartmentTree } from '@/components/departments/DepartmentTree';
import { TableSkeleton } from '@/components/ui/TableSkeleton';

export const metadata: Metadata = {
  title: 'Departments - Wings Associates HRMS',
};

interface DepartmentsPageProps {
  searchParams: {
    view?: 'list' | 'tree';
    search?: string;
  };
}

export default function DepartmentsPage({ searchParams }: DepartmentsPageProps) {
  const view = searchParams.view || 'list';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Departments</h1>
          <p className="text-gray-600">Manage organizational structure</p>
        </div>
        <a
          href="/dashboard/departments/new"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
        >
          Add Department
        </a>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <a
          href="?view=list"
          className={`px-4 py-2 rounded-lg ${
            view === 'list'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          List View
        </a>
        <a
          href="?view=tree"
          className={`px-4 py-2 rounded-lg ${
            view === 'tree'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Tree View
        </a>
      </div>

      {/* Content */}
      <Suspense fallback={<TableSkeleton rows={8} />}>
        {view === 'list' ? (
          <DepartmentList searchParams={searchParams} />
        ) : (
          <DepartmentTree />
        )}
      </Suspense>
    </div>
  );
}
