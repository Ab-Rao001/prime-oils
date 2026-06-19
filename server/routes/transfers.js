import { Router } from 'express';
import WarehouseTransfer from '../models/WarehouseTransfer.js';
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

// Get all transfers
router.get('/', catchAsync(async (req, res) => {
  const docs = await WarehouseTransfer.find().sort({ createdAt: -1 })
    .populate('fromWarehouse', 'name type')
    .populate('toWarehouse', 'name type')
    .populate('products.productId', 'name sku')
    .populate('createdBy approvedBy', 'name email');
  res.json(docs);
}));

// Create a transfer request
router.post('/', authorize('admin', 'supplier'), catchAsync(async (req, res) => {
  const { fromWarehouse, toWarehouse, products } = req.body;
  if (!products || products.length === 0) throw AppError.validation('Products are required');

  const created = await runInTransaction(async (session) => {
    const transfer = await WarehouseTransfer.create([{
      fromWarehouse,
      toWarehouse,
      products,
      status: 'REQUESTED',
      createdBy: req.user.id
    }], { session });

    await AuditService.log({
      user: req.user.id,
      action: 'CREATE_TRANSFER_REQUEST',
      collectionName: 'WarehouseTransfer',
      documentId: transfer[0]._id,
      session
    });

    return transfer[0];
  });

  res.status(201).json(created);
}));

// Approve and Dispatch (Deduct from source)
router.patch('/:id/approve', authorize('admin'), catchAsync(async (req, res) => {
  const doc = await runInTransaction(async (session) => {
    const transfer = await WarehouseTransfer.findById(req.params.id).session(session);
    if (!transfer) throw AppError.notFound('Transfer not found');
    if (transfer.status !== 'REQUESTED') throw AppError.validation(`Cannot approve from status ${transfer.status}`);

    transfer.status = 'APPROVED';
    transfer.approvedBy = req.user.id;
    
    // Move immediately to IN_TRANSIT
    transfer.status = 'IN_TRANSIT';

    // Deduct stock from source (Since we only track global stock in Product right now, 
    // a true multi-warehouse system would deduct from the specific warehouse stock collection.
    // For this simulation, we'll log it as transfer_out globally, but this is academic).
    // In a real system: update fromWarehouse stock.
    for (const p of transfer.products) {
        await StockService.moveStock({
            productId: p.productId,
            quantityChanged: -p.quantity, // deduction
            movementType: 'transfer_out',
            referenceDocument: transfer._id,
            user: req.user.id,
            session
        });
    }

    await transfer.save({ session });

    await AuditService.log({
      user: req.user.id,
      action: 'APPROVE_AND_DISPATCH_TRANSFER',
      collectionName: 'WarehouseTransfer',
      documentId: transfer._id,
      session
    });

    await Notification.create([{
        type: 'inventory',
        msg: `Warehouse transfer approved and in-transit.`,
        date: new Date().toISOString().slice(0, 10)
    }], { session });

    return transfer;
  });

  res.json(doc);
}));

// Receive at destination (Add to destination)
router.patch('/:id/receive', authorize('admin', 'supplier'), catchAsync(async (req, res) => {
  const doc = await runInTransaction(async (session) => {
    const transfer = await WarehouseTransfer.findById(req.params.id).session(session);
    if (!transfer) throw AppError.notFound('Transfer not found');
    if (transfer.status !== 'IN_TRANSIT') throw AppError.validation(`Must be IN_TRANSIT to receive`);

    transfer.status = 'RECEIVED';
    transfer.completedAt = new Date();
    
    // Add stock to destination
    for (const p of transfer.products) {
        await StockService.moveStock({
            productId: p.productId,
            quantityChanged: p.quantity, // addition
            movementType: 'transfer_in',
            referenceDocument: transfer._id,
            user: req.user.id,
            session
        });
    }

    transfer.status = 'COMPLETED';
    await transfer.save({ session });

    await AuditService.log({
      user: req.user.id,
      action: 'RECEIVE_TRANSFER',
      collectionName: 'WarehouseTransfer',
      documentId: transfer._id,
      session
    });

    await Notification.create([{
        type: 'inventory',
        msg: `Warehouse transfer received and completed.`,
        date: new Date().toISOString().slice(0, 10)
    }], { session });

    return transfer;
  });

  res.json(doc);
}));

export default router;
