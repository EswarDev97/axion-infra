import { Metadata } from 'next';
import { Suspense } from 'react';
import { RoleList } from '@/components/roles/RoleList';
import { PermissionMatrix } from '@/components/roles/PermissionMatrix';
import { TableSkeleton } from '@/components/ui/TableSkeleton';

export const metadata: Metadata = {
  title: 'Roles & Permissions - AxionPCS HRMS',
};

interface RolesPageProps {
  searchParams: {
    view?: 'roles' | 'permissions';
  };
}

export default function RolesPage({ searchParams }: RolesPageProps) {
  const view = searchParams.view || 'roles';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Roles & Permissions</h1>
          <p className="text-gray-600">Manage access control for your organization</p>
        </div>
        <a
          href="/dashboard/roles/new"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
        >
          Create Role
        </a>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <a
          href="?view=roles"
          className={`px-4 py-2 rounded-lg ${
            view === 'roles'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Roles
        </a>
        <a
          href="?view=permissions"
          className={`px-4 py-2 rounded-lg ${
            view === 'permissions'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Permission Matrix
        </a>
      </div>

      {/* Content */}
      <Suspense fallback={<TableSkeleton rows={8} />}>
        {view === 'roles' ? <RoleList /> : <PermissionMatrix />}
      </Suspense>
    </div>
  );
}
