import Payment from '../models/Payment.js';
import Shopkeeper from '../models/Shopkeeper.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { formatPayment } from '../utils/format.js';
import { paginate } from '../utils/pagination.js';
import { cache } from '../utils/cache.js';
import { runInTransaction } from '../utils/transaction.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import NotificationService from '../services/NotificationService.js';

async function buildPaymentListFilter(user) {
  const filter = {};
  if (user.role === 'shopkeeper') {
    const userDoc = await User.findById(user.id);
    const ownerName = userDoc ? userDoc.name : '';
    const shops = await Shopkeeper.find({ owner: ownerName }).select('_id');
    filter.shop = { $in: shops.map(s => s._id) };
  } else if (user.role === 'salesman') {
    const shopIds = await Order.distinct('shop', { man: user.id });
    const assignedShops = await Shopkeeper.find({ salesman: user.id }).select('_id');
    const allShopIds = [...new Set([...shopIds.map(id => id.toString()), ...assignedShops.map(s => s._id.toString())])];
    filter.shop = { $in: allShopIds };
  }
  return filter;
}

export const getPayments = catchAsync(async (req, res) => {
  const page = req.query.page ? parseInt(req.query.page, 10) : null;
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;

  const filter = await buildPaymentListFilter(req.user);
  const cacheKey = `payments:list:role:${req.user.role}:user:${req.user.id}:page:${page || 'all'}:limit:${limit || 'all'}`;
  const cachedData = await cache.get(cacheKey);
  if (cachedData) {
    return res.json(cachedData);
  }

  let responseData;

  if (page || limit) {
    const paginatedResult = await paginate(Payment, filter, {
      page,
      limit,
      sort: { paymentId: 1 },
      populate: 'shop',
    });
    responseData = {
      data: paginatedResult.data.map(formatPayment),
      pagination: paginatedResult.pagination,
    };
  } else {
    const docs = await Payment.find(filter)
      .sort({ paymentId: 1 })
      .populate('shop')
      .lean();
    responseData = docs.map(formatPayment);
  }

  await cache.set(cacheKey, responseData, 60);
  res.json(responseData);
});

export const createPayment = catchAsync(async (req, res) => {
  const count = await Payment.countDocuments();
  const paymentId = req.validatedBody.paymentId || `PAY-${String(count + 1).padStart(3, '0')}`;

  let shopId = req.validatedBody.shop;
  if (typeof shopId === 'string' && !shopId.match(/^[0-9a-fA-F]{24}$/)) {
    const sk = await Shopkeeper.findOne({ name: shopId });
    if (!sk) throw AppError.validation(`Shopkeeper not found: ${shopId}`);
    shopId = sk._id;
  }

  let orderRefId = req.validatedBody.order;
  let orderDoc = null;
  if (orderRefId) {
    if (typeof orderRefId === 'string' && !orderRefId.match(/^[0-9a-fA-F]{24}$/)) {
      orderDoc = await Order.findOne({ orderId: orderRefId });
    } else {
      orderDoc = await Order.findById(orderRefId);
    }
    if (!orderDoc) {
      throw AppError.validation(`Order not found: ${req.validatedBody.order}`);
    }
    orderRefId = orderDoc._id;
  }

  const doc = await runInTransaction(async (session) => {
    const totalVal = req.validatedBody.total ?? (orderDoc ? orderDoc.total : 0);
    const paidVal = req.validatedBody.paid || 0;

    if (paidVal > totalVal) {
      throw AppError.validation('Paid amount cannot exceed total payment amount');
    }

    let isOrderFullyPaid = false;
    if (orderDoc) {
      const existingPayments = await Payment.find({ order: orderRefId }).session(session);
      const totalAlreadyPaid = existingPayments.reduce((sum, p) => sum + p.paid, 0);

      if (totalAlreadyPaid + paidVal > orderDoc.total) {
        throw AppError.validation('Payment amount exceeds order remaining total');
      }

      isOrderFullyPaid = totalAlreadyPaid + paidVal >= orderDoc.total;

      if (isOrderFullyPaid) {
        await Order.findByIdAndUpdate(orderRefId, { status: 'paid' }, { session });
      }
    }

    const calculatedStatus =
      req.validatedBody.status || (orderDoc ? (isOrderFullyPaid ? 'paid' : 'partial') : 'paid');

    const created = await Payment.create([{
      paymentId,
      shop: shopId,
      order: orderRefId,
      total: totalVal,
      paid: paidVal,
      type: req.validatedBody.type,
      due: req.validatedBody.due,
      status: calculatedStatus,
    }], { session });

    return created[0];
  });

  await cache.del('payments:list:*');
  if (orderRefId) {
    await cache.del('orders:list:*');
  }

  const populatedDoc = await Payment.findById(doc._id).populate('shop');
  res.status(201).json(formatPayment(populatedDoc));
});

