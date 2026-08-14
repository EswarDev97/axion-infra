import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import { errorHandler } from './middlewares/errorHandler';
import routes from './routes';

const app: Application = express();

// Trust proxy (for nginx)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS - support multiple origins
const allowedOrigins = config.corsOrigin.split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Cookie parser (before body parsing)
app.use(cookieParser());

// Body parsing - SKIP for all proxied routes to allow http-proxy-middleware to forward the raw body
// When express.json() parses the body, it consumes the stream, making it unavailable for the proxy
const skipBodyParserPaths = [
  '/api/v1/auth',
  '/api/v1/employees',
  '/api/v1/departments',
  '/api/v1/positions',
  '/api/v1/attendance',
  '/api/v1/leave',
  '/api/v1/payroll',
  '/api/v1/documents',
  '/api/v1/roles',
  '/api/v1/tasks',
  '/api/v1/expenses',
  '/api/v1/approvals',
  '/api/v1/notifications',
  '/api/v1/complaints',
  '/api/v1/training',
  '/api/v1/reports',
  '/api/v1/mindmaps',
  '/api/v1/billing',
  '/api/v1/public',
  '/api/v1/crm',
];
app.use((req, res, next) => {
  if (skipBodyParserPaths.some(path => req.path.startsWith(path))) {
    return next();
  }
  express.json({ limit: '10mb' })(req, res, next);
});
app.use((req, res, next) => {
  if (skipBodyParserPaths.some(path => req.path.startsWith(path))) {
    return next();
  }
  express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
});

// Compression
app.use(compression());

// Logging
if (config.nodeEnv !== 'test') {
  app.use(morgan(config.logFormat));
}

// Health check
app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use('/api/v1', routes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found',
    },
  });
});

// Error handler
app.use(errorHandler);

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`[server] Wings Associates API Gateway running on port ${PORT}`);
  console.log(`[server] Environment: ${config.nodeEnv}`);
});

export default app;
