import Order from '../models/Order.js';
import Shopkeeper from '../models/Shopkeeper.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Transaction from '../models/Transaction.js';
import Payment from '../models/Payment.js';
import StockMovement from '../models/StockMovement.js';
import Dispatch from '../models/Dispatch.js';
import { formatOrder } from '../utils/format.js';
import { getPagination, getSafeSort } from '../utils/pagination.js';
import { cache } from '../utils/cache.js';
import { runInTransaction } from '../utils/transaction.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import AuditService from '../services/AuditService.js';
import StockService from '../services/StockService.js';
import ApprovalService from '../services/ApprovalService.js';
import NotificationService from '../services/NotificationService.js';

const ALLOWED_TRANSITIONS = {
  pending: {
    supplier: ['confirmed', 'cancelled'],
    admin: ['confirmed', 'cancelled', 'ready_for_dispatch'],
  },
  pending_approval: {
    admin: ['confirmed', 'cancelled'],
  },
  paid: {
    supplier: ['ready_for_dispatch', 'cancelled'],
    admin: ['ready_for_dispatch', 'cancelled'],
  },
  confirmed: {
    supplier: ['ready_for_dispatch'],
    admin: ['ready_for_dispatch', 'cancelled'],
  },
  ready_for_dispatch: {
    admin: ['cancelled'],
    supplier: [],
  },
  in_transit: {
    admin: [],
  },
  partially_delivered: {
    admin: ['return_requested'],
  },
  delivered: {
    admin: ['return_requested'],
  },
  cancelled: {},
  return_requested: {
    admin: ['returned', 'confirmed'],
  },
  returned: {},
};



const buildOrderScope = async (user) => {
  const filter = { isDeleted: { $ne: true } };
  if (user.role === 'shopkeeper') {
    const userDoc = await User.findById(user.id);
    const ownerName = userDoc ? userDoc.name : '';
    const shops = await Shopkeeper.find({ owner: ownerName }).select('_id');
    filter.shop = { $in: shops.map(s => s._id) };
  } else if (user.role === 'salesman') {
    filter.man = user.id;
  } else if (user.role === 'supplier') {
    // Orders contain line items which contain products. We need to find orders that have products belonging to this supplier.
    const products = await Product.find({ supplier: user.id }).select('_id');
    filter['lineItems.productId'] = { $in: products.map(p => p._id) };
  }
  return filter;
};

