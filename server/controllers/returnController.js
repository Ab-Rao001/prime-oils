import StockMovement from '../models/StockMovement.js';
import ReturnRequest from '../models/ReturnRequest.js';
import Order from '../models/Order.js';
import DeliveryItem from '../models/DeliveryItem.js';
import Complaint from '../models/Complaint.js';
import Shopkeeper from '../models/Shopkeeper.js';
import User from '../models/User.js';
import StockService from '../services/StockService.js';
import AuditService from '../services/AuditService.js';
import ReturnSettlementService from '../services/ReturnSettlementService.js';
import NotificationService from '../services/NotificationService.js';
import { formatReturnRequest } from '../utils/format.js';
import { cache } from '../utils/cache.js';
import catchAsync from '../utils/catchAsync.js';
import { getPagination, getSafeSort } from '../utils/pagination.js';
import AppError from '../utils/AppError.js';
import { runInTransaction } from '../utils/transaction.js';
import { getTenantFilter, requireOwnership } from '../utils/tenantScope.js';
import Product from '../models/Product.js';

const ELIGIBLE_ORDER_STATUSES = ['delivered', 'partially_delivered', 'return_requested'];

async function emitReturnStatusChanged(payload) {
  try {
    const { getIO } = await import('../utils/socket.js');
    getIO().emit('RETURN_STATUS_CHANGED', payload);
  } catch {
    // Socket may not be initialized in tests
  }
}

async function emitOrderStatusChanged(payload) {
  try {
    const { getIO } = await import('../utils/socket.js');
    getIO().emit('ORDER_STATUS_CHANGED', payload);
  } catch {
    // Socket may not be initialized in tests
  }
}

async function resolveOrder(orderId, session) {
  if (typeof orderId === 'string' && !orderId.match(/^[0-9a-fA-F]{24}$/)) {
    return Order.findOne({ orderId }).populate('shop').session(session);
  }
  return Order.findById(orderId).populate('shop').session(session);
}

async function getReturnedQtyForProduct(orderId, productId, session, excludeReturnId = null) {
  const filter = {
    order: orderId,
    status: { $nin: ['REJECTED'] },
  };
  if (excludeReturnId) filter._id = { $ne: excludeReturnId };

  const returns = await ReturnRequest.find(filter).session(session);
  return returns.reduce((sum, r) => {
    const line = r.products.find(p => p.productId.toString() === productId.toString());
    return sum + (line?.quantity || 0);
  }, 0);
}

async function getAvailableReturnQty(order, productId, session, excludeReturnId = null) {
  const deliveryItem = await DeliveryItem.findOne({ order: order._id, product: productId }).session(session);
  if (deliveryItem) {
    const alreadyReturned = await getReturnedQtyForProduct(order._id, productId, session, excludeReturnId);
    const delivered = deliveryItem.deliveredQuantity || 0;
    const reserved = deliveryItem.returnedQuantity || 0;
    return Math.max(0, delivered - reserved + (excludeReturnId ? 0 : 0));
  }

  const lineItem = (order.lineItems || []).find(li => li.productId.toString() === productId.toString());
  if (!lineItem) return 0;

  const alreadyReturned = await getReturnedQtyForProduct(order._id, productId, session, excludeReturnId);
  return Math.max(0, lineItem.quantity - alreadyReturned);
}

