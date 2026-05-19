/**
 * Public Routes - Health checks and public endpoints
 */
import { Router, Request, Response } from 'express';

const router = Router();

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'api-gateway',
    },
  });
});

// Version info
router.get('/version', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    },
  });
});

export default router;
