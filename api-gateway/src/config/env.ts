import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',

  // Database
  databaseUrl: process.env.DATABASE_URL!,

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  redisPrefix: process.env.REDIS_PREFIX || 'axionpcs:',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  jwtIssuer: process.env.JWT_ISSUER || 'axionpcs',

  // Session
  sessionSecret: process.env.SESSION_SECRET || 'session-secret-change-in-production',
  sessionTtl: parseInt(process.env.SESSION_TTL || '86400', 10),

  // MinIO
  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    bucketDocuments: process.env.MINIO_BUCKET_DOCUMENTS || 'axionpcs-documents',
    bucketAvatars: process.env.MINIO_BUCKET_AVATARS || 'axionpcs-avatars',
  },

  // AI Services
  aiServices: {
    resumeParser: process.env.AI_SERVICE_RESUME_PARSER_URL || 'http://localhost:8001',
    documentClassifier: process.env.AI_SERVICE_DOCUMENT_CLASSIFIER_URL || 'http://localhost:8002',
    hrAnalytics: process.env.AI_SERVICE_HR_ANALYTICS_URL || 'http://localhost:8003',
  },

  // Email
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromName: process.env.SMTP_FROM_NAME || 'Wings Associates',
    fromEmail: process.env.SMTP_FROM_EMAIL || 'noreply@axionpcs.com',
  },

  // OTP
  otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10),
  otpLength: parseInt(process.env.OTP_LENGTH || '6', 10),

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3002',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'debug',
  logFormat: process.env.LOG_FORMAT || 'dev',

  // Multi-tenant
  defaultTenantSlug: process.env.DEFAULT_TENANT_SLUG || 'axionpcs',
  superAdminEmail: process.env.SUPER_ADMIN_EMAIL || 'admin@axionpcs.com',

  // File Upload
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
  allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || 'pdf,doc,docx,jpg,jpeg,png,gif').split(','),

  // Pagination
  defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE || '20', 10),
  maxPageSize: parseInt(process.env.MAX_PAGE_SIZE || '100', 10),
};