async function reserveDeliveryQuantities(order, products, session) {
  const productIds = products.map(p => p.productId);
  const deliveryItems = await DeliveryItem.find({ order: order._id, product: { $in: productIds } }).session(session);
  const deliveryItemMap = new Map(deliveryItems.map(di => [di.product.toString(), di]));

  const allReturns = await ReturnRequest.find({
    order: order._id,
    status: { $nin: ['REJECTED'] }
  }).session(session);

  const productReturnsMap = {};
  for (const r of allReturns) {
    for (const p of r.products) {
      productReturnsMap[p.productId.toString()] = (productReturnsMap[p.productId.toString()] || 0) + (p.quantity || 0);
    }
  }

  const lineItemMap = new Map((order.lineItems || []).map(li => [li.productId.toString(), li]));
  const bulkOps = [];

  for (const p of products) {
    const deliveryItem = deliveryItemMap.get(p.productId.toString());
    if (deliveryItem) {
      const available = (deliveryItem.deliveredQuantity || 0) - (deliveryItem.returnedQuantity || 0);
      if (p.quantity > available) {
        throw AppError.validation(`Requested return quantity (${p.quantity}) exceeds available quantity (${available}) for product ${p.productId}`);
      }
      bulkOps.push({
        updateOne: {
          filter: { _id: deliveryItem._id, __v: deliveryItem.__v },
          update: { $inc: { returnedQuantity: p.quantity, __v: 1 } }
        }
      });
      deliveryItem.returnedQuantity = (deliveryItem.returnedQuantity || 0) + p.quantity;
      if (deliveryItem.returnedQuantity > (deliveryItem.deliveredQuantity || 0)) {
        throw AppError.conflict(`Returned quantity exceeded delivered quantity for product ${p.productId}`);
      }
    } else {
      const lineItem = lineItemMap.get(p.productId.toString());
      if (!lineItem) {
        throw AppError.validation(`Product ${p.productId} was not part of this order`);
      }
      const alreadyReturned = productReturnsMap[p.productId.toString()] || 0;
      const available = Math.max(0, lineItem.quantity - alreadyReturned);
      if (p.quantity > available) {
        throw AppError.validation(`Requested return quantity (${p.quantity}) exceeds available quantity (${available}) for product ${p.productId}`);
      }
    }
  }

  if (bulkOps.length > 0) {
    const result = await DeliveryItem.bulkWrite(bulkOps, { session });
    if (result.modifiedCount !== bulkOps.length) {
      throw AppError.conflict(`Concurrent update on delivery items`);
    }
  }
}

async function revertDeliveryReservations(orderId, products, session) {
  const productIds = products.map(p => p.productId);
  const deliveryItems = await DeliveryItem.find({ order: orderId, product: { $in: productIds } }).session(session);
  const deliveryItemMap = new Map(deliveryItems.map(di => [di.product.toString(), di]));

  const bulkOps = [];
  for (const p of products) {
    const deliveryItem = deliveryItemMap.get(p.productId.toString());
    if (deliveryItem) {
      bulkOps.push({
        updateOne: {
          filter: { _id: deliveryItem._id, __v: deliveryItem.__v },
          update: { $inc: { returnedQuantity: -p.quantity, __v: 1 } }
        }
      });
    }
  }

  if (bulkOps.length > 0) {
    const result = await DeliveryItem.bulkWrite(bulkOps, { session });
    if (result.modifiedCount !== bulkOps.length) {
      throw AppError.conflict(`Concurrent update on delivery item`);
    }
  }
}

async function syncOrderReturnStatus(order, newStatus, userId, session) {
  if (!order || order.status === newStatus) return;
  const previousStatus = order.status;
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: previousStatus },
    { $set: { status: newStatus }, $inc: { __v: 1 } },
    { session, new: true }
  );
  if (updated) {
    await AuditService.log({
      user: userId,
      action: 'UPDATE_ORDER_STATUS',
      collectionName: 'Order',
      documentId: order._id,
      oldValue: { status: previousStatus },
      newValue: { status: newStatus },
      session,
    });
    await emitOrderStatusChanged({
      orderId: order.orderId || order._id.toString(),
      previousStatus,
      newStatus,
      updatedBy: userId,
    });
  }
}

export async function buildReturnListFilter(user) {
  const filter = {};
  if (user.role === 'shopkeeper') {
    const userDoc = await User.findById(user.id);
    const ownerName = userDoc ? userDoc.name : '';
    const shops = await Shopkeeper.find({ owner: ownerName }).select('_id');
    filter.customer = { $in: shops.map(s => s._id) };
  } else if (user.role === 'salesman') {
    const shopIds = await Order.distinct('shop', { man: user.id });
    const assignedShops = await Shopkeeper.find({ salesman: user.id }).select('_id');
    const allShopIds = [...new Set([
      ...shopIds.map(id => id.toString()),
      ...assignedShops.map(s => s._id.toString()),
    ])];
    filter.customer = { $in: allShopIds };
  } else if (user.role === 'supplier') {
    const products = await Product.find({ supplier: user.id }).select('_id');
    filter['products.productId'] = { $in: products.map(p => p._id) };
  }
  return filter;
}

