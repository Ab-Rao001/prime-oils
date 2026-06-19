import { Router } from 'express';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import Shopkeeper from '../models/Shopkeeper.js';
import authenticate from '../middleware/auth.js';
import authorize from '../middleware/authorize.js';
import catchAsync from '../utils/catchAsync.js';
import { paginate } from '../utils/pagination.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('admin', 'shopkeeper'), catchAsync(async (req, res) => {
  const page = req.query.page ? parseInt(req.query.page, 10) : null;
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;

  const filter = {};
  if (req.user.role === 'shopkeeper') {
    const userDoc = await User.findById(req.user.id);
    const ownerName = userDoc ? userDoc.name : '';
    const shops = await Shopkeeper.find({ owner: ownerName }).select('_id');
    filter.shopkeeper = { $in: shops.map(s => s._id) };
  }

  if (page || limit) {
    const paginatedResult = await paginate(Transaction, filter, {
      page,
      limit,
      sort: { createdAt: -1 },
      populate: ['shopkeeper', 'order'],
    });
    
    // Format the response slightly to send cleanly
    const formattedData = paginatedResult.data.map(t => ({
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
      pagination: paginatedResult.pagination,
    });
  } else {
    const docs = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .populate('shopkeeper')
      .populate('order')
      .lean();
      
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
    
    res.json(formattedData);
  }
}));

export default router;
