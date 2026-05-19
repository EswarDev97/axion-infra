/**
 * Billing Routes - Proxy to billing-service
 * Handles quotes, invoices, and currency endpoints.
 */
import { Router, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const router = Router();

const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL || 'http://billing-service:8112';

router.use(
  '/',
  createProxyMiddleware({
    target: BILLING_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => {
      if (path === '/' || path === '') {
        return '/api/v1/billing/';
      }
      return `/api/v1/billing${path}`;
    },
    on: {
      error: (err, _req, res) => {
        console.error('Billing service proxy error:', err);
        const response = res as Response;
        response.status(502).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Billing service is unavailable',
          },
        });
      },
    },
  })
);

export default router;
