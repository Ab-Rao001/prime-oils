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
    serverSelectionTimeoutMS: 5000,
    family: 4 // Use IPv4, skip trying IPv6 first
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

  // Global Observability for Slow Queries
  mongoose.set('debug', function (collectionName, methodName, ...methodArgs) {
    const startTime = Date.now();
    // Wrap the callback if present, or we just log the invocation
    const cb = methodArgs[methodArgs.length - 1];
    
    // We can't perfectly time unless we patch methods, but we can log failed connections
    const queryStr = methodArgs
      .map(arg => {
        try { return typeof arg === 'object' ? JSON.stringify(arg) : String(arg); } 
        catch { return '[Object]'; }
      }).join(' ');

    if (process.env.NODE_ENV !== 'production') {
      logger.debug(`Mongoose: ${collectionName}.${methodName}(${queryStr})`);
    }
  });

  // Attach a global plugin to log slow queries
  mongoose.plugin((schema) => {
    const methods = ['find', 'findOne', 'findOneAndUpdate', 'insertMany', 'save', 'updateMany', 'deleteOne', 'deleteMany', 'aggregate'];
    
    methods.forEach(method => {
      schema.pre(method, function() {
        this.startTime = Date.now();
      });
      schema.post(method, function(docs, next) {
        const duration = Date.now() - this.startTime;
        if (duration > 200) {
          logger.warn(`SLOW QUERY [${duration}ms]: ${this.mongooseCollection?.name}.${method}`, {
            duration,
            query: this._conditions ? JSON.stringify(this._conditions) : '',
            collection: this.mongooseCollection?.name,
            operation: method
          });
        }
        if (next) next();
      });
    });
  });
}
