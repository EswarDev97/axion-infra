/**
 * Auth Service Unit Tests
 * Per SDLC Phase 7 Task 7.11
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authService } from '@/services/auth/authService';
import { server } from '../setup';
import { http, HttpResponse } from 'msw';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

describe('AuthService', () => {
  beforeEach(() => {
    // Clear any stored tokens
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('login', () => {
    it('successfully logs in with valid credentials', async () => {
      const result = await authService.login({
        email: 'test@mindflow.com',
        password: 'password123',
        tenantId: 'test-tenant-id',
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('access_token');
      expect(result.data).toHaveProperty('user');
    });

    it('returns error for invalid credentials', async () => {
      const result = await authService.login({
        email: 'wrong@email.com',
        password: 'wrongpassword',
        tenantId: 'test-tenant-id',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('stores tokens on successful login', async () => {
      await authService.login({
        email: 'test@mindflow.com',
        password: 'password123',
        tenantId: 'test-tenant-id',
      });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'access_token',
        expect.any(String)
      );
    });
  });

  describe('logout', () => {
    it('clears tokens on logout', async () => {
      await authService.logout();

      expect(localStorage.removeItem).toHaveBeenCalledWith('access_token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('refresh_token');
    });

    it('calls logout endpoint', async () => {
      const result = await authService.logout();

      expect(result.success).toBe(true);
    });
  });

  describe('getCurrentUser', () => {
    it('returns user data when authenticated', async () => {
      // Mock localStorage to return a token
      localStorage.getItem = vi.fn().mockReturnValue('mock-token');

      const result = await authService.getCurrentUser();

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('email');
    });

    it('returns error when not authenticated', async () => {
      // Mock 401 response
      server.use(
        http.get(`${API_BASE}/api/v1/auth/me`, () => {
          return HttpResponse.json(
            { success: false, error: { message: 'Unauthorized' } },
            { status: 401 }
          );
        })
      );

      const result = await authService.getCurrentUser();

      expect(result.success).toBe(false);
    });
  });

  describe('refreshToken', () => {
    it('successfully refreshes token', async () => {
      const result = await authService.refreshToken('mock-refresh-token');

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('access_token');
    });

    it('stores new access token after refresh', async () => {
      await authService.refreshToken('mock-refresh-token');

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'access_token',
        expect.any(String)
      );
    });
  });

  describe('isAuthenticated', () => {
    it('returns true when token exists', () => {
      localStorage.getItem = vi.fn().mockReturnValue('mock-token');

      const result = authService.isAuthenticated();

      expect(result).toBe(true);
    });

    it('returns false when no token', () => {
      localStorage.getItem = vi.fn().mockReturnValue(null);

      const result = authService.isAuthenticated();

      expect(result).toBe(false);
    });
  });
});

describe('AuthService - Error Handling', () => {
  it('handles network errors gracefully', async () => {
    server.use(
      http.post(`${API_BASE}/api/v1/auth/login`, () => {
        return HttpResponse.error();
      })
    );

    const result = await authService.login({
      email: 'test@mindflow.com',
      password: 'password123',
      tenantId: 'test-tenant-id',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('handles server errors gracefully', async () => {
    server.use(
      http.post(`${API_BASE}/api/v1/auth/login`, () => {
        return HttpResponse.json(
          { success: false, error: { message: 'Internal server error' } },
          { status: 500 }
        );
      })
    );

    const result = await authService.login({
      email: 'test@mindflow.com',
      password: 'password123',
      tenantId: 'test-tenant-id',
    });

    expect(result.success).toBe(false);
  });

  it('handles validation errors', async () => {
    server.use(
      http.post(`${API_BASE}/api/v1/auth/login`, () => {
        return HttpResponse.json(
          {
            success: false,
            error: {
              message: 'Validation error',
              details: [
                { field: 'email', message: 'Invalid email format' },
              ],
            },
          },
          { status: 422 }
        );
      })
    );

    const result = await authService.login({
      email: 'invalid-email',
      password: 'password123',
      tenantId: 'test-tenant-id',
    });

    expect(result.success).toBe(false);
    expect(result.error?.details).toBeDefined();
  });
});
