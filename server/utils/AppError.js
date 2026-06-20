export class AppError extends Error {
  constructor(message, statusCode, code = 'APP_ERROR', isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    
    Error.captureStackTrace(this, this.constructor);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND') {
    return new AppError(message, 404, code, true);
  }

  static forbidden(message = 'Access denied', code = 'FORBIDDEN') {
    return new AppError(message, 403, code, true);
  }

  static validation(message = 'Validation failed', code = 'VALIDATION_ERROR') {
    return new AppError(message, 400, code, true);
  }

  static conflict(message = 'Conflict', code = 'CONFLICT') {
    return new AppError(message, 409, code, true);
  }

  static internal(message = 'Internal server error', code = 'INTERNAL_ERROR') {
    return new AppError(message, 500, code, false);
  }
}

export default AppError;
