// Trigger restart
import config from './config/env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import mongoSanitize from 'express-mongo-sanitize';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { authLimiter, generalLimiter, paymentsLimiter, orderLimiter, returnsLimiter } from './middleware/rateLimiters.js';
import securityLogger from './middleware/securityLogger.js';
import contextMiddleware from './middleware/requestContextMiddleware.js';

import http from 'http';
import { redisClient } from './utils/cache.js';
import { closeQueues } from './services/QueueService.js';
import { connectDB } from './config/db.js';
import { initIO } from './utils/socket.js';
import { setupAuthCleanupJob } from './jobs/authCleanup.js';
import { initWorkers } from './services/QueueService.js';
import productsRouter from './routes/products.js';
import purchaseOrdersRouter from './routes/purchaseOrders.js';
import dispatchesRouter from './routes/dispatches.js';
import ordersRouter from './routes/orders.js';
import paymentsRouter from './routes/payments.js';
import shopkeepersRouter from './routes/shopkeepers.js';
import complaintsRouter from './routes/complaints.js';
import campaignsRouter from './routes/campaigns.js';
import notificationsRouter from './routes/notifications.js';
import chartsRouter from './routes/charts.js';
import reportsRouter from './routes/reports.js';
import usersRouter from './routes/users.js';
import authRouter from './routes/auth.js';
import transactionsRouter from './routes/transactions.js';
import analyticsRouter from './routes/analytics.js';
import approvalsRouter from './routes/approvals.js';
import dispatchRouter from './routes/dispatch.js';
import expensesRouter from './routes/expenses.js';
import returnsRouter from './routes/returns.js';
import creditNotesRouter from './routes/creditNotes.js';
import transfersRouter from './routes/transfers.js';
import vehiclesRouter from './routes/vehicles.js';
import logger from './utils/logger.js';
import requestLogger from './middleware/requestLogger.js';
import AppError from './utils/AppError.js';
import errorHandler from './middleware/errorHandler.js';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = config.port;

// Disable ETags globally
app.disable('etag');

// Normalize URLs to remove double slashes caused by misconfigured proxies (e.g. Vercel)
app.use((req, res, next) => {
  if (req.url.includes('//')) {
    req.url = req.url.replace(/\/\/+/g, '/');
    req.originalUrl = req.originalUrl.replace(/\/\/+/g, '/');
  }
  next();
});

// Add no-cache headers to all API responses
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Trust local development and production proxy headers (required for express-rate-limit)
app.set('trust proxy', 1);

// 1. Helmet Security Headers (with Cloudinary CSP and Cross-Origin overrides)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'img-src': ["'self'", "data:", "res.cloudinary.com"],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    noSniff: true,
    frameguard: { action: 'deny' },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    hidePoweredBy: true,
  })
);

// Add security logger
app.use(securityLogger);

