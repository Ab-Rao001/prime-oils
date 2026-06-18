import mongoose from 'mongoose';
import config from './env.js';
import logger from '../utils/logger.js';

export async function connectDB() {
  const uri = config.mongodbUri;

  const options = {
    maxPoolSize: 100,
    minPoolSize: 10,
    maxIdleTimeMS: 30000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  };

  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connected ✓');
  });

  mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB connection error: ${err.message}`, { error: err });
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  await mongoose.connect(uri, options);

  mongoose.set('debug', (collectionName, methodName, ...methodArgs) => {
    const queryStr = methodArgs
      .map(arg => {
        try {
          return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
        } catch {
          return '[Object]';
        }
      })
      .join(' ');

    if (process.env.NODE_ENV !== 'production') {
      logger.debug(`Mongoose: ${collectionName}.${methodName}(${queryStr})`);
    }
  });
}
