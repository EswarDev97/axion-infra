'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/stores/authStore';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
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

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, tenantSlug?: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await apiClient.get('/auth/me');
      setUser(response.data.data);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, tenantSlug?: string) => {
    const response = await apiClient.post('/auth/login', {
      email,
      password,
      tenantSlug,
    });
    const { user: userData, accessToken } = response.data.data;
    setUser(userData);

    // Sync to authStore for services that use it (e.g., taskService)
    useAuthStore.getState().setUser(userData);
    useAuthStore.getState().setAccessToken(accessToken);
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      setUser(null);
      // Clear authStore as well
      useAuthStore.getState().clearAuth();
    }
  };

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user) return false;

      // Super admin has all permissions
      if (user.roles.includes('SUPER_ADMIN')) return true;

      // Check for wildcard
      if (user.permissions.includes('*')) return true;

      // Check for module wildcard
      const [module] = permission.split(':');
      if (user.permissions.includes(`${module}:*`)) return true;

      // Check exact permission
      return user.permissions.includes(permission);
    },
    [user]
  );

  const hasRole = useCallback(
    (role: string): boolean => {
      if (!user) return false;
      return user.roles.includes(role);
    },
    [user]
  );

  const hasAnyRole = useCallback(
    (roles: string[]): boolean => {
      if (!user) return false;
      return roles.some((role) => user.roles.includes(role));
    },
    [user]
  );

  const hasAnyPermission = useCallback(
    (permissions: string[]): boolean => {
      return permissions.some((permission) => hasPermission(permission));
    },
    [hasPermission]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        hasPermission,
        hasRole,
        hasAnyRole,
        hasAnyPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
