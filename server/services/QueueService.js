import logger from '../utils/logger.js';

// BullMQ/Redis is optional. If Redis is not running, queues are disabled
// and jobs are processed inline (direct call, no queue).
let Queue, Worker, IORedis;
let connection = null;
let notificationQueueInstance = null;
let reportQueueInstance = null;
let redisAvailable = false;

async function initRedisQueue() {
  const redisUri = process.env.REDIS_URI || process.env.REDIS_URL;
  // Only attempt Redis if REDIS_URI is explicitly configured
  if (!redisUri) {
    logger.info('No REDIS_URI set. BullMQ queues are disabled (running in direct-call mode).');
    return;
  }

  try {
    ({ default: IORedis } = await import('ioredis'));
    ({ Queue, Worker } = await import('bullmq'));

    connection = new IORedis(redisUri, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    });

    connection.on('error', (err) => {
      if (redisAvailable) {
        logger.warn('Redis queue connection lost: ' + err.message);
        redisAvailable = false;
      }
    });

    connection.on('connect', () => {
      logger.info('Redis queue connection established ✓');
      redisAvailable = true;
    });

    await connection.connect();

    notificationQueueInstance = new Queue('notifications', { connection });
    reportQueueInstance = new Queue('reports', { connection });
    redisAvailable = true;
    logger.info('BullMQ queues initialised ✓');
  } catch (err) {
    logger.warn('BullMQ unavailable (Redis not reachable). Running in direct-call mode: ' + err.message);
    connection = null;
    redisAvailable = false;
  }
}

// Lazy-init on first use
let _initPromise = null;
function ensureInit() {
  if (!_initPromise) _initPromise = initRedisQueue();
  return _initPromise;
}

/** Add a job to the notification queue, or call directly if Redis is down */
export async function enqueueNotification(data) {
  await ensureInit();
  if (redisAvailable && notificationQueueInstance) {
    await notificationQueueInstance.add('send', data);
  } else {
    // Inline execution
    try {
      const NotificationService = (await import('./NotificationService.js')).default;
      const { payload, userIds, role, session } = data;
      await NotificationService.sendDirect(payload, userIds, role, session);
    } catch (err) {
      logger.error('Inline notification failed: ' + err.message);
    }
  }
}

export function initWorkers() {
  ensureInit().then(() => {
    if (!redisAvailable || !connection) {
      logger.info('Workers skipped (Redis not available).');
      return;
    }

    const notificationWorker = new Worker('notifications', async job => {
      logger.info(`Processing notification job ${job.id}`);
      const { payload, userIds, role, session } = job.data;
      const NotificationService = (await import('./NotificationService.js')).default;
      await NotificationService.sendDirect(payload, userIds, role, session);
    }, { connection });

    notificationWorker.on('failed', (job, err) => {
      logger.error(`Notification job ${job?.id} failed: ${err.message}`);
    });

    const reportWorker = new Worker('reports', async job => {
      logger.info(`Processing report job ${job.id}`);
      // Future: heavy Excel/PDF generation
    }, { connection });

    reportWorker.on('failed', (job, err) => {
      logger.error(`Report job ${job?.id} failed: ${err.message}`);
    });

    logger.info('BullMQ workers started ✓');
  }).catch(err => {
    logger.warn('Worker init failed: ' + err.message);
  });
}

export async function closeQueues() {
  try {
    if (notificationQueueInstance) await notificationQueueInstance.close();
    if (reportQueueInstance) await reportQueueInstance.close();
    if (connection) {
      connection.disconnect();
      connection = null;
    }
  } catch (err) {
    logger.error('Error closing queues: ' + err.message);
  }
}

export function getWorkerStatus() {
  return redisAvailable ? 'running' : 'disabled (no Redis)';
}

// Named exports kept for backward compat
export const notificationQueue = {
  add: async (name, data) => enqueueNotification(data)
};
export const reportQueue = {
  add: async (name, data) => { /* noop */ }
};
