import Payment from '../models/Payment.js';
import Shopkeeper from '../models/Shopkeeper.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { formatPayment } from '../utils/format.js';
import { getPagination, getSafeSort } from '../utils/pagination.js';
import { cache } from '../utils/cache.js';
import { runInTransaction } from '../utils/transaction.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import NotificationService from '../services/NotificationService.js';
import AuditService from '../services/AuditService.js';

async function buildPaymentScope(user) {
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
  const { page, limit, skip } = getPagination(req.query);
  const sort = getSafeSort(req.query.sort, ['createdAt', 'paymentId', 'total', 'paid', 'due', 'status'], { paymentId: 1 });

  const filter = await buildPaymentScope(req.user);
  const cacheKey = `payments:list:role:${req.user.role}:user:${req.user.id}:page:${page}:limit:${limit}:sort:${JSON.stringify(sort)}`;
  const cachedData = await cache.get(cacheKey);
  if (cachedData) {
    return res.json(cachedData);
  }

  const [docs, total] = await Promise.all([
    Payment.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('shop')
      .lean(),
    Payment.countDocuments(filter)
  ]);

  const responseData = {
    data: docs.map(formatPayment),
    pagination: {
      page,
      limit,
      count: total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1,
    }
  };

  await cache.set(cacheKey, responseData, 10);
  res.json(responseData);
});

export const getPayment = catchAsync(async (req, res) => {
  const id = req.params.id || req.params.paymentId;
  const scope = await buildPaymentScope(req.user);
  const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { paymentId: id };
  
  const payment = await Payment.findOne({ ...query, ...scope }).populate('shop').lean();
  if (!payment) {
    throw AppError.notFound('Payment not found or access denied');
  }

  res.json(formatPayment(payment));
});

export const createPayment = catchAsync(async (req, res) => {
  const scope = await buildPaymentScope(req.user);
  const count = await Payment.countDocuments();
  const paymentId = req.validatedBody.paymentId || `PAY-${String(count + 1).padStart(3, '0')}`;

  let shopId = req.validatedBody.shop;
  
  if (!shopId && req.user.role === 'shopkeeper') {
    const userDoc = await User.findById(req.user.id);
    const sk = await Shopkeeper.findOne({ owner: userDoc.name });
    if (sk) shopId = sk._id;
  }

  if (typeof shopId === 'string' && !shopId.match(/^[0-9a-fA-F]{24}$/)) {
    const sk = await Shopkeeper.findOne({ $or: [{ name: shopId }, { owner: shopId }] });
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
      const newPaymentStatus = isOrderFullyPaid ? 'paid' : ((totalAlreadyPaid + paidVal > 0) ? 'partial' : 'pending');
      
      const validStatusesToUpdate = ['pending', 'pending_approval'];
      const newOrderStatus = (isOrderFullyPaid && validStatusesToUpdate.includes(orderDoc.status)) 
        ? 'paid' 
        : orderDoc.status;

      const updatedOrder = await Order.findOneAndUpdate(
        { _id: orderRefId, __v: orderDoc.__v },
        { 
          $set: { 
            paymentStatus: newPaymentStatus, 
            paidAmount: totalAlreadyPaid + paidVal,
            status: newOrderStatus
          },
          $inc: { __v: 1 }
        },
        { new: true, session }
      );
      if (!updatedOrder) throw AppError.conflict('Order was updated concurrently');
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

    await AuditService.log({
      user: req.user.id,
      action: 'CREATE_PAYMENT',
      collectionName: 'Payment',
      documentId: created[0]._id,
      newValue: { paymentId, paid: paidVal, total: totalVal },
      session
    });

    return created[0];
  });

  await cache.del('payments:list:*');
  if (orderRefId) {
    await cache.del('orders:list:*');
  }

  const populatedDoc = await Payment.findOne({ _id: doc._id, ...scope }).populate('shop');
  res.status(201).json(formatPayment(populatedDoc));
});

