import Dispatch from '../models/Dispatch.js';
import Vehicle from '../models/Vehicle.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { runInTransaction } from '../utils/transaction.js';

export const getDispatches = catchAsync(async (req, res) => {
  const filter = {};
  if (req.user.role === 'salesman' || req.user.role === 'driver') {
    filter.driver = req.user.id;
  }
  const dispatches = await Dispatch.find(filter)
    .populate('vehicle')
    .populate('driver')
    .populate('orders')
    .sort({ createdAt: -1 });
  res.json(dispatches);
});

export const getVehicles = catchAsync(async (req, res) => {
  const vehicles = await Vehicle.find();
  res.json(vehicles);
});

export const createDispatch = catchAsync(async (req, res) => {
  const { vehicleId, driverId, orderIds, notes } = req.body;
  
  if (!vehicleId || !driverId || !orderIds || orderIds.length === 0) {
    throw AppError.validation('Vehicle, Driver, and Orders are required');
  }

  const count = await Dispatch.countDocuments();
  const dispatchId = `DISP-${String(count + 1).padStart(4, '0')}`;

  const dispatch = await runInTransaction(async (session) => {
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

    // Update order status to IN_TRANSIT (or ready_for_dispatch?)
    await Order.updateMany(
      { _id: { $in: orderIds } },
      { $set: { status: 'in_transit' } },
      { session }
    );

    return doc[0];
  });

  const populated = await Dispatch.findById(dispatch._id)
    .populate('vehicle')
    .populate('driver')
    .populate('orders');

  res.status(201).json(populated);
});

export const updateDispatchStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { deliveryStatus, failureReason } = req.body;

  const dispatch = await Dispatch.findById(id);
  if (!dispatch) throw AppError.notFound('Dispatch not found');

  dispatch.deliveryStatus = deliveryStatus;
  if (deliveryStatus === 'OUT_FOR_DELIVERY') {
    dispatch.dispatchedAt = new Date();
    dispatch.status = 'in-transit';
  } else if (deliveryStatus === 'DELIVERED') {
    dispatch.deliveredAt = new Date();
    dispatch.status = 'completed';
    // Optionally update all associated orders to 'delivered'
    await Order.updateMany({ _id: { $in: dispatch.orders } }, { $set: { status: 'delivered' } });
  } else if (deliveryStatus === 'FAILED') {
    dispatch.failureReason = failureReason;
    dispatch.status = 'completed';
  }

  await dispatch.save();

  const populated = await Dispatch.findById(dispatch._id)
    .populate('vehicle')
    .populate('driver')
    .populate('orders');

  res.json(populated);
});