export const getOrders = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const statusFilter = req.query.status || null;
  const statusParam = req.query.status || 'all';
  const sort = getSafeSort(req.query.sort, ['createdAt', 'status', 'total', 'date'], { createdAt: -1 });

  const cacheKey = `orders:list:role:${req.user.role}:user:${req.user.id}:page:${page}:limit:${limit}:status:${statusParam}:sort:${JSON.stringify(sort)}`;
  const cachedData = await cache.get(cacheKey);
  if (cachedData) {
    return res.json(cachedData);
  }

  const filter = await buildOrderScope(req.user);
  if (req.query.status && req.query.status !== 'all') {
    filter.status = req.query.status;
  }
  if (statusFilter) {
    filter.status = statusFilter;
  }

  // Phase 6: Exclude orders that are already assigned to an active dispatch route
  if (filter.status === 'ready_for_dispatch') {
    const activeDispatches = await Dispatch.find({ status: { $in: ['scheduled', 'in-transit'] } }).select('orders');
    const activeOrderIds = activeDispatches.flatMap(d => d.orders);
    if (activeOrderIds.length > 0) {
      filter._id = { $nin: activeOrderIds };
    }
  }

  const populateOpts = ['shop', 'man'];

  const [docs, total] = await Promise.all([
    Order.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('-lineItems') // Exclude heavy lineItems array in list view
      .populate(populateOpts)
      .lean(),
    Order.countDocuments(filter)
  ]);

  const responseData = {
    data: docs.map(formatOrder),
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

export const getOrder = catchAsync(async (req, res) => {
  const id = req.params.id;
  const scope = await buildOrderScope(req.user);
  const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { orderId: id };
  
  const order = await Order.findOne({ ...query, ...scope })
    .populate('shop')
    .populate('man')
    .lean();
    
  if (!order) {
    throw AppError.notFound('Order not found or you do not have permission to view it');
  }

  res.json(formatOrder(order));
});

export const createOrder = catchAsync(async (req, res) => {
  const count = await Order.countDocuments();
  const orderId = req.validatedBody.orderId || `ORD-${String(count + 1).padStart(3, '0')}`;

  let shopId = req.validatedBody.shopkeeperId || req.validatedBody.shop;
  if (typeof shopId === 'string' && !shopId.match(/^[0-9a-fA-F]{24}$/)) {
    let sk = await Shopkeeper.findOne({ $or: [{ name: shopId }, { owner: shopId }] });
    if (!sk) {
      const userSk = await User.findOne({ name: shopId, role: 'shopkeeper' });
      if (userSk) {
        sk = await Shopkeeper.create({
          name: userSk.name + ' Store',
          owner: userSk.name,
          location: userSk.address || '',
          contact: userSk.phone || '',
          status: 'active'
        });
      } else {
        throw AppError.validation(`Shopkeeper not found: ${shopId}`);
      }
    }
    shopId = sk._id;
  }

  let manId = req.validatedBody.man;
  if (manId === '') manId = undefined;
  if (typeof manId === 'string' && !manId.match(/^[0-9a-fA-F]{24}$/)) {
    const u = await User.findOne({ name: manId });
    if (u) manId = u._id;
    else manId = undefined;
  }

  // FORCE salesman to their own ID
  if (req.user.role === 'salesman') {
    manId = req.user.id;
  }

  const { items, total, status, date, pay } = req.validatedBody;
  const totalQuantity = items.reduce((acc, item) => acc + item.quantity, 0);
  const lineItems = [];

  const skDoc = await Shopkeeper.findById(shopId);
  if (!skDoc) throw AppError.notFound(`Shopkeeper not found: ${shopId}`);

  // Enforce Shopkeeper Ownership
  if (req.user.role === 'shopkeeper') {
    const shopUser = await User.findById(req.user.id);
    if (!shopUser || skDoc.owner !== shopUser.name) {
      throw AppError.forbidden('You do not have permission to place orders for this shop');
    }
  }

  const doc = await runInTransaction(async (session) => {
    let calculatedTotal = 0;
    for (const item of items) {
      if (Number(item.quantity) <= 0) throw AppError.validation('Item quantity must be strictly greater than 0');
      
      const productQuery = { _id: item.productId };
      if (req.user.role === 'supplier') productQuery.supplier = req.user.id;
      
      const product = await Product.findOne(productQuery).session(session);
      if (!product) throw AppError.notFound(`Product not found or access denied: ${item.productId}`);
      
      const costPrice = product.costPrice || 0;
      const totalItemCost = costPrice * Number(item.quantity);
      lineItems.push({
        productId: product._id,
        productName: product.name,
        quantity: Number(item.quantity),
        unitCost: costPrice,
        totalCost: totalItemCost
      });
      calculatedTotal += product.price * Number(item.quantity);
    }

    const totalCogs = lineItems.reduce((acc, i) => acc + i.totalCost, 0);

    const finalTotal = total !== undefined ? total : calculatedTotal;
    if (total !== undefined && Math.abs(total - calculatedTotal) > 0.01) {
      throw AppError.validation(`Total price mismatch. Calculated: ${calculatedTotal}, Provided: ${total}`);
    }

    let finalStatus = status || 'pending';
    let requiresApproval = false;
    
    // Credit Limit Verification
    const currentDebt = skDoc ? skDoc.credit : 0;
    const creditLimit = skDoc ? skDoc.creditLimit : 0;
    
    if (creditLimit > 0 && (currentDebt + finalTotal) > creditLimit) {
        if (req.user.role === 'admin' && req.validatedBody.adminOverride) {
            await AuditService.log({
                user: req.user.id,
                action: 'OVERRIDE_CREDIT_LIMIT',
                collectionName: 'Order',
                documentId: null,
                newValue: { overrideReason: req.validatedBody.overrideReason },
                session
            });
        } else {
            finalStatus = 'pending_approval';
            requiresApproval = true;
        }
    }

    const created = await Order.create([{
      orderId,
      shop: shopId,
      man: manId,
      items: totalQuantity,
      lineItems,
      total: finalTotal,
      totalCogs: totalCogs,
      status: finalStatus,
      date: date || new Date().toISOString().slice(0, 10),
      pay: pay || 'installment',
      paymentStatus: 'pending',
      paidAmount: 0,
    }], { session });

    const orderDocCreated = created[0];

    if (requiresApproval) {
        await ApprovalService.requestApproval({
            requester: req.user.id,
            type: 'CREDIT_LIMIT_EXCEEDED',
            referenceDocument: orderDocCreated._id,
            collectionName: 'Order',
            details: {
                currentDebt,
                creditLimit,
                orderTotal: finalTotal,
                excess: (currentDebt + finalTotal) - creditLimit
            },
            session
        });
    } else {
        // Only deduct stock if the order is not pending approval
        const stockMovements = lineItems.map(item => ({
            productId: item.productId,
            quantityChanged: -Number(item.quantity),
            movementType: 'sale',
            referenceDocument: orderDocCreated._id,
            user: req.user.id
        }));
        if (stockMovements.length > 0) {
            await StockService.bulkMoveStock(stockMovements, session);
        }
    }

    // Simulate Fake Transaction for module requirement
    const txnCount = await Transaction.countDocuments().session(session);
    await Transaction.create([{
      transactionId: `TXN-${String(txnCount + 1).padStart(5, '0')}`,
      order: orderDocCreated._id,
      shopkeeper: shopId,
      amount: total !== undefined ? total : calculatedTotal,
      status: 'pending'
    }], { session });

    // Auto-create Payment Ledger Entry
    const payCount = await Payment.countDocuments().session(session);
    await Payment.create([{
      paymentId: `PAY-${String(payCount + 1).padStart(3, '0')}`,
      shop: shopId,
      order: orderDocCreated._id,
      total: total !== undefined ? total : calculatedTotal,
      paid: 0,
      type: pay || 'installment',
      status: 'pending',
      due: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // 30 days due
    }], { session });

    // Phase 6: Notify Suppliers and Shopkeepers of the new order
    await NotificationService.send({
      title: 'New Order Received',
      message: `New order ${orderDocCreated.orderId} received from ${skDoc ? skDoc.name : 'Unknown Shop'}`,
      type: 'ORDER',
      priority: 'HIGH',
      module: 'OrderManagement',
      documentId: orderDocCreated._id,
      sender: req.user.id
    }, null, 'all', session);

    return orderDocCreated;
  });

  // Assign referenceDocument to the StockMovements created during this transaction
  await StockMovement.updateMany(
    { referenceDocument: null, user: req.user.id },
    { referenceDocument: doc._id }
  );

  await AuditService.log({
    user: req.user.id,
    action: 'CREATE_ORDER',
    collectionName: 'Order',
    documentId: doc._id,
    newValue: { orderId: doc.orderId, total: doc.total }
  });

  await cache.del('orders:list:*');
  await cache.del('products:list:*');

  const scope = await buildOrderScope(req.user);
  const populatedDoc = await Order.findOne({ _id: doc._id, ...scope }).populate('shop').populate('man');
  res.status(201).json(formatOrder(populatedDoc));
});

export const updateOrder = catchAsync(async (req, res) => {
  const updates = { ...req.validatedBody };
  const scope = await buildOrderScope(req.user);

  if (updates.shop) {
    if (typeof updates.shop === 'string' && !updates.shop.match(/^[0-9a-fA-F]{24}$/)) {
      const sk = await Shopkeeper.findOne({ $or: [{ name: updates.shop }, { owner: updates.shop }] });
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

  const query = req.params.orderId.match(/^[0-9a-fA-F]{24}$/) ? { _id: req.params.orderId } : { orderId: req.params.orderId };
  let doc;

  if (updates.items !== undefined) {
    const order = await Order.findOne({ ...query, ...scope });
    if (!order) throw AppError.notFound('Order not found or access denied');
    
    if (order.status !== 'pending') {
      throw AppError.validation('Cannot modify items of a non-pending order');
    }

    doc = await runInTransaction(async (session) => {
      // 1. Revert old stock adjustments via Ledger (Bulk)
      const revertMovements = order.lineItems.map(item => ({
        productId: item.productId,
        quantityChanged: item.quantity,
        movementType: 'return',
        referenceDocument: order._id,
        user: req.user.id
      }));
      if (revertMovements.length > 0) {
        await StockService.bulkMoveStock(revertMovements, session);
      }

      // 2. Apply new stock adjustments via Ledger, calculate quantity and total
      const lineItems = [];
      let calculatedTotal = 0;
      const totalQuantity = updates.items.reduce((acc, item) => acc + item.quantity, 0);

      // We still need costPrice to calculate total, but wait! We can fetch products in bulk and compute total.
      const productIds = updates.items.map(i => i.productId);
      const products = await Product.find({ _id: { $in: productIds } }).session(session).lean();
      const productMap = new Map(products.map(p => [p._id.toString(), p]));

      const newMovements = [];

      for (const item of updates.items) {
        if (Number(item.quantity) <= 0) throw AppError.validation('Item quantity must be strictly greater than 0');
        const product = productMap.get(item.productId.toString());
        if (!product) throw AppError.notFound(`Product not found: ${item.productId}`);

        newMovements.push({
          productId: item.productId,
          quantityChanged: -Number(item.quantity),
          movementType: 'sale',
          referenceDocument: order._id,
          user: req.user.id
        });

        const costPrice = product.costPrice || 0;
        const totalItemCost = costPrice * Number(item.quantity);
        lineItems.push({
          productId: product._id,
          productName: product.name,
          quantity: Number(item.quantity),
          unitCost: costPrice,
          totalCost: totalItemCost
        });
        calculatedTotal += product.price * Number(item.quantity);
      }

      if (newMovements.length > 0) {
        await StockService.bulkMoveStock(newMovements, session);
      }
      
      const totalCogs = lineItems.reduce((acc, i) => acc + i.totalCost, 0);

      const finalTotal = updates.total !== undefined ? updates.total : calculatedTotal;
      if (updates.total !== undefined && Math.abs(updates.total - calculatedTotal) > 0.01) {
        throw AppError.validation(`Total price mismatch. Calculated: ${calculatedTotal}, Provided: ${updates.total}`);
      }

      updates.lineItems = lineItems;
      updates.items = totalQuantity;
      updates.total = finalTotal;
      updates.totalCogs = totalCogs;

      const updated = await Order.findOneAndUpdate(
        { _id: order._id, status: 'pending', __v: order.__v },
        { 
          $set: updates,
          $inc: { __v: 1 }
        },
        { session, new: true }
      ).populate('shop').populate('man');

      if (!updated) {
        throw AppError.conflict('Order was updated concurrently or is no longer pending');
      }

      await AuditService.log({
        user: req.user.id,
        action: 'UPDATE_ORDER',
        collectionName: 'Order',
        documentId: updated._id,
        newValue: updates,
        session
      });

      return updated;
    });
  } else {
    const orderToUpdate = await Order.findOne({ ...query, ...scope });
    if (!orderToUpdate) throw AppError.notFound('Order not found or access denied');

    doc = await Order.findOneAndUpdate(
      { _id: orderToUpdate._id, __v: orderToUpdate.__v },
      { 
        $set: updates,
        $inc: { __v: 1 }
      },
      { new: true }
    ).populate('shop').populate('man');
    
    if (!doc) {
      throw AppError.conflict('Order was updated concurrently');
    }
  }

  await cache.del('orders:list:*');
  await cache.del('products:list:*');

  res.json(formatOrder(doc));
});

export const updateOrderStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.validatedBody;
  const scope = await buildOrderScope(req.user);

  if (!status) {
    throw AppError.validation('Status is required');
  }

  const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { orderId: id };
  const order = await Order.findOne({ ...query, ...scope });
  if (!order) {
    throw AppError.notFound('Order not found or access denied');
  }

  if (order.isDeleted) {
    throw AppError.validation('Cannot change status of a deleted order');
  }

  const currentStatus = order.status;

  if (currentStatus === status) {
    return res.json(formatOrder(order));
  }

  const roleAllowed = ALLOWED_TRANSITIONS[currentStatus]?.[req.user.role];
  if (!roleAllowed || !roleAllowed.includes(status)) {
    throw AppError.forbidden(`Role '${req.user.role}' cannot transition order from '${currentStatus}' to '${status}'`);
  }

  await runInTransaction(async (session) => {
    // OCC and conditional update to prevent race conditions in state transition
    const updatedOrder = await Order.findOneAndUpdate(
       { _id: order._id, status: currentStatus, __v: order.__v },
       { 
         $set: { status },
         $inc: { __v: 1 }
       },
       { new: true, session }
    );
    if (!updatedOrder) {
       throw AppError.conflict('Order status was modified concurrently. Please refresh.');
    }

    if (status === 'cancelled') {
      // Check if stock was previously deducted
      const stockMovements = await StockMovement.find({
        referenceDocument: order._id,
        movementType: { $in: ['sale', 'CREDIT_APPROVED_SALE'] }
      }).session(session);

      if (stockMovements.length > 0) {
        const cancellationMovements = order.lineItems.map(item => ({
            productId: item.productId,
            quantityChanged: item.quantity,
            movementType: 'ORDER_CANCELLATION_RETURN',
            referenceDocument: order._id,
            user: req.user.id
        }));
        if (cancellationMovements.length > 0) {
            await StockService.bulkMoveStock(cancellationMovements, session);
        }
      }
    }

    await AuditService.log({
      user: req.user.id,
      action: 'UPDATE_ORDER_STATUS',
      collectionName: 'Order',
      documentId: order._id,
      oldValue: { status: currentStatus },
      newValue: { status },
      session
    });

    if (status === 'ready_for_dispatch') {
      const shopDoc = await Shopkeeper.findById(order.shop).session(session);
      if (shopDoc) {
        const shopUser = await User.findOne({ name: shopDoc.owner, role: 'shopkeeper' }).session(session);
        if (shopUser) {
          await NotificationService.send({
            title: 'Order Ready for Dispatch',
            message: `Order ${order.orderId || order._id} is ready for dispatch`,
            type: 'DELIVERY',
            priority: 'HIGH',
            module: 'OrderManagement',
            documentId: order._id
          }, [shopUser._id], null, session);
        }
      }
    }
  });

  try {
    const { getIO } = await import('../utils/socket.js');
    const io = getIO();
    io.emit('ORDER_STATUS_CHANGED', {
      orderId: order.orderId || order._id,
      previousStatus: currentStatus,
      newStatus: status,
      updatedBy: req.user.id
    });
  } catch (err) {
    console.error('Socket emit failed in updateOrderStatus:', err.message);
  }

  await cache.del('orders:list:*');

  const scopeFilter = await buildOrderScope(req.user);
  const populatedOrder = await Order.findOne({ _id: order._id, ...scopeFilter }).populate('shop').populate('man');
  res.json(formatOrder(populatedOrder));
});
