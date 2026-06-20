import { Router } from 'express';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import Shopkeeper from '../models/Shopkeeper.js';
import authenticate from '../middleware/auth.js';
import { requirePermission } from '../utils/permissions.js';
import catchAsync from '../utils/catchAsync.js';
import { getPagination, getSafeSort } from '../utils/pagination.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('payments.read'), catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const sort = getSafeSort(req.query.sort, ['createdAt', 'amount', 'status', 'paymentMethod'], { createdAt: -1 });

  const filter = {};
  if (req.user.role === 'shopkeeper') {
    const userDoc = await User.findById(req.user.id);
    const ownerName = userDoc ? userDoc.name : '';
    const shops = await Shopkeeper.find({ owner: ownerName }).select('_id');
    filter.shopkeeper = { $in: shops.map(s => s._id) };
  }

  const [docs, total] = await Promise.all([
    Transaction.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('shopkeeper')
      .populate('order')
      .lean(),
    Transaction.countDocuments(filter)
  ]);

  const formattedData = docs.map(t => ({
    id: t._id.toString(),
    transactionId: t.transactionId,
    amount: t.amount,
    status: t.status,
    paymentMethod: t.paymentMethod,
    gatewayResponse: t.gatewayResponse,
    shop: t.shopkeeper?.name || 'Unknown Shop',
    orderId: t.order?.orderId || 'N/A',
    createdAt: t.createdAt
  }));
  
  res.json({
    success: true,
    data: formattedData,
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

export default router;
