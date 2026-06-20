import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import config from '../config/env.js';
import NotificationService from './NotificationService.js';
import logger from '../utils/logger.js';

const redisConfig = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
};

let connection;

try {
  connection = new IORedis(config.redisUri || 'redis://localhost:6379', redisConfig);
} catch (e) {
  logger.warn('Failed to connect to Redis for BullMQ: ' + e.message);
}

export const notificationQueue = new Queue('notifications', { connection });
export const reportQueue = new Queue('reports', { connection });

export function initWorkers() {
  if (!connection) return;

  const notificationWorker = new Worker('notifications', async job => {
    logger.info(`Processing notification job ${job.id}`);
    const { payload, userIds, role, session } = job.data;
    // Actually sending the notification (bypassing the queue to prevent infinite loops)
    await NotificationService.sendDirect(payload, userIds, role, session);
  }, { connection });

  notificationWorker.on('failed', (job, err) => {
    logger.error(`Notification job ${job.id} failed with error ${err.message}`);
  });

  const reportWorker = new Worker('reports', async job => {
    logger.info(`Processing report job ${job.id}`);
    // Future implementation for heavy Excel/PDF generation
  }, { connection });

  reportWorker.on('failed', (job, err) => {
    logger.error(`Report job ${job.id} failed with error ${err.message}`);
  });
}
