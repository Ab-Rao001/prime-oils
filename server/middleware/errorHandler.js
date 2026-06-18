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

  // 3. Construct and send response
  const response = {
    success: false,
    message: error.message,
    code: error.code,
  };

  // Only expose stack trace in non-production mode
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  res.status(error.statusCode || 500).json(response);
}

export default errorHandler;
