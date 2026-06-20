import { Router } from 'express';
import WarehouseTransfer from '../models/WarehouseTransfer.js';
import StockService from '../services/StockService.js';
import AuditService from '../services/AuditService.js';
import Notification from '../models/Notification.js';
import authenticate from '../middleware/auth.js';
import { requirePermission } from '../utils/permissions.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { runInTransaction } from '../utils/transaction.js';
import { getPagination, getSafeSort } from '../utils/pagination.js';

const router = Router();
router.use(authenticate);

// Get all transfers
router.get('/', catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const sort = getSafeSort(req.query.sort, ['createdAt', 'status'], { createdAt: -1 });

  const filter = {}; // Expand if needed based on roles

  const [docs, total] = await Promise.all([
    WarehouseTransfer.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('fromWarehouse', 'name type')
      .populate('toWarehouse', 'name type')
      .populate('products.productId', 'name sku')
      .populate('createdBy approvedBy', 'name email')
      .lean(),
    WarehouseTransfer.countDocuments(filter)
  ]);

  res.json({
    data: docs,
    pagination: {
      page,
      limit,
      count: total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1,
    }
  });
}));

// Create a transfer request
router.post('/', requirePermission('inventory.write'), catchAsync(async (req, res) => {
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
router.patch('/:id/approve', requirePermission('inventory.write'), catchAsync(async (req, res) => {
  const doc = await runInTransaction(async (session) => {
    // Phase 7: Warehouse Transfer Integrity (OCC)
    const transfer = await WarehouseTransfer.findOneAndUpdate(
      { _id: req.params.id, status: 'REQUESTED' },
      { 
        $set: { status: 'IN_TRANSIT', approvedBy: req.user.id },
        $inc: { __v: 1 }
      },
      { new: true, session }
    );
    
    if (!transfer) {
      const existing = await WarehouseTransfer.findById(req.params.id);
      if (!existing) throw AppError.notFound('Transfer not found');
      throw AppError.conflict(`Cannot approve from status ${existing.status}`);
    }

    // Deduct stock from source 
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
router.patch('/:id/receive', requirePermission('stock.receive'), catchAsync(async (req, res) => {
  const doc = await runInTransaction(async (session) => {
    // Phase 7: Warehouse Transfer Integrity (OCC)
    const transfer = await WarehouseTransfer.findOneAndUpdate(
      { _id: req.params.id, status: 'IN_TRANSIT' },
      { 
        $set: { status: 'COMPLETED', completedAt: new Date() },
        $inc: { __v: 1 }
      },
      { new: true, session }
    );
    
    if (!transfer) {
      const existing = await WarehouseTransfer.findById(req.params.id);
      if (!existing) throw AppError.notFound('Transfer not found');
      throw AppError.conflict(`Must be IN_TRANSIT to receive, current status: ${existing.status}`);
    }

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
