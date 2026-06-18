import AppError from '../utils/AppError.js';

/**
 * Role-Based Authorization Middleware.
 * Accepts (...roles) as arguments.
 * Returns 403 JSON { success: false, message: "Forbidden" } if req.user.role is not in roles.
 */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(AppError.forbidden());
    }
    next();
  };
}

export default authorize;
