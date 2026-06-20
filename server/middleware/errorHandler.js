import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  let error = err;

  // 1. Log error details using Winston
  logger.error({
    message: err.message || 'Unknown server error',
    statusCode: err.statusCode || 500,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // 2. Handle specific Mongoose/MongoDB errors
  
  // Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    const message = `Invalid value for path: ${err.path}`;
    error = AppError.validation(message, 'CAST_ERROR');
  }

  // Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(el => el.message).join(', ');
    error = AppError.validation(message, 'VALIDATION_ERROR');
  }

  // MongoDB Duplicate Key Error (11000)
  if (err.code === 11000) {
    const value = err.errmsg ? (err.errmsg.match(/(["'])(\\?.)*?\1/) || [''])[0] : '';
    const message = `Duplicate field value: ${value || 'already exists'}. Please use another value.`;
    error = new AppError(message, 409, 'DUPLICATE_KEY_ERROR');
  }

  // ZodError fallback
  if (err.name === 'ZodError') {
    const message = err.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ');
    error = AppError.validation(message, 'VALIDATION_ERROR');
  }

  // If the error is not an AppError, convert to general Internal Server Error
  if (!(error instanceof AppError)) {
    error = AppError.internal('Something went wrong. Please try again later.');
  }

  // 3. Handle 401 errors
  // JWT-specific errors get a generic message (don't leak token details)
  if (err.name === 'UnauthorizedError' || err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'fail',
      message: 'Authentication required'
    });
  }
  // AppError 401s (e.g. INVALID_CREDENTIALS) pass their real message through to the client
  if (error.statusCode === 401) {
    return res.status(401).json({
      status: 'fail',
      message: error.message || 'Authentication required'
    });
  }

  if (error.statusCode === 403) {
    return res.status(403).json({
      status: 'fail',
      message: 'Access denied'
    });
  }

  if (error.statusCode === 404) {
    return res.status(404).json({
      status: 'fail',
      message: 'Resource not found'
    });
  }

  if (error.statusCode === 400 || error.statusCode === 422 || error.statusCode === 409) {
    return res.status(error.statusCode).json({
      status: 'fail',
      message: error.message || 'Invalid request'
    });
  }

  if (error.statusCode === 429) {
    return res.status(429).json({
      status: 'error',
      message: 'Too many requests. Please try again later.'
    });
  }

  // 4. Construct and send standard 500 response
  // We explicitly log full details above, but NEVER expose them to the client
  res.status(500).json({
    status: 'error',
    message: 'An unexpected server error occurred'
  });
}

export default errorHandler;
