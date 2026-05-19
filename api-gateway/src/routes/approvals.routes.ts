/**
 * Approvals Routes - Proxy to approval-service
 */
import { Router, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const router = Router();

const APPROVAL_SERVICE_URL = process.env.APPROVAL_SERVICE_URL || 'http://approval-service:8108';

router.use(
  '/',
  createProxyMiddleware({
    target: APPROVAL_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => {
      if (path === '/' || path === '') {
        return '/api/v1/approvals/';
      }
      return `/api/v1/approvals${path}`;
    },
    on: {
      error: (err, _req, res) => {
        console.error('Approval service proxy error:', err);
        const response = res as Response;
        response.status(502).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Approval service is unavailable',
          },
        });
      },
    },
  })
);

export default router;
