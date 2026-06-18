/**
 * @fileoverview Custom Error Classes for Consistent Error Handling
 * 
 * Defines application-specific error types that can be caught and handled
 * uniformly by the errorHandler middleware.
 * 
 * This allows for clean error propagation and meaningful HTTP status codes.
 * 
 * @module utils/errors
 */

/**
 * Base application error class
 * All custom errors extend this for consistent handling
 * 
 * @class AppError
 * @extends {Error}
 */
import AppError from './AppError.js';

export { AppError };

/**
 * 400 Bad Request
 * Used for invalid input, malformed requests
 * 
 * @class ValidationError
 * @extends {AppError}
 */
export class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

/**
 * 401 Unauthorized
 * Used when authentication fails (missing/invalid token)
 * 
 * @class UnauthorizedError
 * @extends {AppError}
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * 403 Forbidden
 * Used when user lacks required permissions
 * 
 * @class ForbiddenError
 * @extends {AppError}
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * 404 Not Found
 * Used when resource doesn't exist
 * 
 * @class NotFoundError
 * @extends {AppError}
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * 409 Conflict
 * Used for duplicate entries, state conflicts
 * 
 * @class ConflictError
 * @extends {AppError}
 */
export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * 429 Too Many Requests
 * Used when rate limit exceeded
 * 
 * @class RateLimitError
 * @extends {AppError}
 */
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests. Please try again later.') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

/**
 * 500 Internal Server Error
 * Generic server error (should log these)
 * 
 * @class InternalServerError
 * @extends {AppError}
 */
export class InternalServerError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500, 'INTERNAL_ERROR');
  }
}

export default AppError;
