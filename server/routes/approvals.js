import { Router } from 'express';
import ApprovalRequest from '../models/ApprovalRequest.js';
import Order from '../models/Order.js';
import authenticate from '../middleware/auth.js';
import authorize from '../middleware/authorize.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import AuditService from '../services/AuditService.js';
import { runInTransaction } from '../utils/transaction.js';

const router = Router();

router.use(authenticate);
router.use(authorize('admin')); // Only admins can handle approvals

// GET all approval requests
router.get('/', catchAsync(async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status) filter.status = status;

  const requests = await ApprovalRequest.find(filter)
    .populate('requester', 'name email')
    .populate('approver', 'name email')
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, data: requests });
}));

// Resolve an approval request
router.post('/:id/resolve', catchAsync(async (req, res) => {
  const { status, comments } = req.body;
  
  if (!['approved', 'rejected'].includes(status)) {
    throw AppError.validation('Status must be approved or rejected');
  }

  const result = await runInTransaction(async (session) => {
    const approvalReq = await ApprovalRequest.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { status, comments: comments || '', approver: req.user.id, resolvedAt: new Date() },
      { new: true, session }
    );

    if (!approvalReq) throw AppError.validation(`Approval request is no longer pending or does not exist`);

    // Handle Order Workflow Unblocking
    if (approvalReq.collectionName === 'Order') {
      const order = await Order.findById(approvalReq.referenceDocument).session(session);
      
      if (!order || order.isDeleted) {
        approvalReq.status = 'INVALID';
        await approvalReq.save({ session });
        await AuditService.log({
          user: req.user.id,
          action: 'INVALID_APPROVAL_TARGET',
          collectionName: 'ApprovalRequest',
          documentId: approvalReq._id,
          details: 'Target document was deleted or does not exist',
          session
        });
        throw AppError.validation('Cannot resolve approval: Target order has been deleted.');
      }

      if (order.status === 'pending_approval') {
        if (status === 'approved') {
          // Deduct stock now!
          const { default: StockService } = await import('../services/StockService.js');
          for (const item of order.lineItems) {
            await StockService.moveStock({
              productId: item.productId,
              quantityChanged: -Number(item.quantity),
              movementType: 'CREDIT_APPROVED_SALE',
              referenceDocument: order._id,
              user: req.user.id,
              session
            });
          }
          order.status = 'pending';
        } else {
          // Rejected, order is cancelled. Stock was never deducted, so no need to return.
          order.status = 'cancelled';
        }
        await order.save({ session });

        await AuditService.log({
          user: req.user.id,
          action: 'UPDATE_ORDER_STATUS',
          collectionName: 'Order',
          documentId: order._id,
          oldValue: { status: 'pending_approval' },
          newValue: { status: order.status },
          session
        });
      }
    }

    await AuditService.log({
      user: req.user.id,
      action: 'RESOLVE_APPROVAL',
      collectionName: 'ApprovalRequest',
      documentId: approvalReq._id,
      newValue: { status },
      session
    });

    return approvalReq;
  });

  res.json({ success: true, data: result });
}));

export default router;
