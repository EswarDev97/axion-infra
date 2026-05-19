/**
 * Mind Maps Routes - Proxy to mindmap-service
 */
import { Router, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const router = Router();

const MINDMAP_SERVICE_URL = process.env.MINDMAP_SERVICE_URL || 'http://mindmap-service:8106';

router.use(
  '/',
  createProxyMiddleware({
    target: MINDMAP_SERVICE_URL,
    changeOrigin: true,
    followRedirects: true,
    autoRewrite: true,
    pathRewrite: (path) => {
      // Mindmap service uses /api/v1/mindmap prefix + /mindmaps, /templates, /nodes routers
      if (path === '/' || path === '') {
        return '/mindmaps';
      }
      return `/mindmaps${path}`;
    },
    on: {
      error: (err, _req, res) => {
        console.error('Mindmap service proxy error:', err);
        const response = res as Response;
        response.status(502).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Mindmap service is unavailable',
          },
        });
      },
    },
  })
);

export default router;