export const getReturns = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const sort = getSafeSort(req.query.sort, ['createdAt', 'rmaId', 'status', 'reason', 'resolutionType'], { createdAt: -1 });
  const filter = await buildReturnListFilter(req.user);
  if (req.query.status) filter.status = req.query.status;

  const [docs, total] = await Promise.all([
    ReturnRequest.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('order', 'orderId status total')
      .populate('customer', 'name loc phone')
      .populate('products.productId', 'name sku price')
      .populate('approvedBy', 'name')
      .populate('complaintId', 'complaintId issue type')
      .populate('creditNoteId', 'creditNoteId total status')
      .populate('refundId', 'refundId amount status method')
      .populate('replacementOrderId', 'orderId status total')
      .lean(),
    ReturnRequest.countDocuments(filter)
  ]);

  res.json({
    data: docs.map(formatReturnRequest),
    pagination: {
      page,
      limit,
      count: total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1,
    }
  });
});

export const getReturn = catchAsync(async (req, res) => {
  const filter = await buildReturnListFilter(req.user);
  const doc = await ReturnRequest.findOne({ _id: req.params.id, ...filter })
    .populate('order', 'orderId status total lineItems')
    .populate('customer', 'name loc phone')
    .populate('products.productId', 'name sku price')
    .populate('approvedBy', 'name')
    .populate('complaintId', 'complaintId issue type status')
    .populate('creditNoteId', 'creditNoteId total status')
    .populate('refundId', 'refundId amount status')
    .populate('replacementOrderId', 'orderId status')
    .lean();

  if (!doc) throw AppError.notFound('Return request not found');
  res.json(formatReturnRequest(doc));
});

export const createReturn = catchAsync(async (req, res) => {
  await processCreateReturn(req, res, req.validatedBody);
});

export const convertComplaintToReturn = catchAsync(async (req, res) => {
  const complaint = await Complaint.findOne({ complaintId: req.params.complaintId });
  if (!complaint) throw AppError.notFound('Complaint not found');
  if (complaint.returnRequestId) {
    throw AppError.conflict('Complaint already linked to a return request');
  }

  await processCreateReturn(req, res, {
    ...req.validatedBody,
    complaintId: complaint._id.toString(),
  });
});

async function processCreateReturn(req, res, body) {
  const { orderId, customerId, products, reason, resolutionType, notes, complaintId } = body;

  const count = await ReturnRequest.countDocuments();
  const rmaId = `RMA-${String(count + 1).padStart(4, '0')}`;

  const created = await runInTransaction(async (session) => {
    const order = await resolveOrder(orderId, session);
    if (!order) throw AppError.notFound('Order not found');

    if (!ELIGIBLE_ORDER_STATUSES.includes(order.status)) {
      throw AppError.conflict(`Order must be delivered before requesting a return. Current status: ${order.status}`);
    }

    await reserveDeliveryQuantities(order, products, session);

    const returnReq = await ReturnRequest.create([{
      rmaId,
      order: order._id,
      customer: customerId || order.shop._id || order.shop,
      products,
      reason,
      resolutionType: resolutionType || 'REFUND',
      notes,
      complaintId: complaintId || undefined,
      status: 'REQUESTED',
    }], { session });

    if (complaintId) {
      await Complaint.findByIdAndUpdate(
        complaintId,
        { $set: { status: 'converted_to_return', returnRequestId: returnReq[0]._id } },
        { session }
      );
      await cache.del('complaints:list:*');
    }

    if (order.status !== 'return_requested') {
      await syncOrderReturnStatus(order, 'return_requested', req.user.id, session);
    }

    await AuditService.log({
      user: req.user.id,
      action: 'CREATE_RETURN_REQUEST',
      collectionName: 'ReturnRequest',
      documentId: returnReq[0]._id,
      newValue: { rmaId, orderId: order.orderId, reason, products },
      session,
    });

    await NotificationService.send({
      title: 'New Return Request',
      message: `Return ${rmaId} submitted for order ${order.orderId}. Reason: ${reason}`,
      type: 'RETURN',
      priority: 'HIGH',
      module: 'Returns',
      documentId: returnReq[0]._id,
      sender: req.user.id,
    }, null, 'admin', session);

    return returnReq[0];
  });

  await cache.del('orders:list:*');

  const populated = await ReturnRequest.findById(created._id)
    .populate('order', 'orderId status total')
    .populate('customer', 'name loc phone')
    .populate('products.productId', 'name sku price')
    .populate('complaintId', 'complaintId');

  await emitReturnStatusChanged({
    returnId: populated._id.toString(),
    rmaId: populated.rmaId,
    status: 'REQUESTED',
    updatedBy: req.user.id,
  });

  res.status(201).json(formatReturnRequest(populated));
}

