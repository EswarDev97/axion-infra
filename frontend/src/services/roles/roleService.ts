/**
 * MindFlow - Role & Permission Service
 */

import { get, post, put, del } from '@/services/api/client';
import type { PaginatedResponse, PaginationParams } from '@/services/api/types';
import type { Role, RoleCreateRequest, RoleUpdateRequest, Permission } from './types';

export const roleService = {
  async list(params?: PaginationParams): Promise<PaginatedResponse<Role>> {
    return get<PaginatedResponse<Role>>('/roles', params);
  },

  async getById(id: string): Promise<Role> {
    return get<Role>(`/roles/${id}`);
  },

  async create(data: RoleCreateRequest): Promise<Role> {
    return post<Role>('/roles', data);
  },

  async update(id: string, data: RoleUpdateRequest): Promise<Role> {
    return put<Role>(`/roles/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return del<void>(`/roles/${id}`);
  },
};

export const permissionService = {
  async list(module?: string): Promise<PaginatedResponse<Permission>> {
    return get<PaginatedResponse<Permission>>('/roles/permissions', module ? { module } : {});
  },
};

export default roleService;
