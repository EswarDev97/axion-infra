/**
 * MindFlow - Role & Permission Types
 */

export interface Permission {
  id: string;
  code: string;
  name: string;
  module: string;
  action: string;
  resourceScope: string;
  description?: string | null;
}

export interface Role {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isSystemRole: boolean;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RoleCreateRequest {
  code: string;
  name: string;
  description?: string;
  permissions: string[];
}

export interface RoleUpdateRequest {
  name?: string;
  description?: string;
  permissions?: string[];
}
