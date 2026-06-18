import { Router } from 'express';
import Order from '../models/Order.js';
import Shopkeeper from '../models/Shopkeeper.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import { formatOrder } from '../utils/format.js';
import { paginate } from '../utils/pagination.js';
import { cache } from '../utils/cache.js';
import { runInTransaction } from '../utils/transaction.js';
import authenticate from '../middleware/auth.js';
import authorize from '../middleware/authorize.js';
import validate from '../middleware/validate.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { createOrderSchema, updateOrderSchema, updateOrderStatusSchema } from '../validators/order.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('admin', 'salesman', 'shopkeeper'), catchAsync(async (req, res) => {
  const page = req.query.page ? parseInt(req.query.page, 10) : null;
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;

  const cacheKey = `orders:list:role:${req.user.role}:user:${req.user.id}:page:${page || 'all'}:limit:${limit || 'all'}`;
  const cachedData = await cache.get(cacheKey);
  if (cachedData) {
    return res.json(cachedData);
  }

  const filter = {};
  if (req.user.role === 'shopkeeper') {
    const userDoc = await User.findById(req.user.id);
    const ownerName = userDoc ? userDoc.name : '';
    const shops = await Shopkeeper.find({ owner: ownerName }).select('_id');
    filter.shop = { $in: shops.map(s => s._id) };
  } else if (req.user.role === 'salesman') {
    filter.man = req.user.id;
  }

  let responseData;
  const populateOpts = ['shop', 'man'];

  if (page || limit) {
    const paginatedResult = await paginate(Order, filter, {
      page,
      limit,
      sort: { createdAt: -1 },
      populate: populateOpts,
    });
    responseData = {
      data: paginatedResult.data.map(formatOrder),
      pagination: paginatedResult.pagination,
    };
  } else {
    const docs = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate('shop')
      .populate('man')
      .lean();
    responseData = docs.map(formatOrder);
  }

  await cache.set(cacheKey, responseData, 60);
  res.json(responseData);
}));

router.post('/', authorize('admin', 'salesman', 'shopkeeper'), validate(createOrderSchema), catchAsync(async (req, res) => {
  const count = await Order.countDocuments();
  const orderId = req.validatedBody.orderId || `ORD-${String(count + 1).padStart(3, '0')}`;

  let shopId = req.validatedBody.shopkeeperId || req.validatedBody.shop;
  if (typeof shopId === 'string' && !shopId.match(/^[0-9a-fA-F]{24}$/)) {
    const sk = await Shopkeeper.findOne({ name: shopId });
    if (!sk) throw AppError.validation(`Shopkeeper not found: ${shopId}`);
    shopId = sk._id;
  }

  let manId = req.validatedBody.man;
  if (typeof manId === 'string' && !manId.match(/^[0-9a-fA-F]{24}$/)) {
    const u = await User.findOne({ name: manId });
    if (u) manId = u._id;
  }

  const { items, total, status, date, pay } = req.validatedBody;
  const totalQuantity = items.reduce((acc, item) => acc + item.quantity, 0);
  const lineItems = [];

  const doc = await runInTransaction(async (session) => {
    let calculatedTotal = 0;
    for (const item of items) {
      const product = await Product.findOneAndUpdate(
        { _id: item.productId, stock: { $gte: Number(item.quantity) } },
        { $inc: { stock: -Number(item.quantity) } },
        { session, new: true }
      );
      if (!product) {
        throw AppError.validation(`Insufficient stock or product not found for ID: ${item.productId}`);
      }
      lineItems.push({
        productId: product._id,
        productName: product.name,
        quantity: Number(item.quantity),
      });
      calculatedTotal += product.price * Number(item.quantity);
    }

    if (total !== undefined && Math.abs(total - calculatedTotal) > 0.01) {
      throw AppError.validation(`Total price mismatch. Calculated: ${calculatedTotal}, Provided: ${total}`);
    }

    const created = await Order.create([{
      orderId,
      shop: shopId,
      man: manId,
      items: totalQuantity,
      lineItems,
      total: total !== undefined ? total : calculatedTotal,
      status: status || 'pending',
      date: date || new Date().toISOString().slice(0, 10),
      pay: pay || 'installment',
    }], { session });

    return created[0];
  });

  await cache.del('orders:list:*');
  await cache.del('products:list:*');

  const populatedDoc = await Order.findById(doc._id).populate('shop').populate('man');
  res.status(201).json(formatOrder(populatedDoc));
}));

