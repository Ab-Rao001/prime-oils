import { Router } from 'express';
import Order from '../models/Order.js';
import Expense from '../models/Expense.js';
import authenticate from '../middleware/auth.js';
import { requirePermission } from '../utils/permissions.js';
import catchAsync from '../utils/catchAsync.js';

const router = Router();

router.use(authenticate);

// GET /api/analytics/pnl?startDate=...&endDate=...
router.get('/pnl', requirePermission('reports.read'), catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;

  const matchStage = { isDeleted: { $ne: true } };
  const expenseMatchStage = {};

  if (startDate || endDate) {
    matchStage.createdAt = {};
    expenseMatchStage.date = {};
    if (startDate) {
      matchStage.createdAt.$gte = new Date(startDate);
      expenseMatchStage.date.$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchStage.createdAt.$lte = end;
      expenseMatchStage.date.$lte = end;
    }
  }

  // Aggregate Revenue and COGS from Orders
  const orderStats = await Order.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$total' },
        totalCogs: { $sum: { $ifNull: ['$totalCogs', 0] } } // Handle legacy orders without totalCogs
      }
    }
  ]);

  const revenue = orderStats[0]?.totalRevenue || 0;
  const cogs = orderStats[0]?.totalCogs || 0;
  const grossProfit = revenue - cogs;

  // Aggregate Expenses
  const expenseStats = await Expense.aggregate([
    { $match: expenseMatchStage },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amount' }
      }
    }
  ]);

  const totalExpenses = expenseStats.reduce((acc, curr) => acc + curr.total, 0);
  const netProfit = grossProfit - totalExpenses;

  // Formatting expenses for charts
  const expenseBreakdown = expenseStats.reduce((acc, curr) => {
    acc[curr._id] = curr.total;
    return acc;
  }, {});

  res.json({
    revenue,
    cogs,
    grossProfit,
    totalExpenses,
    netProfit,
    expenseBreakdown
  });
}));

// GET /api/analytics/supplier
router.get('/supplier', requirePermission('reports.read'), catchAsync(async (req, res) => {
  const result = await Order.aggregate([
    { $match: { isDeleted: { $ne: true } } },
    {
      $facet: {
        newOrders: [
          { $match: { status: { $in: ['pending', 'paid'] } } },
          { $count: 'count' }
        ],
        pendingReviews: [
          { $match: { status: 'pending_approval' } },
          { $count: 'count' }
        ],
        readyForDispatch: [
          { $match: { status: { $in: ['confirmed', 'ready_for_dispatch'] } } },
          { $count: 'count' }
        ],
        deliveriesInProgress: [
          { $match: { status: 'in_transit' } },
          { $count: 'count' }
        ],
        completedDeliveries: [
          { $match: { status: 'delivered' } },
          { $count: 'count' }
        ]
      }
    }
  ]);

  const stats = result[0];

  res.json({
    newOrders: stats.newOrders[0]?.count || 0,
    pendingReviews: stats.pendingReviews[0]?.count || 0,
    readyForDispatch: stats.readyForDispatch[0]?.count || 0,
    deliveriesInProgress: stats.deliveriesInProgress[0]?.count || 0,
    completedDeliveries: stats.completedDeliveries[0]?.count || 0
  });
}));

export default router;
