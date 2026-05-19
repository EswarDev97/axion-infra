/**
 * Document Routes - Proxy to storage-service
 */
import { Router, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const router = Router();

const STORAGE_SERVICE_URL = process.env.STORAGE_SERVICE_URL || 'http://storage-service:8110';

router.use(
  '/',
  createProxyMiddleware({
    target: STORAGE_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => {
      if (path === '/' || path === '') {
        return '/api/v1/storage/files';
      }
      return `/api/v1/storage/files${path}`;
    },
    on: {
      error: (err, _req, res) => {
        console.error('Storage service proxy error:', err);
        const response = res as Response;
        response.status(502).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Storage service is unavailable',
          },
        });
      },
    },
  })
);

export default router;
