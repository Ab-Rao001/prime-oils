import { Router } from 'express';
import ReturnRequest from '../models/ReturnRequest.js';
import Order from '../models/Order.js';
import StockService from '../services/StockService.js';
import AuditService from '../services/AuditService.js';
import Notification from '../models/Notification.js';
import authenticate from '../middleware/auth.js';
import authorize from '../middleware/authorize.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { runInTransaction } from '../utils/transaction.js';

const router = Router();
router.use(authenticate);

// Get all returns
router.get('/', catchAsync(async (req, res) => {
  const returns = await ReturnRequest.find().sort({ createdAt: -1 })
    .populate('order', 'orderId status')
    .populate('customer', 'name loc phone')
    .populate('products.productId', 'name sku')
    .populate('approvedBy', 'name');
  res.json(returns);
}));

// Create a return request
router.post('/', catchAsync(async (req, res) => {
  const { orderId, customerId, products, reason } = req.body;
  if (!products || products.length === 0) throw AppError.validation('Products are required');

  const created = await runInTransaction(async (session) => {
    const returnReq = await ReturnRequest.create([{
      order: orderId,
      customer: customerId,
      products,
      reason,
      status: 'REQUESTED'
    }], { session });

    await AuditService.log({
      user: req.user.id,
      action: 'CREATE_RETURN_REQUEST',
      collectionName: 'ReturnRequest',
      documentId: returnReq[0]._id,
      newValue: { orderId, reason, products },
      session
    });

    // Notify admins
    await Notification.create([{
        type: 'return',
        msg: `New return request created for order. Reason: ${reason}`,
        date: new Date().toISOString().slice(0, 10)
    }], { session });

    return returnReq[0];
  });

  res.status(201).json(created);
}));

// Step 1: Warehouse / Admin inspects and approves
router.patch('/:id/approve', authorize('admin'), catchAsync(async (req, res) => {
  const { outcome } = req.body; // 'APPROVED' or 'REJECTED'
  if (!['APPROVED', 'REJECTED'].includes(outcome)) throw AppError.validation('Invalid outcome');

  const doc = await runInTransaction(async (session) => {
    const request = await ReturnRequest.findOneAndUpdate(
       { _id: req.params.id, status: { $in: ['REQUESTED', 'INSPECTING'] } },
       { status: outcome, approvedBy: req.user.id },
       { new: true, session }
    );
    if (!request) {
      const existing = await ReturnRequest.findById(req.params.id);
      if (!existing) throw AppError.notFound('Return request not found');
      throw AppError.validation(`Cannot approve request in status ${existing.status}`);
    }

    await AuditService.log({
      user: req.user.id,
      action: `RETURN_REQUEST_${outcome}`,
      collectionName: 'ReturnRequest',
      documentId: request._id,
      session
    });

    return request;
  });

  res.json(doc);
}));

// Step 2: Warehouse physically receives goods
router.patch('/:id/receive', authorize('admin'), catchAsync(async (req, res) => {
  const doc = await runInTransaction(async (session) => {
    const request = await ReturnRequest.findOneAndUpdate(
       { _id: req.params.id, status: 'APPROVED' },
       { status: 'RECEIVED' },
       { new: true, session }
    );
    if (!request) {
      const existing = await ReturnRequest.findById(req.params.id);
      if (!existing) throw AppError.notFound('Return request not found');
      throw AppError.validation(`Must be APPROVED before receiving`);
    }

    // Restore Stock via StockService
    for (const p of request.products) {
      await StockService.moveStock({
         productId: p.productId,
         quantityChanged: p.quantity,
         movementType: 'return', // standard stock return
         referenceDocument: request._id,
         user: req.user.id,
         session
      });
    }

    request.status = 'COMPLETED';
    await request.save({ session });

    await AuditService.log({
      user: req.user.id,
      action: 'RETURN_RECEIVED_AND_RESTORED',
      collectionName: 'ReturnRequest',
      documentId: request._id,
      session
    });

    await Notification.create([{
        type: 'return',
        msg: `Return Request ${request._id} has been physically received and stock restored.`,
        date: new Date().toISOString().slice(0, 10)
    }], { session });

    return request;
  });

  res.json(doc);
}));

export default router;
