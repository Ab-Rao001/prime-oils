import morgan from 'morgan';
import logger from '../utils/logger.js';

// Format: reqId, method, url, status, response-time, content-length
const morganFormat = '[:req[x-request-id]] :method :url :status :response-time ms - :res[content-length]';

export const requestLogger = morgan(morganFormat, { 
  stream: {
    write: (message) => {
      const msgStr = message.trim();
      const timeMatch = msgStr.match(/(\d+(?:\.\d+)?) ms/);
      if (timeMatch) {
        const timeMs = parseFloat(timeMatch[1]);
        let perfLevel = 'Normal';
        if (timeMs > 1000) {
          perfLevel = 'Critical';
          logger.error(`[PERFORMANCE CRITICAL] Slow endpoint: ${msgStr}`);
        } else if (timeMs > 200) {
          perfLevel = 'Slow';
          logger.warn(`[PERFORMANCE SLOW] ${msgStr}`);
        } else {
          logger.info(`[PERFORMANCE NORMAL] ${msgStr}`);
        }
      } else {
        logger.info(msgStr);
      }
    }
  } 
});

export default requestLogger;
