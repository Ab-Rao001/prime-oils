import AuditLog from '../models/AuditLog.js';
import catchAsync from '../utils/catchAsync.js';

class AuditService {
  /**
   * Log an action to the Audit Ledger
   * @param {Object} params
   * @param {mongoose.Types.ObjectId} params.user - User who performed the action
   * @param {string} params.action - The action performed (e.g. 'UPDATE_ORDER')
   * @param {string} params.collectionName - Collection name
   * @param {mongoose.Types.ObjectId} params.documentId - Document ID
   * @param {Object} [params.oldValue] - State before change
   * @param {Object} [params.newValue] - State after change
   * @param {string} [params.ipAddress] - IP Address of request
   * @param {mongoose.ClientSession} [params.session] - MongoDB Transaction session
   */
  static async log(params) {
    try {
      const entry = [
        {
          user: params.user,
          action: params.action,
          collectionName: params.collectionName,
          documentId: params.documentId,
          oldValue: params.oldValue || null,
          newValue: params.newValue || null,
          ipAddress: params.ipAddress || 'unknown'
        }
      ];

      if (params.session) {
        await AuditLog.create(entry, { session: params.session });
      } else {
        await AuditLog.create(entry[0]);
      }
    } catch (error) {
      console.error('Audit Log Failed to Save:', error.message);
      // We generally do not throw here to prevent bringing down the main transaction,
      // unless strict audit compliance is required.
    }
  }
}

export default AuditService;
