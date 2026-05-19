/**
 * MindFlow - Auth Store
 * Per FRONTEND_ARCHITECTURE.md Section 5 & 6
 * Zustand store for authentication state management
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
  tenantId: string;
  tenantName?: string;
  roles: string[];
  permissions: string[];
  employee?: {
    id: string;
    employeeCode: string;
    department?: {
      id: string;
      name: string;
    };
    designation: string;
  };
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;

  // Permission helpers
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setAccessToken: (accessToken) => set({ accessToken }),

      setLoading: (isLoading) => set({ isLoading }),

      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isLoading: false,
        }),

      hasPermission: (permission: string): boolean => {
        const { user } = get();
        if (!user) return false;

        const roles = user.roles || [];
        const perms = user.permissions || [];

        // Super admin has all permissions
        if (roles.includes('SUPER_ADMIN')) return true;

        // Check for wildcard
        if (perms.includes('*')) return true;

        // Check for module wildcard
        const [module] = permission.split(':');
        if (perms.includes(`${module}:*`)) return true;

        // Check exact permission
        return perms.includes(permission);
      },

      hasAnyPermission: (permissions: string[]): boolean => {
        const { hasPermission } = get();
        return permissions.some(hasPermission);
      },

      hasRole: (role: string): boolean => {
        const { user } = get();
        if (!user) return false;
        return (user.roles || []).includes(role);
      },

      hasAnyRole: (roles: string[]): boolean => {
        const { user } = get();
        if (!user) return false;
        return roles.some((role) => (user.roles || []).includes(role));
      },
    }),
    {
      name: 'mindflow-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        // Only persist minimal data, not the token (handled via httpOnly cookie)
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Selector hooks for common use cases
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
