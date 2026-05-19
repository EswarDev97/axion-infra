/**
 * MindFlow - Auth Service
 * Per FRONTEND_ARCHITECTURE.md Section 5 & 6
 */

import { apiClient, post } from '@/services/api/client';
import { useAuthStore, type User } from '@/stores/authStore';
import type { ApiResponse } from '@/services/api/types';

export interface LoginRequest {
  email: string;
  password: string;
  tenantSlug?: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  expiresIn: number;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export const authService = {
  /**
   * Login user with email and password
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<ApiResponse<LoginResponse>>(
      '/auth/login',
      data
    );
    const { user, accessToken, expiresIn } = response.data.data;

    // Update store
    useAuthStore.getState().setUser(user);
    useAuthStore.getState().setAccessToken(accessToken);
    useAuthStore.getState().setLoading(false);

    // Set accessToken cookie for server-side auth checks
    // Per FRONTEND_ARCHITECTURE.md - cookie accessible by SSR
    if (typeof document !== 'undefined') {
      const isSecure = window.location.protocol === 'https:';
      const maxAge = expiresIn || 900; // Default 15 min if not provided
      document.cookie = `accessToken=${accessToken}; path=/; max-age=${maxAge}; SameSite=Strict${isSecure ? '; Secure' : ''}`;
    }

    return response.data.data;
  },

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      useAuthStore.getState().clearAuth();
      // Clear accessToken cookie
      if (typeof document !== 'undefined') {
        document.cookie = 'accessToken=; path=/; max-age=0; SameSite=Strict';
      }
    }
  },

  /**
   * Refresh access token using refresh token cookie
   */
  async refreshToken(): Promise<{ accessToken: string; expiresIn?: number }> {
    const response = await apiClient.post<ApiResponse<{ accessToken: string; expiresIn?: number }>>(
      '/auth/token/refresh'
    );
    const { accessToken, expiresIn } = response.data.data;
    useAuthStore.getState().setAccessToken(accessToken);

    // Update accessToken cookie
    if (typeof document !== 'undefined') {
      const isSecure = window.location.protocol === 'https:';
      const maxAge = expiresIn || 900; // Default 15 min
      document.cookie = `accessToken=${accessToken}; path=/; max-age=${maxAge}; SameSite=Strict${isSecure ? '; Secure' : ''}`;
    }

    return { accessToken, expiresIn };
  },

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<ApiResponse<User>>('/auth/me');
    const user = response.data.data;
    useAuthStore.getState().setUser(user);
    useAuthStore.getState().setLoading(false);
    return user;
  },

  /**
   * Check if user is authenticated (used on app init)
   */
  async checkAuth(): Promise<User | null> {
    try {
      const user = await authService.getCurrentUser();
      return user;
    } catch {
      useAuthStore.getState().clearAuth();
      // Clear accessToken cookie on auth failure
      if (typeof document !== 'undefined') {
        document.cookie = 'accessToken=; path=/; max-age=0; SameSite=Strict';
      }
      return null;
    }
  },

  /**
   * Request password reset email
   */
  async forgotPassword(data: ForgotPasswordRequest): Promise<void> {
    await post('/auth/password/forgot', data);
  },

  /**
   * Reset password with token
   */
  async resetPassword(data: ResetPasswordRequest): Promise<void> {
    await post('/auth/password/reset', data);
  },

  /**
   * Change password for authenticated user
   */
  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await post('/auth/password/change', data);
  },
};

export default authService;
