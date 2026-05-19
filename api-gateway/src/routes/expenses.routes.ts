/**
 * Expenses Routes - Proxy to expense-service
 */
import { Router, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const router = Router();

const EXPENSE_SERVICE_URL = process.env.EXPENSE_SERVICE_URL || 'http://expense-service:8105';

router.use(
  '/',
  createProxyMiddleware({
    target: EXPENSE_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => {
      if (path === '/' || path === '') {
        return '/api/v1/expenses/';
      }
      return `/api/v1/expenses${path}`;
    },
    on: {
      error: (err, _req, res) => {
        console.error('Expense service proxy error:', err);
        const response = res as Response;
        response.status(502).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Expense service is unavailable',
          },
        });
      },
    },
  })
);

export default router;
