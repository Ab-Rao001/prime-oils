import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';

/**
 * Role-Based Authorization Middleware.
 * Accepts (...roles) as arguments.
 * Returns 403 JSON { success: false, message: "Forbidden" } if req.user.role is not in roles.
 */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      logger.error(`[SECURITY CRITICAL] PERMISSION VIOLATION: User ${req.user?.id || 'anonymous'} with role ${req.user?.role || 'none'} attempted to access ${req.originalUrl} requiring ${roles.join(',')}`);
      return next(AppError.forbidden());
    }
    next();
  };
}

export default authorize;