export const inspectReturn = catchAsync(async (req, res) => {
  const { notes, grade, inspectionPhotos, products: lineUpdates } = req.validatedBody || {};

  const doc = await runInTransaction(async (session) => {
    const filter = await buildReturnListFilter(req.user);
    const existing = await ReturnRequest.findOne({ _id: req.params.id, ...filter }).session(session);
    if (!existing) throw AppError.notFound('Return request not found or access denied');
    if (existing.status !== 'REQUESTED') {
      throw AppError.conflict(`Cannot start inspection in status ${existing.status}`);
    }

    if (lineUpdates?.length) {
      for (const upd of lineUpdates) {
        const line = existing.products.find(p => p.productId.toString() === upd.productId);
        if (line) {
          if (upd.condition) line.condition = upd.condition;
          if (upd.disposition) line.disposition = upd.disposition;
        }
      }
      existing.markModified('products');
    }

    existing.status = 'INSPECTING';
    existing.inspectionNotes = notes;
    existing.inspectionGrade = grade;
    if (inspectionPhotos?.length) existing.inspectionPhotos = inspectionPhotos;
    await existing.save({ session });

    await AuditService.log({
      user: req.user.id,
      action: 'RETURN_INSPECTION_STARTED',
      collectionName: 'ReturnRequest',
      documentId: existing._id,
      newValue: { grade, notes },
      session,
    });

    return existing;
  });

  await emitReturnStatusChanged({
    returnId: doc._id.toString(),
    rmaId: doc.rmaId,
    status: 'INSPECTING',
    updatedBy: req.user.id,
  });

  const populated = await ReturnRequest.findById(doc._id)
    .populate('order', 'orderId status')
    .populate('customer', 'name')
    .populate('products.productId', 'name sku');

  res.json(formatReturnRequest(populated));
});

export const approveReturn = catchAsync(async (req, res) => {
  const { outcome, notes } = req.validatedBody;

  const doc = await runInTransaction(async (session) => {
    const filter = await buildReturnListFilter(req.user);
    const request = await ReturnRequest.findOneAndUpdate(
      { _id: req.params.id, status: { $in: ['REQUESTED', 'INSPECTING'] }, ...filter },
      {
        $set: { status: outcome, approvedBy: req.user.id, approvalNotes: notes },
        $inc: { __v: 1 },
      },
      { new: true, session }
    );
    if (!request) {
      const existing = await ReturnRequest.findOne({ _id: req.params.id, ...filter }).session(session);
      if (!existing) throw AppError.notFound('Return request not found or access denied');
      throw AppError.conflict(`Cannot approve request in status ${existing.status}`);
    }

    if (outcome === 'REJECTED') {
      await revertDeliveryReservations(request.order, request.products, session);
      const order = await Order.findById(request.order).session(session);
      const activeReturns = await ReturnRequest.countDocuments({
        order: request.order,
        status: { $nin: ['REJECTED'] },
        _id: { $ne: request._id },
      }).session(session);
      if (activeReturns === 0 && order?.status === 'return_requested') {
        const revertStatus = order.lineItems?.length ? 'delivered' : 'delivered';
        await syncOrderReturnStatus(order, 'delivered', req.user.id, session);
      }
    }

    await AuditService.log({
      user: req.user.id,
      action: `RETURN_REQUEST_${outcome}`,
      collectionName: 'ReturnRequest',
      documentId: request._id,
      session,
    });

    return request;
  });

  await cache.del('orders:list:*');

  await emitReturnStatusChanged({
    returnId: doc._id.toString(),
    rmaId: doc.rmaId,
    status: outcome,
    updatedBy: req.user.id,
  });

  const populated = await ReturnRequest.findById(doc._id)
    .populate('order', 'orderId status')
    .populate('customer', 'name')
    .populate('products.productId', 'name sku')
    .populate('approvedBy', 'name');

  res.json(formatReturnRequest(populated));
});

