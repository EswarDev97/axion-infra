/**
 * Auth Routes - Proxy to auth-service
 */
import { Router, Request, Response } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';

const router = Router();

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:8101';

// Proxy all auth routes to auth-service
// Express strips the path to just /login, /logout, etc.
// Auth-service expects: /api/v1/auth/login, so we prepend the prefix
const proxyOptions: Options = {
  target: AUTH_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: (path) => `/api/v1/auth${path}`,
  on: {
    error: (err, req, res) => {
      console.error('Auth service proxy error:', err);
      (res as Response).status(502).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Auth service is unavailable',
        },
      });
    },
    proxyReq: (proxyReq, req) => {
      console.log(`[proxy] ${req.method} ${req.url} -> ${AUTH_SERVICE_URL}${proxyReq.path}`);
    },
  },
};

router.use('/', createProxyMiddleware(proxyOptions));

export default router;
