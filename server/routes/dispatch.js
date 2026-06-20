import { Router } from 'express';
import Dispatch from '../models/Dispatch.js';
import Order from '../models/Order.js';
import DeliveryItem from '../models/DeliveryItem.js';
import DeliveryService from '../services/DeliveryService.js';
import Notification from '../models/Notification.js';
import AuditService from '../services/AuditService.js';
import authenticate from '../middleware/auth.js';
import { requirePermission } from '../utils/permissions.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { getPagination, getSafeSort } from '../utils/pagination.js';
import { runInTransaction } from '../utils/transaction.js';
import NotificationService from '../services/NotificationService.js';
import User from '../models/User.js';
import Shopkeeper from '../models/Shopkeeper.js';
import { verifyDispatchOwnership, verifyShopOwnership } from '../middleware/checkOwnership.js';
import StockService from '../services/StockService.js';

const router = Router();
router.use(authenticate);

router.get('/', requirePermission('dispatch.read'), catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const sort = getSafeSort(req.query.sort, ['createdAt', 'dispatchId', 'status', 'deliveryStatus'], { createdAt: -1 });

  const filter = {};
  if (req.user.role === 'salesman') {
    filter.driver = req.user.id;
  }
  
  const [docs, total] = await Promise.all([
    Dispatch.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('vehicle')
      .populate('driver', 'name email')
      .populate({
          path: 'orders',
          populate: { path: 'shop', select: 'name loc location' }
      })
      .lean(),
    Dispatch.countDocuments(filter)
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

router.get('/order/:id', requirePermission('dispatch.read'), verifyShopOwnership, catchAsync(async (req, res) => {
  const paramId = req.params.id;
  let orderOid = paramId;
  if (!paramId.match(/^[0-9a-fA-F]{24}$/)) {
    const orderDoc = await Order.findOne({ orderId: paramId });
    if (!orderDoc) throw AppError.notFound('Order not found');
    orderOid = orderDoc._id;
  }
  
  const dispatch = await Dispatch.findOne({ orders: orderOid })
    .sort({ createdAt: -1 })
    .populate('vehicle')
    .populate('driver', 'name email phone')
    .populate({
        path: 'orders',
        populate: { path: 'shop', select: 'name loc location' }
    });

  if (!dispatch) {
    throw AppError.notFound('No dispatch found for this order');
  }

  res.json(dispatch);
}));

router.post('/', requirePermission('dispatch.manage'), catchAsync(async (req, res) => {
  let { vehicle, driver, orders, notes } = req.body;
  
  if (!driver) driver = req.user.id;
  
  if (!orders || orders.length === 0) throw AppError.validation('Must select at least one order');
  
  const count = await Dispatch.countDocuments();
  const dispatchId = `DSP-${String(count + 1).padStart(4, '0')}`;

  const created = await runInTransaction(async (session) => {
    const orderDocs = await Order.find({ _id: { $in: orders } }).session(session);
    if (orderDocs.length !== orders.length) {
      throw AppError.notFound('One or more selected orders were not found');
    }
    for (const order of orderDocs) {
      if (order.status !== 'ready_for_dispatch') {
        throw AppError.conflict(
          `Order ${order.orderId || order._id} is not ready for dispatch. Current status: ${order.status}`
        );
      }
    }

    const dispatch = await Dispatch.create([{
      dispatchId, vehicle, driver, orders, notes, status: 'scheduled', deliveryStatus: 'ASSIGNED', assignedAt: new Date()
    }], { session });

    await AuditService.log({
        user: req.user.id,
        action: 'CREATE_DISPATCH',
        collectionName: 'Dispatch',
        documentId: dispatch[0]._id,
        newValue: { dispatchId, driver, orders },
        session
    });

    return dispatch[0];
  });
  
  // Phase 6: Notify the assigned driver
  await NotificationService.send({
    title: 'Dispatch Assigned',
    message: `You have been assigned to Dispatch ${dispatchId}.`,
    type: 'DELIVERY',
    priority: 'HIGH',
    module: 'Dispatch',
    documentId: created._id
  }, [driver]);
  
  const populated = await Dispatch.findById(created._id)
    .populate('vehicle').populate('driver', 'name').populate('orders');
    
  try {
    const { getIO } = await import('../utils/socket.js');
    getIO().emit('DISPATCH_UPDATE', { dispatchId: created.dispatchId });
  } catch {
    // Socket may not be initialized in tests
  }

  res.status(201).json(populated);
}));

router.patch('/:id/start', requirePermission('dispatch.driver'), verifyDispatchOwnership, catchAsync(async (req, res) => {
  const doc = await runInTransaction(async (session) => {
      const dispatch = await Dispatch.findById(req.params.id).session(session);
      if (!dispatch) throw AppError.notFound('Dispatch not found');
      
      dispatch.deliveryStatus = 'OUT_FOR_DELIVERY';
      dispatch.status = 'in-transit';
      dispatch.dispatchedAt = new Date();
      await dispatch.save({ session });

      // Update all associated orders to 'in_transit'
      for (const orderId of dispatch.orders) {
          const order = await Order.findById(orderId).session(session);
          if (order && order.status === 'ready_for_dispatch') {
             const oldStatus = order.status;
             order.status = 'in_transit';
             await order.save({ session });
             
             await AuditService.log({
                 user: req.user.id,
                 action: 'UPDATE_ORDER_STATUS',
                 collectionName: 'Order',
                 documentId: order._id,
                 oldValue: { status: oldStatus },
                 newValue: { status: 'in_transit' },
                 session
             });

             try {
               const { getIO } = await import('../utils/socket.js');
               getIO().emit('ORDER_STATUS_CHANGED', {
                 orderId: order.orderId || order._id.toString(),
                 previousStatus: oldStatus,
                 newStatus: 'in_transit',
                 updatedBy: req.user.id,
               });
             } catch {
               // Socket may not be initialized in tests
             }
             
             // Phase 6: Notify shopkeeper that delivery is out
             const shopDoc = await Shopkeeper.findById(order.shop).session(session);
             if (shopDoc) {
               const shopUser = await User.findOne({ name: shopDoc.owner, role: 'shopkeeper' }).session(session);
               if (shopUser) {
                 await NotificationService.send({
                   title: 'Out for Delivery',
                   message: `Your order ${order.orderId || order._id} is out for delivery.`,
                   type: 'DELIVERY',
                   priority: 'HIGH',
                   module: 'Dispatch',
                   documentId: dispatch._id
                 }, [shopUser._id], null, session);
               }
             }
          }
      }

      await AuditService.log({
        user: req.user.id,
        action: 'START_DISPATCH',
        collectionName: 'Dispatch',
        documentId: dispatch._id,
        session
      });

      return dispatch;
  });
  
  const populated = await Dispatch.findById(doc._id)
    .populate('vehicle').populate('driver', 'name').populate('orders');
    
  res.json(populated);
}));

// Route for DELIVERED / PARTIAL outcomes
router.patch('/:id/resolve', requirePermission('delivery.complete'), verifyDispatchOwnership, catchAsync(async (req, res) => {
  const { outcome, deliveryItems, failureReason, proofOfDelivery } = req.body;
  // outcome: 'DELIVERED', 'PARTIAL', 'FAILED'
  
  const doc = await runInTransaction(async (session) => {
      const dispatch = await Dispatch.findById(req.params.id).session(session);
      if (!dispatch) throw AppError.notFound('Dispatch not found');
      
      if (dispatch.deliveryStatus === 'DELIVERED') throw AppError.validation('Already completed');
      
      dispatch.deliveryStatus = outcome;
      if (outcome === 'DELIVERED' || outcome === 'PARTIAL') {
        dispatch.status = 'completed';
        dispatch.arrivalTime = new Date();
      } else if (outcome === 'FAILED') {
        dispatch.status = 'completed';
        dispatch.deliveryStatus = 'FAILED';
        dispatch.arrivalTime = new Date();
      }
      dispatch.deliveredAt = new Date();
      if (failureReason) dispatch.failureReason = failureReason;

      if (outcome === 'DELIVERED' || outcome === 'PARTIAL') {
          if (!proofOfDelivery || (!proofOfDelivery.signatureUrl && !proofOfDelivery.gpsLocation)) {
              throw AppError.validation('Strict Policy: Proof of Delivery (signature or GPS) is required to resolve dispatch');
          }
      }

      if (proofOfDelivery) {
         dispatch.proofOfDelivery = {
             ...proofOfDelivery,
             uploadedBy: req.user.id,
             uploadedAt: new Date()
         };
      }
      
      await dispatch.save({ session });

      if (outcome === 'FAILED') {
          // Orders remain active (e.g. in_transit), but dispatch failed.
          // Restore all loaded stock back to warehouse since nothing was delivered
          for (const orderId of dispatch.orders) {
              const order = await Order.findById(orderId).session(session);
              if (order) {
                  for (const line of order.lineItems) {
                      await StockService.moveStock({
                          productId: line.productId,
                          quantityChanged: line.quantity,
                          movementType: 'return',
                          referenceDocument: dispatch._id,
                          user: req.user.id,
                          session
                      });
                  }
                  order.status = 'ready_for_dispatch'; // Revert status so it can be dispatched again
                  await order.save({ session });
              }
          }

          await NotificationService.send({
            title: 'Delivery Failed',
            message: `Dispatch ${dispatch.dispatchId} failed: ${failureReason}`,
            type: 'DELIVERY',
            priority: 'CRITICAL',
            module: 'Dispatch',
            documentId: dispatch._id
          }, null, 'admin', session);
      } else if (outcome === 'DELIVERED' || outcome === 'PARTIAL') {
          let itemsToProcess = deliveryItems;
          
          if (!itemsToProcess || itemsToProcess.length === 0) {
              if (outcome === 'PARTIAL') {
                 throw AppError.validation('Delivery Items array is required for PARTIAL outcomes.');
              }
              // If fully delivered and no items provided, we'll just mark orders as delivered later, 
              // but we don't strictly require DeliveryItems to be created if the frontend is simple.
              itemsToProcess = [];
          }

          // Create DeliveryItem records
          for (const item of itemsToProcess) {
              const expected = item.expectedQuantity || 0;
              const delivered = item.deliveredQuantity || 0;
              const returnedQty = expected > delivered ? expected - delivered : 0;

              await DeliveryItem.create([{
                  dispatch: dispatch._id,
                  order: item.orderId,
                  product: item.productId,
                  expectedQuantity: expected,
                  deliveredQuantity: delivered,
                  returnedQuantity: returnedQty,
                  status: item.status || 'DELIVERED', // DAMAGED, MISSING, REFUSED
                  reason: item.reason,
                  notes: item.notes
              }], { session });

              // Restore any undelivered stock back to the warehouse
              if (returnedQty > 0) {
                  await StockService.moveStock({
                      productId: item.productId,
                      quantityChanged: returnedQty,
                      movementType: 'return',
                      referenceDocument: dispatch._id,
                      user: req.user.id,
                      session
                  });
              }
          }

          // Calculate progress for each order (or just set delivered if simple)
          for (const orderId of dispatch.orders) {
             if (itemsToProcess.length > 0) {
                await DeliveryService.calculateProgress(orderId, session);
             } else {
                 // simple flow: mark order as delivered
                 await Order.updateOne({ _id: orderId }, { $set: { status: 'delivered' } }, { session });
              }
              
              // Notify shopkeeper of delivery
              const order = await Order.findById(orderId).session(session);
              if (order) {
                 const shopDoc = await Shopkeeper.findById(order.shop).session(session);
                 if (shopDoc) {
                   const shopUser = await User.findOne({ name: shopDoc.owner, role: 'shopkeeper' }).session(session);
                   if (shopUser) {
                     await NotificationService.send({
                       title: 'Delivery Completed',
                       message: `Order ${order.orderId || order._id} has been delivered.`,
                       type: 'DELIVERY',
                       priority: 'MEDIUM',
                       module: 'Dispatch',
                       documentId: dispatch._id
                     }, [shopUser._id], null, session);
                   }
                 }
              }
          }
      }

      await AuditService.log({
        user: req.user.id,
        action: 'RESOLVE_DISPATCH',
        collectionName: 'Dispatch',
        documentId: dispatch._id,
        newValue: { outcome, failureReason },
        session
      });
      
      return dispatch;
  });
  
  const populated = await Dispatch.findById(doc._id)
    .populate('vehicle').populate('driver', 'name').populate('orders');
    
  res.json(populated);
}));

export default router;
