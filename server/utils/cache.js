/**
 * Caching layer for Prime Oil Suppliers.
 * Dynamically connects to Redis if package is installed and REDIS_URI is configured.
 * Falls back to an in-memory TTL cache with support for pattern-based deletion (wildcards).
 */

import logger from './logger.js';

export let redisClient = null;
export let isRedisConnected = false;

// In-Memory cache fallback with TTL support
class MemoryCache {
  constructor() {
    this.cache = new Map();
    // Cleanup interval to prevent memory leaks from expired unaccessed keys
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.cache.entries()) {
        if (now > item.expiry) {
          this.cache.delete(key);
        }
      }
    }, 60000); // Check every minute
    // Unref the interval so it doesn't prevent Node from exiting
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  set(key, value, ttlSeconds = 300) {
    this.cache.set(key, {
      value,
      expiry: Date.now() + (ttlSeconds * 1000)
    });
  }

  del(pattern) {
    if (pattern.includes('*')) {
      const regexStr = '^' + pattern.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/\\\*/g, '.*') + '$';
      const regex = new RegExp(regexStr);
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.delete(pattern);
    }
  }

  clear() {
    this.cache.clear();
  }
}

const localCache = new MemoryCache();

async function initRedis() {
  const redisUri = process.env.REDIS_URI || process.env.REDIS_URL;
  if (!redisUri) {
    logger.info('No REDIS_URI environment variable detected. Running cache in in-memory mode.');
    return;
  }

  try {
    // Dynamic import to prevent crash if 'redis' is not installed
    const redis = await import('redis');
    redisClient = redis.createClient({ url: redisUri });

    redisClient.on('error', (err) => {
      logger.warn(`Redis client error: ${err.message}`);
      isRedisConnected = false;
    });

    redisClient.on('connect', () => {
      logger.info('Redis caching client connected successfully ✓');
      isRedisConnected = true;
    });

    await redisClient.connect();
  } catch (err) {
    logger.warn('Could not load/connect Redis client. Caching layer is running in in-memory fallback mode.');
    redisClient = null;
    isRedisConnected = false;
  }
}

// Initialize Redis asynchronously
initRedis();

export const cache = {
  /**
   * Fetch item from cache.
   * @param {string} key 
   * @returns {Promise<any>}
   */
  async get(key) {
    if (isRedisConnected && redisClient) {
      try {
        const val = await redisClient.get(key);
        return val ? JSON.parse(val) : null;
      } catch (err) {
        logger.error(`Redis get error: ${err.message}`, { error: err });
      }
    }
    return localCache.get(key);
  },

  /**
   * Store item in cache.
   * @param {string} key 
   * @param {any} value 
   * @param {number} ttlSeconds 
   */
  async set(key, value, ttlSeconds = 300) {
    if (isRedisConnected && redisClient) {
      try {
        await redisClient.set(key, JSON.stringify(value), {
          EX: ttlSeconds
        });
        return;
      } catch (err) {
        logger.error(`Redis set error: ${err.message}`, { error: err });
      }
    }
    localCache.set(key, value, ttlSeconds);
  },

  /**
   * Delete items from cache by exact key or pattern (e.g. 'products:*').
   * @param {string} pattern 
   */
  async del(pattern) {
    if (isRedisConnected && redisClient) {
      try {
        if (pattern.includes('*')) {
          const keys = await redisClient.keys(pattern);
          if (keys.length > 0) {
            await redisClient.del(keys);
          }
        } else {
          await redisClient.del(pattern);
        }
        return;
      } catch (err) {
        logger.error(`Redis del error: ${err.message}`, { error: err });
      }
    }
    localCache.del(pattern);
  }
};