export const updatePayment = catchAsync(async (req, res) => {
  const updates = { ...req.validatedBody };
  const scope = await buildPaymentScope(req.user);

  if (updates.shop && typeof updates.shop === 'string' && !updates.shop.match(/^[0-9a-fA-F]{24}$/)) {
    const sk = await Shopkeeper.findOne({ $or: [{ name: updates.shop }, { owner: updates.shop }] });
    if (sk) updates.shop = sk._id;
  }
  if (updates.order && typeof updates.order === 'string' && !updates.order.match(/^[0-9a-fA-F]{24}$/)) {
    const ord = await Order.findOne({ orderId: updates.order });
    if (ord) updates.order = ord._id;
  }

  const query = req.params.paymentId.match(/^[0-9a-fA-F]{24}$/) ? { _id: req.params.paymentId } : { paymentId: req.params.paymentId };

  const updatedDoc = await runInTransaction(async (session) => {
    const payment = await Payment.findOne({ ...query, ...scope }).session(session);
    if (!payment) throw AppError.notFound('Payment not found or access denied');

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
      const newPaymentStatus = isOrderFullyPaid ? 'paid' : ((otherPaidSum + paidVal > 0) ? 'partial' : 'pending');
      
      const updatedOrder = await Order.findOneAndUpdate(
        { _id: orderId, __v: orderDoc.__v },
        { 
          $set: { 
            paymentStatus: newPaymentStatus, 
            paidAmount: otherPaidSum + paidVal,
            status: isOrderFullyPaid ? 'paid' : orderDoc.status
          },
          $inc: { __v: 1 }
        },
        { new: true, session }
      );
      if (!updatedOrder) throw AppError.conflict('Order was updated concurrently');
    }

    const newPaymentStatus = paidVal >= totalVal ? 'paid' : (paidVal > 0 ? 'partial' : 'pending');

    const finalUpdates = { ...updates, status: newPaymentStatus };
    if (updates.order === null) finalUpdates.order = undefined;

    const savedPayment = await Payment.findOneAndUpdate(
      { _id: payment._id, __v: payment.__v },
      { $set: finalUpdates, $inc: { __v: 1 } },
      { new: true, session }
    );
    if (!savedPayment) throw AppError.conflict('Payment was updated concurrently');

    await AuditService.log({
      user: req.user.id,
      action: 'UPDATE_PAYMENT',
      collectionName: 'Payment',
      documentId: savedPayment._id,
      newValue: updates,
      session
    });

    return savedPayment;
  });

  await cache.del('payments:list:*');
  await cache.del('orders:list:*');

  const populatedDoc = await Payment.findOne({ _id: updatedDoc._id, ...scope }).populate('shop');
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

  const updatedPayment = await runInTransaction(async (session) => {
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
      throw AppError.validation('Payment amount exceeds order remaining total');
    }

    const newPaidAmount = p.paid + add;
    const newStatus = newPaidAmount >= p.total ? 'paid' : 'partial';

    // Atomic update of Payment with OCC
    const pUpdated = await Payment.findOneAndUpdate(
      { _id: p._id, __v: p.__v, paid: { $lte: p.total - add } },
      { 
        $inc: { paid: add, __v: 1 },
        $set: { status: newStatus }
      },
      { new: true, session }
    );

    if (!pUpdated) {
      throw AppError.conflict('Payment was modified concurrently');
    }

    // Atomic update of Order with OCC
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderDoc._id, __v: orderDoc.__v },
      { 
        $set: { 
          paymentStatus: newStatus, 
          paidAmount: newPaidAmount,
          status: newStatus === 'paid' ? 'paid' : orderDoc.status
        },
        $inc: { __v: 1 }
      },
      { new: true, session }
    );

    if (!updatedOrder) {
      throw AppError.conflict('Order was modified concurrently');
    }

    await AuditService.log({
      user: req.user.id,
      action: 'PAYMENT_MADE',
      collectionName: 'Payment',
      documentId: pUpdated._id,
      newValue: { amountPaid: add, currentTotalPaid: pUpdated.paid },
      session
    });

    return pUpdated;
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
        documentId: updatedPayment._id,
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
    documentId: updatedPayment._id,
    sender: req.user.id
  }, null, 'admin');

  await cache.del('payments:list:*');
  await cache.del('orders:list:*');

  res.json({ success: true, data: formatPayment(updatedPayment) });
});
