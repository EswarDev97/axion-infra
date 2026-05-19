/**
 * Reports Routes - Proxy to report-service
 */
import { Router, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const router = Router();

const REPORT_SERVICE_URL = process.env.REPORT_SERVICE_URL || 'http://report-service:8111';

router.use(
  '/',
  createProxyMiddleware({
    target: REPORT_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => {
      if (path === '/' || path === '') {
        return '/api/v1/reports/';
      }
      return `/api/v1/reports${path}`;
    },
    on: {
      error: (err, _req, res) => {
        console.error('Report service proxy error:', err);
        const response = res as Response;
        response.status(502).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Report service is unavailable',
          },
        });
      },
    },
  })
);

export default router;