router.patch('/:orderId', authorize('admin', 'salesman'), validate(updateOrderSchema), catchAsync(async (req, res) => {
  const updates = { ...req.validatedBody };

  if (updates.shop) {
    if (typeof updates.shop === 'string' && !updates.shop.match(/^[0-9a-fA-F]{24}$/)) {
      const sk = await Shopkeeper.findOne({ name: updates.shop });
      if (sk) updates.shop = sk._id;
    }
  } else if (updates.shopkeeperId) {
    updates.shop = updates.shopkeeperId;
    delete updates.shopkeeperId;
  }

  if (updates.man && typeof updates.man === 'string' && !updates.man.match(/^[0-9a-fA-F]{24}$/)) {
    const u = await User.findOne({ name: updates.man });
    if (u) updates.man = u._id;
  }

  let doc;
  if (updates.items !== undefined) {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) throw AppError.notFound('Order not found');
    if (order.status !== 'pending') {
      throw AppError.validation('Cannot modify items of a non-pending order');
    }

    doc = await runInTransaction(async (session) => {
      // 1. Revert old stock adjustments
      for (const item of order.lineItems) {
        await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { stock: item.quantity } },
          { session }
        );
      }

      // 2. Apply new stock adjustments, calculate quantity and total
      const lineItems = [];
      let calculatedTotal = 0;
      const totalQuantity = updates.items.reduce((acc, item) => acc + item.quantity, 0);

      for (const item of updates.items) {
        const product = await Product.findOneAndUpdate(
          { _id: item.productId, stock: { $gte: Number(item.quantity) } },
          { $inc: { stock: -Number(item.quantity) } },
          { session, new: true }
        );
        if (!product) {
          throw AppError.validation(`Insufficient stock or product not found for ID: ${item.productId}`);
        }
        lineItems.push({
          productId: product._id,
          productName: product.name,
          quantity: Number(item.quantity),
        });
        calculatedTotal += product.price * Number(item.quantity);
      }

      const finalTotal = updates.total !== undefined ? updates.total : calculatedTotal;
      if (updates.total !== undefined && Math.abs(updates.total - calculatedTotal) > 0.01) {
        throw AppError.validation(`Total price mismatch. Calculated: ${calculatedTotal}, Provided: ${updates.total}`);
      }

      updates.lineItems = lineItems;
      updates.items = totalQuantity;
      updates.total = finalTotal;

      const updated = await Order.findOneAndUpdate(
        { orderId: req.params.orderId },
        updates,
        { session, new: true }
      ).populate('shop').populate('man');

      return updated;
    });
  } else {
    doc = await Order.findOneAndUpdate(
      { orderId: req.params.orderId },
      updates,
      { new: true }
    ).populate('shop').populate('man');
  }

  if (!doc) throw AppError.notFound('Order not found');

  await cache.del('orders:list:*');
  await cache.del('products:list:*');

  res.json(formatOrder(doc));
}));


router.put('/:id/status', authorize('admin', 'salesman'), validate(updateOrderStatusSchema), catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.validatedBody;

  if (!status) {
    throw AppError.validation('Status is required');
  }

  const validStatuses = ['pending', 'confirmed', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw AppError.validation(`Invalid status: ${status}`);
  }

  const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { orderId: id };
  const order = await Order.findOne(query);
  if (!order) {
    throw AppError.notFound('Order not found');
  }

  const currentStatus = order.status;

  if (currentStatus === status) {
    return res.json(formatOrder(order));
  }

  if (currentStatus === 'delivered' || currentStatus === 'cancelled') {
    throw AppError.validation(`Cannot change status of a ${currentStatus} order`);
  }

  const allowedTransitions = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['delivered', 'cancelled'],
  };

  if (!allowedTransitions[currentStatus]?.includes(status)) {
    throw AppError.validation(`Invalid status transition from ${currentStatus} to ${status}`);
  }

  order.status = status;
  await order.save();

  await cache.del('orders:list:*');

  const populatedOrder = await Order.findById(order._id).populate('shop').populate('man');
  res.json(formatOrder(populatedOrder));
}));

export default router;
