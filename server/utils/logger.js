import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

import DailyRotateFile from 'winston-daily-rotate-file';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { getRequestId, getUserId } from './asyncContext.js';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'service', 'env', 'reqId', 'userId'] }),
  winston.format.printf(({ timestamp, level, message, service, env, reqId, userId, metadata }) => {
    const metaStr = Object.keys(metadata || {}).length ? ` | ${JSON.stringify(metadata)}` : '';
    const ctxId = getRequestId() || reqId || '-';
    const uId = getUserId() || userId || '-';
    return `[${timestamp}] [${level}] [${ctxId}] [User:${uId}]: ${message}${metaStr}`;
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'prime-oil-erp', env: process.env.NODE_ENV || 'development' },
  format: winston.format.combine(
    winston.format((info) => {
      info.reqId = getRequestId() || info.reqId;
      info.userId = getUserId() || info.userId;
      return info;
    })(),
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join(__dirname, '../../logs/error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'error',
    }),
    new DailyRotateFile({
      filename: path.join(__dirname, '../../logs/combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
    })
  ]
});

// Dev environment logs to colorized console transport
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      level: 'debug',
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    })
  );
}

export default logger;
