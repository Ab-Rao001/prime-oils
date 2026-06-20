import CreditNote from '../models/CreditNote.js';
import Refund from '../models/Refund.js';
import ReturnRequest from '../models/ReturnRequest.js';
import Shopkeeper from '../models/Shopkeeper.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { formatCreditNote, formatRefund } from '../utils/format.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { getPagination, getSafeSort } from '../utils/pagination.js';

async function buildCreditNoteFilter(user) {
  const filter = {};
  if (user.role === 'shopkeeper') {
    const userDoc = await User.findById(user.id);
    const shops = await Shopkeeper.find({ owner: userDoc?.name || '' }).select('_id');
    filter.shop = { $in: shops.map(s => s._id) };
  } else if (user.role === 'salesman') {
    const shopIds = await Order.distinct('shop', { man: user.id });
    filter.shop = { $in: shopIds };
  } else if (user.role === 'supplier') {
    const products = await Product.find({ supplier: user.id }).select('_id');
    const returns = await ReturnRequest.find({ 'products.productId': { $in: products.map(p => p._id) } }).select('_id');
    filter.returnRequest = { $in: returns.map(r => r._id) };
  }
  return filter;
}

export const getCreditNotes = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const sort = getSafeSort(req.query.sort, ['createdAt', 'creditNoteId', 'total', 'status'], { createdAt: -1 });

  const filter = await buildCreditNoteFilter(req.user);

  const [docs, total] = await Promise.all([
    CreditNote.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('shop', 'name')
      .populate('order', 'orderId')
      .populate('returnRequest', 'rmaId')
      .lean(),
    CreditNote.countDocuments(filter)
  ]);

  res.json({
    data: docs.map(formatCreditNote),
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

export const getCreditNote = catchAsync(async (req, res) => {
  const filter = await buildCreditNoteFilter(req.user);
  const doc = await CreditNote.findOne({ _id: req.params.id, ...filter })
    .populate('shop', 'name')
    .populate('order', 'orderId total')
    .populate('returnRequest', 'rmaId reason');
  if (!doc) throw AppError.notFound('Credit note not found');
  res.json(formatCreditNote(doc));
});

export const getRefunds = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const sort = getSafeSort(req.query.sort, ['createdAt', 'refundId', 'amount', 'status'], { createdAt: -1 });

  const filter = {};
  if (req.user.role === 'shopkeeper') {
    const userDoc = await User.findById(req.user.id);
    const shops = await Shopkeeper.find({ owner: userDoc?.name || '' }).select('_id');
    filter.shop = { $in: shops.map(s => s._id) };
  } else if (req.user.role === 'supplier') {
    const products = await Product.find({ supplier: req.user.id }).select('_id');
    const returns = await ReturnRequest.find({ 'products.productId': { $in: products.map(p => p._id) } }).select('_id');
    filter.returnRequest = { $in: returns.map(r => r._id) };
  }
  
  const [docs, total] = await Promise.all([
    Refund.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('shop', 'name')
      .populate('returnRequest', 'rmaId')
      .lean(),
    Refund.countDocuments(filter)
  ]);

  res.json({
    data: docs.map(formatRefund),
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

export const getReturnSummary = catchAsync(async (req, res) => {
  const filter = {};
  if (req.user.role === 'supplier') {
    const products = await Product.find({ supplier: req.user.id }).select('_id');
    filter['products.productId'] = { $in: products.map(p => p._id) };
  } else if (req.user.role === 'shopkeeper') {
    const userDoc = await User.findById(req.user.id);
    const shops = await Shopkeeper.find({ owner: userDoc?.name || '' }).select('_id');
    filter.customer = { $in: shops.map(s => s._id) };
  } else if (req.user.role === 'salesman') {
    const shopIds = await Order.distinct('shop', { man: req.user.id });
    filter.customer = { $in: shopIds };
  }

  const statuses = await ReturnRequest.aggregate([
    { $match: filter },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const reasons = await ReturnRequest.aggregate([
    { $match: filter },
    { $group: { _id: '$reason', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  const settled = await ReturnRequest.aggregate([
    { $match: { ...filter, settlementStatus: 'SETTLED' } },
    { $group: { _id: null, totalAmount: { $sum: '$settlementAmount' }, count: { $sum: 1 } } },
  ]);

  res.json({
    byStatus: statuses.reduce((a, s) => ({ ...a, [s._id]: s.count }), {}),
    byReason: reasons,
    settledTotal: settled[0]?.totalAmount || 0,
    settledCount: settled[0]?.count || 0,
  });
});
