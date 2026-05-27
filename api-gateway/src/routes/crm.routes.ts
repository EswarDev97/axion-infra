/**
 * CRM Routes - Proxy to hr-service /api/v1/hr/crm/*
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
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      if (!cleanPath || cleanPath.startsWith('?')) {
        return `/api/v1/hr/crm/leads${cleanPath}`;
      }
      return `/api/v1/hr/crm/leads/${cleanPath}`;
    },
    on: {
      error: (_err, _req, res) => {
        const response = res as Response;
        response.status(502).json({
          success: false,
          error: { code: 'SERVICE_UNAVAILABLE', message: 'HR service is unavailable' },
        });
      },
    },
  })
);

export default router;
