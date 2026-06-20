import logger from '../utils/logger.js';

export const securityLogger = (req, res, next) => {
  res.on('finish', () => {
    const statusCode = res.statusCode;

    // We only care about security-related status codes
    if ([401, 403, 429].includes(statusCode)) {
      let reason = 'UNKNOWN_SECURITY_EVENT';
      if (statusCode === 401) reason = 'INVALID_JWT_OR_UNAUTHORIZED';
      if (statusCode === 403) reason = 'FORBIDDEN_ACCESS';
      if (statusCode === 429) reason = 'RATE_LIMIT_VIOLATION';

      // Log the event securely (no passwords, tokens, or PII)
      logger.warn(`Security Event: ${reason}`, {
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userId: req.user?.id || 'anonymous',
        endpoint: req.originalUrl,
        method: req.method,
        reason
      });
    }
  });

  next();
};

export default securityLogger;