export const updatePayment = catchAsync(async (req, res) => {
  const updates = { ...req.validatedBody };
  if (updates.shop && typeof updates.shop === 'string' && !updates.shop.match(/^[0-9a-fA-F]{24}$/)) {
    const sk = await Shopkeeper.findOne({ name: updates.shop });
    if (sk) updates.shop = sk._id;
  }
  if (updates.order && typeof updates.order === 'string' && !updates.order.match(/^[0-9a-fA-F]{24}$/)) {
    const ord = await Order.findOne({ orderId: updates.order });
    if (ord) updates.order = ord._id;
  }

  const updatedDoc = await runInTransaction(async (session) => {
    const payment = await Payment.findOne({ paymentId: req.params.paymentId }).session(session);
    if (!payment) throw AppError.notFound('Payment not found');

    const totalVal = updates.total !== undefined ? updates.total : payment.total;
    const paidVal = updates.paid !== undefined ? updates.paid : payment.paid;

    if (paidVal > totalVal) {
      throw AppError.validation('Paid amount cannot exceed total payment amount');
    }

    const orderId = updates.order !== undefined ? updates.order : payment.order;

    if (orderId) {
      const orderDoc = await Order.findById(orderId).session(session);
      if (!orderDoc) throw AppError.validation('Order not found');

      const otherPayments = await Payment.find({
        order: orderId,
        _id: { $ne: payment._id }
      }).session(session);

      const otherPaidSum = otherPayments.reduce((sum, p) => sum + p.paid, 0);

      if (otherPaidSum + paidVal > orderDoc.total) {
        throw AppError.validation('Payment amount exceeds order remaining total');
      }

      const isOrderFullyPaid = otherPaidSum + paidVal >= orderDoc.total;
      const newOrderStatus = isOrderFullyPaid ? 'paid' : 'pending';
      await Order.findByIdAndUpdate(orderId, { status: newOrderStatus }, { session });
    }

    Object.assign(payment, updates);
    if (updates.order === null) {
      payment.order = undefined;
    }

    payment.status = paidVal >= totalVal ? 'paid' : (paidVal > 0 ? 'partial' : 'pending');
    await payment.save({ session });
    return payment;
  });

  await cache.del('payments:list:*');
  await cache.del('orders:list:*');

  const populatedDoc = await Payment.findById(updatedDoc._id).populate('shop');
  res.json(formatPayment(populatedDoc));
});

export const payOrder = catchAsync(async (req, res) => {
  const { orderId, amount } = req.body;
  if (!amount || amount <= 0) throw AppError.validation('Amount must be greater than 0');

  const orderDoc = await Order.findOne({ orderId: orderId });
  if (!orderDoc) throw AppError.notFound('Order not found');

  if (req.user.role === 'shopkeeper') {
    const shopUser = await User.findById(req.user.id);
    const skDoc = await Shopkeeper.findById(orderDoc.shop);
    if (!shopUser || !skDoc || skDoc.owner !== shopUser.name) {
        throw AppError.forbidden('You can only pay for your own orders');
    }
  }

  const add = Number(amount);

  const payment = await runInTransaction(async (session) => {
    let p = await Payment.findOne({ order: orderDoc._id }).session(session);
    if (!p) {
      const payCount = await Payment.countDocuments().session(session);
      p = await Payment.create([{
        paymentId: `PAY-${String(payCount + 1).padStart(3, '0')}`,
        shop: orderDoc.shop,
        order: orderDoc._id,
        total: orderDoc.total,
        paid: 0,
        type: orderDoc.pay || 'installment',
        status: 'pending',
        due: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      }], { session }).then(res => res[0]);
    }

    if (p.paid + add > p.total) {
      throw AppError.validation('Payment amount exceeds order remaining total or payment changed concurrently');
    }

    p.paid += add;
    p.status = p.paid >= p.total ? 'paid' : 'partial';
    await p.save({ session });
    
    const updatedPayment = p;

    if (updatedPayment.status === 'paid') {
      await Order.findByIdAndUpdate(orderDoc._id, { status: 'paid' }, { session });
    }

    return updatedPayment;
  });

  // Phase 6: Notify Shopkeeper
  const shopDoc = await Shopkeeper.findById(orderDoc.shop);
  if (shopDoc) {
    const shopUser = await User.findOne({ name: shopDoc.owner, role: 'shopkeeper' });
    if (shopUser) {
      await NotificationService.send({
        title: 'Payment Received',
        message: `Payment of ${add} received for Order ${orderDoc.orderId || orderDoc._id}.`,
        type: 'PAYMENT',
        priority: 'HIGH',
        module: 'Payment',
        documentId: payment._id,
        sender: req.user.id
      }, [shopUser._id]);
    }
  }

  // Phase 6: Notify Admin
  await NotificationService.send({
    title: 'Payment Collected',
    message: `Payment of ${add} collected for Order ${orderDoc.orderId || orderDoc._id}.`,
    type: 'PAYMENT',
    priority: 'MEDIUM',
    module: 'Payment',
    documentId: payment._id,
    sender: req.user.id
  }, null, 'admin');

  await cache.del('payments:list:*');
  await cache.del('orders:list:*');

  res.json({ success: true, data: formatPayment(payment) });
});
