/**
 * Role Routes - Proxy to auth-service
 */
import { Router, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const router = Router();

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:8101';

router.use(
  '/',
  createProxyMiddleware({
    target: AUTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => {
      // Remove leading slash and handle query strings properly to avoid trailing slash redirects
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      if (!cleanPath || cleanPath.startsWith('?')) {
        return `/api/v1/auth/roles${cleanPath}`;
      }
      return `/api/v1/auth/roles/${cleanPath}`;
    },
    on: {
      error: (err, _req, res) => {
        console.error('Auth service proxy error:', err);
        const response = res as Response;
        response.status(502).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Auth service is unavailable',
          },
        });
      },
    },
  })
);

export default router;
