/**
 * Payroll Routes - Proxy to hr-service
 */
import { Router, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const router = Router();

const HR_SERVICE_URL = process.env.HR_SERVICE_URL || 'http://hr-service:8102';

router.use(
  '/',
  createProxyMiddleware({
    target: HR_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => {
      // Remove leading slash and handle query strings properly to avoid trailing slash redirects
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      if (!cleanPath || cleanPath.startsWith('?')) {
        return `/api/v1/hr/payroll${cleanPath}`;
      }
      return `/api/v1/hr/payroll/${cleanPath}`;
    },
    on: {
      error: (err, _req, res) => {
        console.error('HR service proxy error:', err);
        const response = res as Response;
        response.status(502).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'HR service is unavailable',
          },
        });
      },
    },
  })
);

export default router;