// 2. Strict CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:5173', 'https://prime-oils-5w4p.vercel.app'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/$/, '');
      const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin);
      if (process.env.NODE_ENV !== 'production' && isLocal) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(cleanOrigin)) {
        return callback(null, true);
      }
      logger.warn(`CORS Reject: Origin "${origin}" is not allowed`);
      return callback(new Error('Origin not permitted'), false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// 3. Global and Specialized Rate Limiters
app.use(generalLimiter);

// Add Request ID middleware
app.use((req, res, next) => {
  req.id = uuidv4();
  req.headers['x-request-id'] = req.id;
  res.setHeader('X-Request-Id', req.id);
  next();
});

// Setup Async Context
app.use(contextMiddleware);

app.use(requestLogger);

// 4. Request Parsing and Parameter Protection
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(hpp());
app.use(compression());

import mongoose from 'mongoose';
import { isRedisConnected } from './utils/cache.js';
import { getWorkerStatus } from './services/QueueService.js';

// Friendly Root API message
app.get('/', (req, res) => res.json({
  success: true,
  message: 'Prime Oils API Server is running. Please access the application via your Vercel frontend client.',
  endpoints: {
    health: '/api/health',
    live: '/health/live',
    ready: '/health/ready'
  }
}));

// Health check endpoints (no auth required)
app.get('/api/health', (req, res) => res.json({
  uptime: process.uptime(),
  environment: process.env.NODE_ENV || 'development',
  version: process.env.npm_package_version || '1.0.0',
  timestamp: new Date().toISOString()
}));

app.get('/health/live', (req, res) => res.status(200).send('OK'));

app.get('/health/ready', (req, res) => {
  const isMongoReady = mongoose.connection.readyState === 1;
  const isRedisReady = isRedisConnected;
  if (isMongoReady && isRedisReady) {
    res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
  } else {
    res.status(503).json({ status: 'not ready', mongodb: isMongoReady, redis: isRedisReady });
  }
});

app.get('/api/health/detailed', (req, res) => {
  res.json({
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    redis: isRedisConnected ? 'connected' : 'disconnected',
    queue: getWorkerStatus ? getWorkerStatus() : 'running',
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage(),
    timestamp: new Date().toISOString()
  });
});

// 5. Routes definitions
const apiRouter = express.Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/payments', paymentsRouter);
apiRouter.use('/orders', ordersRouter);
apiRouter.use('/returns', returnsRouter);

// Other routes
apiRouter.use('/products', productsRouter);
apiRouter.use('/shopkeepers', shopkeepersRouter);
apiRouter.use('/complaints', complaintsRouter);
apiRouter.use('/campaigns', campaignsRouter);
apiRouter.use('/notifications', notificationsRouter);
apiRouter.use('/purchaseOrders', purchaseOrdersRouter);
apiRouter.use('/charts', chartsRouter);
apiRouter.use('/reports', reportsRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/transactions', transactionsRouter);
apiRouter.use('/analytics', analyticsRouter);
apiRouter.use('/approvals', approvalsRouter);
apiRouter.use('/dispatch', dispatchRouter);
apiRouter.use('/expenses', expensesRouter);
apiRouter.use('/credit-notes', creditNotesRouter);
apiRouter.use('/transfers', transfersRouter);
apiRouter.use('/vehicles', vehiclesRouter);

// Mount the apiRouter at both /api and / 
// This gracefully handles cases where Vercel/proxies strip the /api prefix during rewrites
app.use('/api', apiRouter);
app.use('/', apiRouter);

// 404 Handler - Forward to global error handler
app.use((req, res, next) => {
  next(AppError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
});

// Central Error Handler Middleware
app.use(errorHandler);

let serverInstance;

async function start() {
  await connectDB();
  const httpServer = http.createServer(app);
  serverInstance = httpServer;
  
  // Initialize Socket.io
  const allowedOriginsList = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:5173', 'https://prime-oils-5w4p.vercel.app'];
  
  initIO(httpServer, allowedOriginsList);
  setupAuthCleanupJob();
  initWorkers();
  
  httpServer.listen(PORT, () => logger.info(`API and Socket.IO running on http://localhost:${PORT}`));
}

// Graceful Shutdown
async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  try {
    if (serverInstance) {
      serverInstance.close(() => {
        logger.info('HTTP server closed.');
      });
    }
    await mongoose.connection.close();
    logger.info('MongoDB connections closed.');

    if (redisClient) {
      await redisClient.quit();
      logger.info('Redis client disconnected.');
    }

    if (typeof closeQueues === 'function') {
      await closeQueues();
      logger.info('Queues drained and closed.');
    }

    process.exit(0);
  } catch (err) {
    logger.error('Error during graceful shutdown:', err);
    process.exit(1);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('uncaughtException', (err) => {
  logger.error(`UNCAUGHT EXCEPTION: ${err.message}`, { stack: err.stack });
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`UNHANDLED REJECTION: ${reason}`, { promise });
  gracefulShutdown('unhandledRejection');
});

if (process.env.NODE_ENV !== 'test') {
  start().catch(err => {
    logger.error(`Failed to start server: ${err.message}`, { error: err });
    process.exit(1);
  });
}

export default app;
// Trigger restart