export const receiveReturn = catchAsync(async (req, res) => {
  const doc = await runInTransaction(async (session) => {
    const filter = await buildReturnListFilter(req.user);
    const request = await ReturnRequest.findOneAndUpdate(
      { _id: req.params.id, status: 'APPROVED', ...filter },
      { $set: { status: 'RECEIVED', receivedAt: new Date(), receivedBy: req.user.id }, $inc: { __v: 1 } },
      { new: true, session }
    );
    if (!request) {
      const existing = await ReturnRequest.findOne({ _id: req.params.id, ...filter }).session(session);
      if (!existing) throw AppError.notFound('Return request not found or access denied');
      throw AppError.conflict(`Must be APPROVED before receiving. Current status: ${existing.status}`);
    }

    const stockMovementIds = [];
    const returnMovements = request.products.map(p => ({
      productId: p.productId,
      quantityChanged: p.quantity,
      movementType: 'return',
      referenceDocument: request._id,
      user: req.user.id
    }));

    if (returnMovements.length > 0) {
      await StockService.bulkMoveStock(returnMovements, session);
      const movements = await StockMovement.find({
        referenceDocument: request._id,
        movementType: 'return'
      }).select('_id').session(session);
      stockMovementIds.push(...movements.map(m => m._id));
    }

    request.status = 'COMPLETED';
    request.stockMovementIds = stockMovementIds;
    if (stockMovementIds[0]) request.stockMovementId = stockMovementIds[0];
    await request.save({ session });

    const order = await Order.findById(request.order).session(session);
    await syncOrderReturnStatus(order, 'returned', req.user.id, session);

    await ReturnSettlementService.settle(request, req.user.id, session);

    await AuditService.log({
      user: req.user.id,
      action: 'RETURN_RECEIVED_AND_RESTORED',
      collectionName: 'ReturnRequest',
      documentId: request._id,
      newValue: { stockMovementIds },
      session,
    });

    await NotificationService.send({
      title: 'Return Completed',
      message: `Return ${request.rmaId} received and stock restored.`,
      type: 'RETURN',
      priority: 'MEDIUM',
      module: 'Returns',
      documentId: request._id,
      sender: req.user.id,
    }, null, 'admin', session);

    return request;
  });

  await cache.del('orders:list:*');
  await cache.del('products:list:*');
  await cache.del('payments:list:*');

  try {
    const { getIO } = await import('../utils/socket.js');
    getIO().emit('STOCK_CHANGED', {});
    getIO().emit('CREDIT_NOTE_POSTED', { returnId: doc._id.toString(), rmaId: doc.rmaId });
  } catch {
    // Socket may not be initialized in tests
  }

  await emitReturnStatusChanged({
    returnId: doc._id.toString(),
    rmaId: doc.rmaId,
    status: 'COMPLETED',
    updatedBy: req.user.id,
  });

  const populated = await ReturnRequest.findById(doc._id)
    .populate('order', 'orderId status total')
    .populate('customer', 'name loc phone')
    .populate('products.productId', 'name sku price')
    .populate('creditNoteId', 'creditNoteId total status')
    .populate('refundId', 'refundId amount status method')
    .populate('replacementOrderId', 'orderId status total');

  res.json(formatReturnRequest(populated));
});
