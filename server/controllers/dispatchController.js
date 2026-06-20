import Dispatch from '../models/Dispatch.js';
import Vehicle from '../models/Vehicle.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { getPagination, getSafeSort } from '../utils/pagination.js';
import { runInTransaction } from '../utils/transaction.js';
import AuditService from '../services/AuditService.js';
import NotificationService from '../services/NotificationService.js';

const buildDispatchScope = (user) => {
  const filter = {};
  if (user.role === 'salesman' || user.role === 'driver') {
    filter.driver = user.id;
  }
  return filter;
};

export const getDispatches = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const sort = getSafeSort(req.query.sort, ['createdAt', 'dispatchId', 'status', 'deliveryStatus'], { createdAt: -1 });
  const filter = buildDispatchScope(req.user);

  const [docs, total] = await Promise.all([
    Dispatch.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('vehicle')
      .populate('driver')
      .populate('orders')
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
});

export const getVehicles = catchAsync(async (req, res) => {
  const vehicles = await Vehicle.find();
  res.json(vehicles);
});

export const createDispatch = catchAsync(async (req, res) => {
  let { vehicleId, driverId, orderIds, notes } = req.body;
  
  if (!driverId) {
    driverId = req.user.id;
  }
  
  if (!vehicleId || !orderIds || orderIds.length === 0) {
    throw AppError.validation('Vehicle and Orders are required');
  }

  const count = await Dispatch.countDocuments();
  const dispatchId = `DISP-${String(count + 1).padStart(4, '0')}`;

  const dispatch = await runInTransaction(async (session) => {
    // Phase 6: Ensure orders are not already dispatched
    const orders = await Order.find({ _id: { $in: orderIds } }).session(session);
    for (const order of orders) {
      if (order.status !== 'ready_for_dispatch') {
        throw AppError.conflict(`Order ${order.orderId} cannot be dispatched in its current state: ${order.status}`);
      }
    }

    const doc = await Dispatch.create([{
      dispatchId,
      vehicle: vehicleId,
      driver: driverId,
      orders: orderIds,
      status: 'scheduled',
      deliveryStatus: 'ASSIGNED',
      notes,
      assignedAt: new Date()
    }], { session });

    // Update order status to in_transit safely with OCC
    for (const order of orders) {
      const updatedOrder = await Order.findOneAndUpdate(
        { _id: order._id, __v: order.__v },
        { 
          $set: { status: 'in_transit' },
          $inc: { __v: 1 }
        },
        { session, new: true }
      );
      if (!updatedOrder) throw AppError.conflict(`Order ${order.orderId} was updated concurrently`);
    }

    await AuditService.log({
      user: req.user.id,
      action: 'CREATE_DISPATCH',
      collectionName: 'Dispatch',
      documentId: doc[0]._id,
      newValue: { dispatchId, driver: driverId, vehicle: vehicleId, orders: orderIds },
      session
    });

    return doc[0];
  });

  const scope = buildDispatchScope(req.user);
  const populated = await Dispatch.findOne({ _id: dispatch._id, ...scope })
    .populate('vehicle')
    .populate('driver')
    .populate('orders');

  res.status(201).json(populated);
});

export const updateDispatchStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { deliveryStatus, failureReason } = req.body;
  const scope = buildDispatchScope(req.user);

  const dispatch = await Dispatch.findOne({ _id: id, ...scope });
  if (!dispatch) throw AppError.notFound('Dispatch not found or access denied');

  const previousStatus = dispatch.deliveryStatus;

  // Phase 6: Validate transitions
  const validTransitions = {
    'ASSIGNED': ['OUT_FOR_DELIVERY', 'FAILED'],
    'OUT_FOR_DELIVERY': ['DELIVERED', 'FAILED'],
    'DELIVERED': [],
    'FAILED': ['ASSIGNED'] // Retry mechanism
  };

  if (!validTransitions[previousStatus] || !validTransitions[previousStatus].includes(deliveryStatus)) {
    throw AppError.conflict(`Invalid state transition from ${previousStatus} to ${deliveryStatus}`);
  }

  await runInTransaction(async (session) => {
    let updateDoc = { deliveryStatus };
    if (deliveryStatus === 'OUT_FOR_DELIVERY') {
      updateDoc.dispatchedAt = new Date();
      updateDoc.status = 'in-transit';
    } else if (deliveryStatus === 'DELIVERED') {
      updateDoc.deliveredAt = new Date();
      updateDoc.status = 'completed';
      
      // Conditionally update all associated orders to 'delivered'
      for (const orderId of dispatch.orders) {
        const order = await Order.findById(orderId).session(session);
        if (order && order.status !== 'delivered') {
          const updatedOrder = await Order.findOneAndUpdate(
            { _id: order._id, __v: order.__v, status: { $ne: 'delivered' } },
            { 
              $set: { status: 'delivered' },
              $inc: { __v: 1 }
            },
            { session, new: true }
          );
          if (!updatedOrder) throw AppError.conflict(`Order ${order.orderId} was updated concurrently`);
        }
      }
    } else if (deliveryStatus === 'FAILED') {
      updateDoc.failureReason = failureReason;
      updateDoc.status = 'completed';
    }

    const updatedDispatch = await Dispatch.findOneAndUpdate(
      { _id: dispatch._id, deliveryStatus: previousStatus, __v: dispatch.__v },
      { 
        $set: updateDoc,
        $inc: { __v: 1 }
      },
      { new: true, session }
    );

    if (!updatedDispatch) {
      throw AppError.conflict('Dispatch status was modified concurrently. Please refresh.');
    }

    await AuditService.log({
      user: req.user.id,
      action: 'UPDATE_DISPATCH_STATUS',
      collectionName: 'Dispatch',
      documentId: dispatch._id,
      oldValue: { deliveryStatus: previousStatus },
      newValue: { deliveryStatus, failureReason },
      session
    });
  });

  // Notify assigned driver/salesman if status updated by supplier
  if (req.user.role === 'supplier' || req.user.role === 'admin') {
     await NotificationService.send({
        title: 'Dispatch Updated',
        message: `Dispatch ${dispatch.dispatchId} status updated to ${deliveryStatus}`,
        type: 'DELIVERY',
        priority: 'MEDIUM',
        module: 'Dispatch',
        documentId: dispatch._id
     }, [dispatch.driver]);
  }

  const populated = await Dispatch.findOne({ _id: dispatch._id, ...scope })
    .populate('vehicle')
    .populate('driver')
    .populate('orders');

  res.json(populated);
});
