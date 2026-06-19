import ApprovalRequest from '../models/ApprovalRequest.js';
import AuditService from './AuditService.js';

class ApprovalService {
  /**
   * Request approval for a restricted action
   * @param {Object} params
   * @param {mongoose.Types.ObjectId} params.requester
   * @param {string} params.type - e.g. 'CREDIT_LIMIT_EXCEEDED'
   * @param {mongoose.Types.ObjectId} params.referenceDocument
   * @param {string} params.collectionName
   * @param {Object} params.details - JSON context
   * @param {mongoose.ClientSession} [params.session]
   */
  static async requestApproval(params) {
    const entry = [{
      requester: params.requester,
      type: params.type,
      referenceDocument: params.referenceDocument,
      collectionName: params.collectionName,
      status: 'pending',
      details: params.details
    }];

    const existingReq = params.session
      ? await ApprovalRequest.findOne({ referenceDocument: params.referenceDocument, type: params.type, status: 'pending' }).session(params.session)
      : await ApprovalRequest.findOne({ referenceDocument: params.referenceDocument, type: params.type, status: 'pending' });
    
    if (existingReq) {
      return params.session ? [existingReq] : existingReq;
    }

    const req = params.session 
      ? await ApprovalRequest.create(entry, { session: params.session })
      : await ApprovalRequest.create(entry[0]);

    const createdId = params.session ? req[0]._id : req._id;

    await AuditService.log({
      user: params.requester,
      action: 'APPROVAL_REQUESTED',
      collectionName: 'ApprovalRequest',
      documentId: createdId,
      newValue: { type: params.type },
      session: params.session
    });

    return req;
  }
}

export default ApprovalService;
