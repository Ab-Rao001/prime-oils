import { Router } from 'express';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { runInTransaction } from '../utils/transaction.js';
import authenticate from '../middleware/auth.js';
import { requirePermission } from '../utils/permissions.js';
import validate from '../middleware/validate.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { getPagination, getSafeSort } from '../utils/pagination.js';
import { createPurchaseOrderSchema, updatePurchaseOrderSchema } from '../validators/purchaseOrder.validator.js';
import StockService from '../services/StockService.js';
import AuditService from '../services/AuditService.js';

const router = Router();

router.use(authenticate);

// Get all POs
router.get('/', requirePermission('inventory.read'), catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const sort = getSafeSort(req.query.sort, ['createdAt', 'poId', 'totalAmount', 'status'], { createdAt: -1 });

  const filter = { isDeleted: { $ne: true } };
  if (req.user.role === 'supplier') {
    filter.supplier = req.user.id;
  }

  const [docs, total] = await Promise.all([
    PurchaseOrder.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('supplier', 'name email')
      .populate('items.productId', 'name sku')
      .lean(),
    PurchaseOrder.countDocuments(filter)
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

// Create PO
router.post('/', requirePermission('inventory.write'), validate(createPurchaseOrderSchema), catchAsync(async (req, res) => {
  const count = await PurchaseOrder.countDocuments();
  const poId = `PO-${String(count + 1).padStart(4, '0')}`;

  const { items, supplier, notes } = req.validatedBody;
  
  let supplierId = supplier;
  if (supplier && !supplier.match(/^[0-9a-fA-F]{24}$/)) {
    const u = await User.findOne({ name: supplier, role: 'supplier' });
    if (!u) throw AppError.validation(`Supplier not found: ${supplier}`);
    supplierId = u._id;
  }

  // Pre-calculate totals and fetch product names
  let totalAmount = 0;
  const enrichedItems = [];
  for (const item of items) {
    const p = await Product.findById(item.productId);
    if (!p) throw AppError.validation(`Product not found: ${item.productId}`);
    const totalCost = item.quantity * item.unitCost;
    totalAmount += totalCost;
    enrichedItems.push({
      productId: p._id,
      productName: p.name,
      quantity: item.quantity,
      unitCost: item.unitCost,
      totalCost
    });
  }

  const newPO = await PurchaseOrder.create({
    poId,
    supplier: supplierId,
    items: enrichedItems,
    totalAmount,
    status: 'pending',
    notes
  });

  const populated = await PurchaseOrder.findById(newPO._id).populate('supplier', 'name email');

  await AuditService.log({
    user: req.user.id,
    action: 'CREATE_PURCHASE_ORDER',
    collectionName: 'PurchaseOrder',
    documentId: newPO._id,
    newValue: { poId: newPO.poId, totalAmount }
  });

  res.status(201).json(populated);
}));

// Mark PO as received (Stock In)
router.patch('/:id/receive', requirePermission('stock.receive'), catchAsync(async (req, res) => {
  const doc = await runInTransaction(async (session) => {
    const po = await PurchaseOrder.findById(req.params.id).session(session);
    if (!po) throw AppError.notFound('Purchase Order not found');
    
    if (po.status === 'received') {
      throw AppError.validation('Purchase Order has already been received');
    }
    if (po.status === 'cancelled') {
      throw AppError.validation('Cannot receive a cancelled Purchase Order');
    }

    // Process Stock In and update costPrice using StockService
    for (const item of po.items) {
      await StockService.moveStock({
        productId: item.productId,
        quantityChanged: item.quantity,
        movementType: 'purchase',
        referenceDocument: po._id,
        user: req.user.id,
        session,
        unitCost: item.unitCost
      });
    }

    po.status = 'received';
    po.receivedDate = new Date();
    await po.save({ session });

    await AuditService.log({
      user: req.user.id,
      action: 'UPDATE_PURCHASE_ORDER_STATUS',
      collectionName: 'PurchaseOrder',
      documentId: po._id,
      oldValue: { status: 'pending' },
      newValue: { status: 'received' },
      session
    });

    return po;
  });

  const populated = await PurchaseOrder.findById(doc._id).populate('supplier', 'name').populate('items.productId');
  res.json(populated);
}));

// Update PO details (like cancelling)
router.patch('/:id', requirePermission('inventory.write'), validate(updatePurchaseOrderSchema), catchAsync(async (req, res) => {
  const updates = req.validatedBody;
  
  if (updates.status === 'received') {
      throw AppError.validation('Use the /receive endpoint to process a receipt');
  }

  const po = await PurchaseOrder.findById(req.params.id);
  if (!po) throw AppError.notFound('Purchase Order not found');

  if (po.status === 'received') {
      throw AppError.validation('Cannot modify a received Purchase Order');
  }

  Object.assign(po, updates);
  await po.save();

  await AuditService.log({
    user: req.user.id,
    action: 'UPDATE_PURCHASE_ORDER',
    collectionName: 'PurchaseOrder',
    documentId: po._id,
    newValue: updates
  });

  const populated = await PurchaseOrder.findById(po._id).populate('supplier', 'name');
  res.json(populated);
}));

export default router;
