import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const WEAK_JWT_SECRETS = new Set(['default_secret', 'secret']);
const MIN_JWT_SECRET_LENGTH = 32;

const LOCALHOST_MONGO_RE =
  /mongodb(\+srv)?:\/\/(?:[^@/]*@)?(localhost|127\.0\.0\.1|\[::1\])(?::|\/|$)/i;

function fail(message) {
  const err = new Error(message);
  err.name = 'ConfigError';
  throw err;
}

function assertSecret(raw, name) {
  if (!raw || typeof raw !== 'string') {
    fail(
      `FATAL: ${name} is required. Set a cryptographically random string of at least 32 characters in your .env file.`
    );
  }

  const secret = raw.trim();

  if (secret.length < MIN_JWT_SECRET_LENGTH) {
    fail(
      `FATAL: ${name} must be at least ${MIN_JWT_SECRET_LENGTH} characters (got ${secret.length}).`
    );
  }

  if (WEAK_JWT_SECRETS.has(secret)) {
    fail(
      `FATAL: ${name} is a known weak placeholder ("default_secret" / "secret"). Generate a strong random secret (min 32 characters).`
    );
  }

  return secret;
}

function resolveMongoUri() {
  const uri = (process.env.MONGODB_URI || process.env.MONGO_URI || '').trim();
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  const isTest = nodeEnv === 'test';

  if (isProduction) {
    if (!uri) {
      fail(
        'FATAL: MONGODB_URI is required in production. Set a hosted MongoDB connection string (MONGO_URI is also accepted for backward compatibility).'
      );
    }
    if (LOCALHOST_MONGO_RE.test(uri)) {
      fail(
        'FATAL: MONGODB_URI must not point to localhost or 127.0.0.1 in production. Use a hosted MongoDB cluster.'
      );
    }
    return uri;
  }

  if (isTest) {
    return uri || 'mongodb://127.0.0.1:27017/prime_oils_test';
  }

  return uri || 'mongodb+srv://db_user:password@cluster.mongodb.net/prime_oils';
}

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  jwtSecret: assertSecret(process.env.JWT_SECRET, 'JWT_SECRET'),
  refreshTokenSecret: assertSecret(process.env.REFRESH_TOKEN_SECRET, 'REFRESH_TOKEN_SECRET'),
  jwtExpire: process.env.JWT_EXPIRE || '24h',
  refreshTokenExpire: process.env.REFRESH_TOKEN_EXPIRE || '7d',
  mongodbUri: resolveMongoUri(),
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
};

export default config;
