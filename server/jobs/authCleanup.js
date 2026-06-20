import Session from '../models/Session.js';
import logger from '../utils/logger.js';

export function setupAuthCleanupJob() {
  // Simple periodic cleanup
  setInterval(async () => {
    try {
      await Session.deleteMany({ expiresAt: { $lt: new Date() } });
      logger.info('Cleaned up expired sessions');
    } catch (e) {
      logger.error('Failed to cleanup sessions: ' + e.message);
    }
  }, 1000 * 60 * 60 * 24); // daily
}
