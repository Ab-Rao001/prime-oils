import { Router } from 'express';
import ChartData from '../models/ChartData.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Payment from '../models/Payment.js';
import authenticate from '../middleware/auth.js';
import { requirePermission } from '../utils/permissions.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { getChartScope } from '../utils/chartScope.js';

const router = Router();

router.use(authenticate);
router.use(requirePermission('reports.read'));

router.get('/:key', catchAsync(async (req, res) => {
  const { key } = req.params;
  const scope = await getChartScope(req.user);
  if (!scope) {
    throw AppError.forbidden();
  }

  if (key === 'sales') {
    const orderCount = await Order.countDocuments(scope.orderMatch);
    if (orderCount === 0) {
      const doc = await ChartData.findOne({ key: 'sales' });
      return res.json(doc?.data ?? []);
    }

    const data = await Order.aggregate([
      { $match: { ...scope.orderMatch, isDeleted: { $ne: true } } },
      {
        $group: {
          _id: { $dateToString: { format: '%b', date: '$createdAt' } },
          sales: { $sum: '$total' },
          minDate: { $min: '$createdAt' },
        },
      },
      { $sort: { minDate: 1 } },
      {
        $project: {
          _id: 0,
          m: '$_id',
          sales: { $round: [{ $divide: ['$sales', 100] }, 0] },
          target: { $literal: 400 },
        },
      },
    ]);
    return res.json(data);
  }

  if (key === 'category') {
    if (req.user.role === 'admin') {
      const productCount = await Product.countDocuments();
      if (productCount === 0) {
        const doc = await ChartData.findOne({ key: 'category' });
        return res.json(doc?.data ?? []);
      }

      const data = await Product.aggregate([
        { $match: { isActive: true, isDeleted: { $ne: true } } },
        { $group: { _id: '$cat', v: { $sum: 1 } } },
        { $sort: { v: -1 } },
        {
          $project: {
            _id: 0,
            name: { $ifNull: ['$_id', 'Uncategorized'] },
            v: 1,
          },
        },
      ]);
      return res.json(data);
    }

    const orderCount = await Order.countDocuments(scope.orderMatch);
    if (orderCount === 0) {
      const doc = await ChartData.findOne({ key: 'category' });
      return res.json(doc?.data ?? []);
    }

    const data = await Order.aggregate([
      { $match: { ...scope.orderMatch, isDeleted: { $ne: true } } },
      {
        $lookup: {
          from: 'shopkeepers',
          localField: 'shop',
          foreignField: '_id',
          as: 'shopDoc',
        },
      },
      { $unwind: '$shopDoc' },
      {
        $group: {
          _id: { $ifNull: ['$shopDoc.loc', '$shopDoc.name'] },
          v: { $sum: 1 },
        },
      },
      { $sort: { v: -1 } },
      {
        $project: {
          _id: 0,
          name: '$_id',
          v: 1,
        },
      },
    ]);
    return res.json(data);
  }

  if (key === 'cash') {
    const paymentCount = await Payment.countDocuments(scope.paymentMatch);
    if (paymentCount === 0) {
      const doc = await ChartData.findOne({ key: 'cash' });
      return res.json(doc?.data ?? []);
    }

    const data = await Payment.aggregate([
      { $match: scope.paymentMatch },
      {
        $group: {
          _id: { $dateToString: { format: '%b %d', date: '$createdAt' } },
          i: { $sum: '$paid' },
          minDate: { $min: '$createdAt' },
        },
      },
      { $sort: { minDate: 1 } },
      {
        $project: {
          _id: 0,
          d: '$_id',
          i: 1,
          o: { $round: [{ $multiply: ['$i', 0.6] }, 0] },
        },
      },
    ]);
    return res.json(data);
  }

  if (req.user.role !== 'admin') {
    throw AppError.forbidden();
  }

  const doc = await ChartData.findOne({ key });
  res.json(doc?.data ?? []);
}));

export default router;
