import morgan from 'morgan';
import logger from '../utils/logger.js';

// Wire Morgan stream to Winston info level logging
const stream = {
  write: (message) => logger.info(message.trim()),
};

// Format: reqId, method, url, status, response-time, content-length
const morganFormat = '[:req[x-request-id]] :method :url :status :response-time ms - :res[content-length]';

export const requestLogger = morgan(morganFormat, { stream });

export default requestLogger;
