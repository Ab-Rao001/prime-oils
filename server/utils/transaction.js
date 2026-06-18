import mongoose from 'mongoose';
import logger from './logger.js';

/**
 * Executes a operations function within a Mongoose/MongoDB database transaction.
 * Automatically handles starting a session, beginning the transaction, committing upon success,
 * aborting/rolling back upon failure, and releasing the session back to the pool.
 * 
 * @param {Function} operationsFn - Async function to run inside the transaction. Receives the session object.
 * @returns {Promise<any>} The result of operationsFn.
 */
export async function runInTransaction(operationsFn) {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const result = await operationsFn(session);
    await session.commitTransaction();
    return result;
  } catch (err) {
    if (session) {
      try {
        await session.abortTransaction();
      } catch (abortErr) {
        // Suppress abort errors if transaction failed to start
      }
    }
    
    // Check if error is due to unsupported transactions on standalone server
    if (err.message.includes('replica set member') || err.message.includes('Transaction numbers') || err.codeName === 'TransactionOutcomeUnknown') {
      logger.warn('MongoDB Transactions not supported by standalone server. Running operations non-transactionally.');
      return await operationsFn(null);
    }
    throw err;
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}
