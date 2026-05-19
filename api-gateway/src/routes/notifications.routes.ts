/**
 * Notifications Routes - Proxy to notification-service
 */
import { Router, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const router = Router();

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:8109';

router.use(
  '/',
  createProxyMiddleware({
    target: NOTIFICATION_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => {
      if (path === '/' || path === '') {
        return '/api/v1/notifications/';
      }
      return `/api/v1/notifications${path}`;
    },
    on: {
      error: (err, _req, res) => {
        console.error('Notification service proxy error:', err);
        const response = res as Response;
        response.status(502).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Notification service is unavailable',
          },
        });
      },
    },
  })
);

export default router;
