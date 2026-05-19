/**
 * Tasks Routes - Proxy to task-service
 */
import { Router, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const router = Router();

const TASK_SERVICE_URL = process.env.TASK_SERVICE_URL || 'http://task-service:8103';

router.use(
  '/',
  createProxyMiddleware({
    target: TASK_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => {
      if (path === '/' || path === '') {
        return '/api/v1/tasks/';
      }
      return `/api/v1/tasks${path}`;
    },
    on: {
      error: (err, _req, res) => {
        console.error('Task service proxy error:', err);
        const response = res as Response;
        response.status(502).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Task service is unavailable',
          },
        });
      },
    },
  })
);

export default router;
