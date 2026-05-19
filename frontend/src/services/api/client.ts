/**
 * MindFlow - API Client
 * Per FRONTEND_ARCHITECTURE.md Section 5.1
 * Axios client with token refresh handling
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/authStore';
import type { ApiResponse, ApiError } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api/v1';

/**
 * Get access token from cookie (fallback when store is not hydrated)
 */
function getTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)accessToken=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Get access token from store or cookie fallback
 */
function getAccessToken(): string | null {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) return accessToken;

  // Fallback: read from cookie if store not hydrated
  const cookieToken = getTokenFromCookie();
  if (cookieToken) {
    // Sync token back to store for future requests
    useAuthStore.getState().setAccessToken(cookieToken);
  }
  return cookieToken;
}

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies (refresh token)
});

// Request interceptor - Add access token and request ID
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = getAccessToken();

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // Add request ID for tracing
    config.headers['X-Request-ID'] = crypto.randomUUID();

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors and token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else if (token) {
      resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Skip auth handling for login/logout/refresh endpoints
    const isAuthEndpoint = originalRequest.url?.includes('/auth/login') ||
                           originalRequest.url?.includes('/auth/logout') ||
                           originalRequest.url?.includes('/auth/token/refresh');

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      // Check if we have a token to refresh - if not, don't attempt refresh
      const accessToken = getAccessToken();
      if (!accessToken) {
        // No token, just reject - don't redirect (let the UI handle it)
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue request while refreshing
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
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

        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        useAuthStore.getState().clearAuth();
        // Clear accessToken cookie
        if (typeof document !== 'undefined') {
          document.cookie = 'accessToken=; path=/; max-age=0; SameSite=Strict';
        }
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Transform error response to consistent format
    const apiError: ApiError = {
      status: error.response?.status || 500,
      code: (error.response?.data as { error?: { code?: string } })?.error?.code || 'UNKNOWN_ERROR',
      message:
        (error.response?.data as { error?: { message?: string } })?.error?.message ||
        'An unexpected error occurred',
      details: (error.response?.data as { error?: { details?: [] } })?.error?.details || [],
    };

    return Promise.reject(apiError);
  }
);

// Helper functions
export async function get<T>(url: string, params?: object): Promise<T> {
  const response = await apiClient.get<ApiResponse<T>>(url, { params });
  return response.data.data;
}

export async function post<T>(url: string, data?: unknown): Promise<T> {
  const response = await apiClient.post<ApiResponse<T>>(url, data);
  return response.data.data;
}

export async function put<T>(url: string, data?: unknown): Promise<T> {
  const response = await apiClient.put<ApiResponse<T>>(url, data);
  return response.data.data;
}

export async function patch<T>(url: string, data?: unknown): Promise<T> {
  const response = await apiClient.patch<ApiResponse<T>>(url, data);
  return response.data.data;
}

export async function del<T>(url: string): Promise<T> {
  const response = await apiClient.delete<ApiResponse<T>>(url);
  return response.data.data;
}

export { API_BASE_URL };
