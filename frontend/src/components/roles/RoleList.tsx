/**
 * MindFlow - Role List Component
 * Full CRUD implementation for Roles & Permissions
 */
'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/feedback/Alert';
import { Modal, ModalFooter } from '@/components/feedback/Modal';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { FormField } from '@/components/form/FormField';
import {
  roleService,
  permissionService,
  type Role,
  type Permission,
} from '@/services/roles';

interface RoleListProps {
  searchParams?: {
    search?: string;
  };
}

export function RoleList({ searchParams = {} }: RoleListProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<Role | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    permissions: [] as string[],
  });
  const [formLoading, setFormLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rolesRes, permsRes] = await Promise.all([
        roleService.list({ pageSize: 100 }),
        permissionService.list(),
      ]);
      setRoles(rolesRes.items);
      setPermissions(permsRes.items);
    } catch (err) {
      setError((err as Error).message || 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const permissionsByModule = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  const openCreateModal = () => {
    setEditingRole(null);
    setFormData({ code: '', name: '', description: '', permissions: [] });
    setShowModal(true);
  };

  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setFormData({
      code: role.code,
      name: role.name,
      description: role.description || '',
      permissions: [...role.permissions],
    });
    setShowModal(true);
  };

  const togglePermission = (code: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(code)
        ? prev.permissions.filter((p) => p !== code)
        : [...prev.permissions, code],
    }));
  };

  const toggleModulePermissions = (module: string) => {
    const moduleCodes = permissionsByModule[module]?.map((p) => p.code) || [];
    const allSelected = moduleCodes.every((c) => formData.permissions.includes(c));
    setFormData((prev) => ({
      ...prev,
      permissions: allSelected
        ? prev.permissions.filter((p) => !moduleCodes.includes(p))
        : [...new Set([...prev.permissions, ...moduleCodes])],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Role name is required');
      return;
    }
    if (!editingRole && !formData.code.trim()) {
      setError('Role code is required');
      return;
    }

    setFormLoading(true);
    try {
      if (editingRole) {
        await roleService.update(editingRole.id, {
          name: formData.name,
          description: formData.description || undefined,
          permissions: formData.permissions,
        });
        setSuccess(`Role "${formData.name}" updated successfully`);
      } else {
        await roleService.create({
          code: formData.code.toUpperCase().replace(/\s+/g, '_'),
          name: formData.name,
          description: formData.description || undefined,
          permissions: formData.permissions,
        });
        setSuccess(`Role "${formData.name}" created successfully`);
      }
      setShowModal(false);
      await fetchData();
    } catch (err) {
      setError((err as Error).message || 'Failed to save role');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      await roleService.delete(deleteConfirm.id);
      setSuccess(`Role "${deleteConfirm.name}" deleted successfully`);
      setDeleteConfirm(null);
      await fetchData();
    } catch (err) {
      setError((err as Error).message || 'Failed to delete role');
      setDeleteConfirm(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filter roles by search
  const filteredRoles = searchParams.search
    ? roles.filter(
        (r) =>
          r.name.toLowerCase().includes(searchParams.search!.toLowerCase()) ||
          r.code.toLowerCase().includes(searchParams.search!.toLowerCase())
      )
    : roles;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
        <p className="text-gray-500 mt-4">Loading roles...</p>
      </div>
    );
  }

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

      {/* Actions */}
      <div className="flex justify-end">
        <Button onClick={openCreateModal}>Create Role</Button>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 gap-4">
        {filteredRoles.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <p className="text-gray-500">No roles found</p>
          </div>
        ) : (
          filteredRoles.map((role) => (
            <div
              key={role.id}
              className="bg-white rounded-lg shadow-sm border overflow-hidden"
            >
              {/* Role Header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() =>
                  setExpandedRoleId(expandedRoleId === role.id ? null : role.id)
                }
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-primary-600"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{role.name}</h3>
                      <Badge variant="neutral" size="sm">
                        {role.code}
                      </Badge>
                      {role.isSystemRole && (
                        <Badge variant="purple" size="sm">
                          System
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {role.description || 'No description'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="blue" size="sm">
                    {role.permissions.length} permissions
                  </Badge>
                  {!role.isSystemRole && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(role);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(role);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-5 w-5 text-gray-400 transition-transform ${
                      expandedRoleId === role.id ? 'rotate-180' : ''
                    }`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>

              {/* Expanded Permissions */}
              {expandedRoleId === role.id && (
                <div className="border-t px-4 py-3 bg-gray-50">
                  {role.permissions.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">
                      {role.isSystemRole
                        ? 'System role - has full access to all modules'
                        : 'No permissions assigned'}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(
                        role.permissions.reduce<Record<string, string[]>>((acc, code) => {
                          const module = code.split(':')[0];
                          if (!acc[module]) acc[module] = [];
                          acc[module].push(code);
                          return acc;
                        }, {})
                      ).map(([module, perms]) => (
                        <div key={module}>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                            {module}
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {perms.map((code) => {
                              const perm = permissions.find((p) => p.code === code);
                              return (
                                <Badge key={code} variant="info" size="sm">
                                  {perm?.name || code}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingRole ? 'Edit Role' : 'Create Role'}
        description={
          editingRole
            ? 'Update role details and permissions'
            : 'Define a new role with specific permissions'
        }
        size="xl"
        className="max-w-3xl"
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Role Code" required={!editingRole}>
                <Input
                  value={formData.code}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, code: e.target.value }))
                  }
                  disabled={!!editingRole}
                  placeholder="e.g. HR_ADMIN"
                />
              </FormField>
              <FormField label="Role Name" required>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g. HR Admin"
                />
              </FormField>
            </div>

            <FormField label="Description">
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Describe the role's responsibilities..."
                rows={2}
              />
            </FormField>

            {/* Permissions Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Permissions ({formData.permissions.length} selected)
              </label>
              <div className="border rounded-lg max-h-72 overflow-y-auto">
                {Object.entries(permissionsByModule).map(([module, modulePerms]) => {
                  const allSelected = modulePerms.every((p) =>
                    formData.permissions.includes(p.code)
                  );
                  const someSelected = modulePerms.some((p) =>
                    formData.permissions.includes(p.code)
                  );

                  return (
                    <div key={module} className="border-b last:border-b-0">
                      <div
                        className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 cursor-pointer hover:bg-gray-100"
                        onClick={() => toggleModulePermissions(module)}
                      >
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someSelected && !allSelected;
                          }}
                          onChange={() => toggleModulePermissions(module)}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm font-semibold text-gray-700 uppercase">
                          {module}
                        </span>
                        <Badge variant="neutral" size="sm">
                          {modulePerms.filter((p) =>
                            formData.permissions.includes(p.code)
                          ).length}
                          /{modulePerms.length}
                        </Badge>
                      </div>
                      <div className="px-4 py-2 space-y-1.5">
                        {modulePerms.map((perm) => (
                          <label
                            key={perm.id}
                            className="flex items-center gap-3 py-1 cursor-pointer hover:bg-gray-50 rounded px-1"
                          >
                            <input
                              type="checkbox"
                              checked={formData.permissions.includes(perm.code)}
                              onChange={() => togglePermission(perm.code)}
                              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-800">
                                {perm.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {perm.code}
                                {perm.description && ` - ${perm.description}`}
                              </div>
                            </div>
                            <Badge
                              variant={
                                perm.resourceScope === 'ALL'
                                  ? 'green'
                                  : perm.resourceScope === 'TEAM'
                                  ? 'yellow'
                                  : perm.resourceScope === 'DEPARTMENT'
                                  ? 'blue'
                                  : 'gray'
                              }
                              size="sm"
                            >
                              {perm.resourceScope}
                            </Badge>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={formLoading}>
              {editingRole ? 'Update Role' : 'Create Role'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Role"
        description={`Are you sure you want to delete the role "${deleteConfirm?.name}"? This action cannot be undone. Users with this role will lose their associated permissions.`}
        confirmLabel="Delete Role"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
