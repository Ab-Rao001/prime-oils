import config from './config/env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import mongoSanitize from 'express-mongo-sanitize';
import cookieParser from 'cookie-parser';
import compression from 'compression';

import { connectDB } from './config/db.js';
import productsRouter from './routes/products.js';
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
import logger from './utils/logger.js';
import requestLogger from './middleware/requestLogger.js';
import AppError from './utils/AppError.js';
import errorHandler from './middleware/errorHandler.js';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = config.port;

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
  })
);

// 2. Strict CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use((req, res, next) => {
  let origin = req.headers.origin;
  if (!origin) return next();
  
  // Normalize origin by stripping trailing slash
  origin = origin.replace(/\/$/, '');
  
  // Allow local origins on any port in development
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  if (process.env.NODE_ENV !== 'production' && isLocal) {
    return next();
  }

  if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
    return next();
  }
  logger.warn(`CORS Reject: Origin "${origin}" is not in allowed origins: ${JSON.stringify(allowedOrigins)}`);
  return res.status(403).json({ success: false, message: 'Origin not permitted' });
});

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/$/, '');
      const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin);
      if (process.env.NODE_ENV !== 'production' && isLocal) {
        return callback(null, true);
      }
      if (allowedOrigins.length === 0 || allowedOrigins.includes(cleanOrigin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// 3. Global and Specialized Rate Limiters
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, please try again after 15 minutes.' },
});

const writeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 write requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many write operations, please slow down.' },
});

// Middleware to apply writeLimiter only to write methods (POST, PUT, PATCH, DELETE)
const inventoryOrderWriteLimiter = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  next();
};

app.use(globalLimiter);

// Add Request ID middleware
app.use((req, res, next) => {
  req.id = uuidv4();
  req.headers['x-request-id'] = req.id;
  res.setHeader('X-Request-Id', req.id);
  next();
});

app.use(requestLogger);

// 4. Request Parsing and Parameter Protection
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(hpp());
app.use(compression());

// Health check and Metrics (no auth required)
app.get('/api/health', (req, res) => res.json({ 
  ok: true,
  timestamp: new Date().toISOString(),
  uptime: process.uptime()
}));

app.get('/api/metrics', (req, res) => {
  res.json({
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage(),
    timestamp: new Date().toISOString()
  });
});

// 5. Routes definitions (ordered properly)
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/products', inventoryOrderWriteLimiter, productsRouter);
app.use('/api/orders', inventoryOrderWriteLimiter, ordersRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/shopkeepers', shopkeepersRouter);
app.use('/api/complaints', complaintsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/charts', chartsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/users', usersRouter);

// 404 Handler - Forward to global error handler
app.use((req, res, next) => {
  next(AppError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
});

// Central Error Handler Middleware
app.use(errorHandler);

async function start() {
  await connectDB();
  app.listen(PORT, () => logger.info(`API running on http://localhost:${PORT}`));
}

if (process.env.NODE_ENV !== 'test') {
  start().catch(err => {
    logger.error(`Failed to start server: ${err.message}`, { error: err });
    process.exit(1);
  });
}

export default app;
