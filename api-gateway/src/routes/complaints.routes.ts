/**
 * Complaints Routes - Proxy to complaint-service
 */
import { Router, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const router = Router();

const COMPLAINT_SERVICE_URL = process.env.COMPLAINT_SERVICE_URL || 'http://complaint-service:8107';

router.use(
  '/',
  createProxyMiddleware({
    target: COMPLAINT_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => {
      if (path === '/' || path === '') {
        return '/api/v1/complaints/';
      }
      return `/api/v1/complaints${path}`;
    },
    on: {
      error: (err, _req, res) => {
        console.error('Complaint service proxy error:', err);
        const response = res as Response;
        response.status(502).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Complaint service is unavailable',
          },
        });
      },
    },
  })
);

export default router;
