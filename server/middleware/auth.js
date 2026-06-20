import AppError from '../utils/AppError.js';
import { verifyToken } from '../utils/jwt.js';

/**
 * JWT Authentication Middleware.
 * Extracts Bearer token from Authorization header and verifies it.
 * Attaches decoded { id, role, email } to req.user.
 */
import User from '../models/User.js';
import { requestContext } from '../utils/asyncContext.js';

export async function authenticate(req, res, next) {
  try {
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
    }
    const decoded = verifyToken(token);

    const user = await User.findById(decoded.id).select('tokenVersion active status role email isDeleted isLocked lockedUntil').lean();
    if (!user || user.active === false || user.status !== 'active' || user.isDeleted) {
      return next(new AppError('Account is inactive, suspended, or deleted', 401, 'UNAUTHORIZED'));
    }

    if (user.isLocked && user.lockedUntil && user.lockedUntil > new Date()) {
      return next(new AppError('Account is temporarily locked', 401, 'UNAUTHORIZED'));
    }

    if (decoded.tokenVersion !== undefined && user.tokenVersion !== decoded.tokenVersion) {
      return next(new AppError('Session expired. Please login again.', 401, 'UNAUTHORIZED'));
    }

    req.user = {
      id: decoded.id,
      role: user.role, // Use role from DB
      email: user.email,
    };

    // Update AsyncLocalStorage Context with userId
    const store = requestContext.getStore();
    if (store) {
      store.userId = decoded.id;
    }

    next();
  } catch (err) {
    return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
  }
}

export default authenticate;
