/**
 * Digital Lending OS - Backend Server Entry Point
 * 
 * Complete REST API server for Kenya's Digital Credit Providers (DCPs)
 * Multi-tenant SaaS platform with RBAC + ABAC authentication
 * 
 * Features:
 * - 56+ API endpoints across 10 modules
 * - JWT-based authentication with role-based access control
 * - M-Pesa Daraja API integration
 * - CRB (Credit Reference Bureau) integration
 * - Double-entry accounting ledger
 * - Real-time provider health monitoring
 * - Comprehensive audit logging
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFound';
import { setupRoutes } from './routes';

// Create Express application
const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// =============================================================================
// SECURITY MIDDLEWARE
// =============================================================================

// Helmet security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.safaricom.co.ke"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: config.cors.origins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Tenant-ID',
    'X-Request-ID',
    'X-API-Key',
  ],
  credentials: true,
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Pages'],
  maxAge: 86400, // 24 hours
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: 'Too many requests',
    message: `Rate limit exceeded. Maximum ${config.rateLimit.maxRequests} requests per ${config.rateLimit.windowMs / 1000} seconds.`,
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all routes
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 attempts per 15 minutes
  message: {
    success: false,
    error: 'Too many authentication attempts',
    message: 'Please try again later.',
  },
});
app.use('/api/auth/', authLimiter);

// =============================================================================
// PARSING MIDDLEWARE
// =============================================================================

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing
app.use(cookieParser(config.cookie.secret));

// Request logging (development vs production)
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.http(message.trim()),
    },
  }));
}

// =============================================================================
// HEALTH CHECK & ROOT ENDPOINTS
// =============================================================================

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    name: 'Digital Lending OS API',
    version: config.apiVersion,
    status: 'operational',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
    documentation: '/api/docs',
    health: '/api/health',
  });
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    },
    version: config.apiVersion,
  });
});

// API documentation endpoint
app.get('/api/docs', (_req, res) => {
  res.json({
    title: 'Digital Lending OS API Documentation',
    version: config.apiVersion,
    baseUrl: `/api/v${config.apiVersion}`,
    endpoints: {
      auth: {
        prefix: '/api/auth',
        description: 'Authentication & authorization endpoints',
        endpoints: ['POST /login', 'POST /logout', 'GET /me', 'POST /refresh'],
      },
      tenants: {
        prefix: '/api/tenants',
        description: 'Tenant (DCP) management',
        endpoints: ['GET /', 'POST /', 'GET /:id', 'PUT /:id', 'DELETE /:id'],
      },
      customers: {
        prefix: '/api/customers',
        description: 'Customer management & profiles',
        endpoints: ['GET /', 'POST /', 'GET /:id', 'PUT /:id', 'GET /:id/loans', 'GET /:id/documents'],
      },
      loans: {
        prefix: '/api/loans',
        description: 'Loan lifecycle management',
        endpoints: ['GET /', 'POST /', 'GET /:id', 'PUT /:id', 'PATCH /:id/status'],
      },
      applications: {
        prefix: '/api/applications',
        description: 'Loan application processing',
        endpoints: ['GET /', 'POST /', 'GET /:id', 'PATCH /:id/review'],
      },
      payments: {
        prefix: '/api/payments',
        description: 'M-Pesa payments & disbursements',
        endpoints: ['POST /stkpush/initiate', 'POST /stkpush/callback', 'GET /status', 'POST /disburse/b2c'],
      },
      collections: {
        prefix: '/api/collections',
        description: 'Debt collection management',
        endpoints: ['GET /', 'GET /loans', 'POST /actions', 'GET /promises'],
      },
      finance: {
        prefix: '/api/finance',
        description: 'Financial operations & accounting',
        endpoints: ['GET /', 'GET /transactions', 'GET /ledger', 'GET /reconciliation', 'POST /settlements'],
      },
      reports: {
        prefix: '/api/reports',
        description: 'Analytics & reporting',
        endpoints: ['GET /', 'GET /portfolio', 'GET /financial', 'GET /customer', 'GET /operational', 'POST /generate'],
      },
      credit: {
        prefix: '/api/credit',
        description: 'Credit scoring & risk assessment',
        endpoints: ['GET /', 'POST /assessment', 'GET /rules', 'PUT /rules/:id', 'GET /policies'],
      },
      providers: {
        prefix: '/api/providers',
        description: 'Third-party service monitoring',
        endpoints: ['GET /', 'GET /:id', 'GET /alerts', 'GET /incidents', 'GET /history'],
      },
      dashboard: {
        prefix: '/api/dashboard',
        description: 'Dashboard statistics & KPIs',
        endpoints: ['GET /stats', 'GET /charts'],
      },
    },
    authentication: {
      type: 'JWT Bearer Token',
      header: 'Authorization: Bearer <token>',
      refresh: 'Cookie: refreshToken=<token>',
    },
    rateLimits: {
      general: `${config.rateLimit.maxRequests} requests per ${config.rateLimit.windowMs / 1000}s`,
      auth: '50 requests per 15 minutes',
    },
  });
});

// =============================================================================
// API ROUTES
// =============================================================================

// Mount all API routes
setupRoutes(app);

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// =============================================================================
// SERVER STARTUP
// =============================================================================

const PORT = config.port;

app.listen(PORT, () => {
  logger.info(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   🏦 Digital Lending OS - Backend Server                       ║
║   📡 API Version: v${config.apiVersion}                                ║
║   🔗 URL: http://localhost:${PORT}                              ║
║   🔒 Environment: ${config.nodeEnv.toUpperCase()}                        ║
║   📊 Mode: ${config.isProduction ? 'Production' : 'Development'}                          ║
║                                                                ║
║   Available Endpoints:                                        ║
║   • Health Check: http://localhost:${PORT}/api/health          ║
║   • API Docs:     http://localhost:${PORT}/api/docs            ║
║   • API Base:     http://localhost:${PORT}/api/v1              ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

export default app;
