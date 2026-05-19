/**
 * Training Routes - Proxy to training-service
 */
import { Router, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const router = Router();

const TRAINING_SERVICE_URL = process.env.TRAINING_SERVICE_URL || 'http://training-service:8104';

router.use(
  '/',
  createProxyMiddleware({
    target: TRAINING_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => {
      if (path === '/' || path === '') {
        return '/api/v1/training/';
      }
      return `/api/v1/training${path}`;
    },
    on: {
      error: (err, _req, res) => {
        console.error('Training service proxy error:', err);
        const response = res as Response;
        response.status(502).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Training service is unavailable',
          },
        });
      },
    },
  })
);

export default router;
