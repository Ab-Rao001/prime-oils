import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';

const handler = (req, res, next, options) => {
  const isAuth = req.originalUrl.includes('/auth');
  const level = isAuth ? 'error' : 'warn';
  const prefix = isAuth ? '[SECURITY CRITICAL] BRUTE FORCE ATTEMPT:' : '[SECURITY WARN] Rate limit exceeded:';
  
  logger[level](`${prefix} ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    endpoint: req.originalUrl,
    method: req.method,
    userId: req.user?.id || 'anonymous',
    reason: isAuth ? 'BRUTE_FORCE_DETECTED' : 'RATE_LIMIT_EXCEEDED'
  });
  
  res.status(429).json({
    status: 'error',
    message: 'Too many requests. Please try again later.'
  });
};

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

export const paymentsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

export const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

export const returnsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});
