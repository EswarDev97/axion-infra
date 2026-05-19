/**
 * MindFlow - Permission Matrix Component
 * Shows a matrix of roles vs permissions grouped by module
 */
'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/feedback/Alert';
import { roleService, permissionService, type Role, type Permission } from '@/services/roles';

export function PermissionMatrix() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rolesRes, permsRes] = await Promise.all([
          roleService.list({ pageSize: 100 }),
          permissionService.list(),
        ]);
        setRoles(rolesRes.items);
        setPermissions(permsRes.items);
      } catch (err) {
        setError((err as Error).message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
        <p className="text-gray-500 mt-4">Loading permission matrix...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error" onClose={() => setError(null)}>
        {error}
      </Alert>
    );
  }

  const permissionsByModule = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  const modules = Object.keys(permissionsByModule).sort();

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 font-semibold text-gray-700 sticky left-0 bg-gray-50 min-w-[200px] z-10">
                Permission
              </th>
              {roles.map((role) => (
                <th
                  key={role.id}
                  className="text-center px-3 py-3 font-semibold text-gray-700 min-w-[100px]"
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs">{role.name}</span>
                    {role.isSystemRole && (
                      <Badge variant="purple" size="sm">System</Badge>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modules.map((module) => (
              <>
                {/* Module Header */}
                <tr key={`module-${module}`} className="bg-gray-100">
                  <td
                    colSpan={roles.length + 1}
                    className="px-4 py-2 font-bold text-xs text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-100"
                  >
                    {module}
                  </td>
                </tr>
                {/* Permission Rows */}
                {permissionsByModule[module].map((perm) => (
                  <tr key={perm.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 sticky left-0 bg-white z-10">
                      <div className="font-medium text-gray-800">{perm.name}</div>
                      <div className="text-xs text-gray-400">{perm.code}</div>
                    </td>
                    {roles.map((role) => {
                      const hasPermission =
                        role.isSystemRole || role.permissions.includes(perm.code);
                      return (
                        <td key={role.id} className="text-center px-3 py-2">
                          {hasPermission ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={3}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-gray-300">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
