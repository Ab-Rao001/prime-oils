import { Router } from 'express';
import Order from '../models/Order.js';
import Expense from '../models/Expense.js';
import authenticate from '../middleware/auth.js';
import authorize from '../middleware/authorize.js';
import catchAsync from '../utils/catchAsync.js';

const router = Router();

router.use(authenticate);

// GET /api/analytics/pnl?startDate=...&endDate=...
router.get('/pnl', authorize('admin'), catchAsync(async (req, res) => {
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
router.get('/supplier', authorize('admin', 'supplier'), catchAsync(async (req, res) => {
  const [
    newOrders,
    pendingReviews,
    readyForDispatch,
    deliveriesInProgress,
    completedDeliveries
  ] = await Promise.all([
    Order.countDocuments({ status: { $in: ['pending', 'paid'] }, isDeleted: { $ne: true } }),
    Order.countDocuments({ status: 'pending_approval', isDeleted: { $ne: true } }),
    Order.countDocuments({ status: { $in: ['confirmed', 'ready_for_dispatch'] }, isDeleted: { $ne: true } }),
    Order.countDocuments({ status: 'in_transit', isDeleted: { $ne: true } }),
    Order.countDocuments({ status: 'delivered', isDeleted: { $ne: true } })
  ]);

  // Low stock alerts logic (assuming Product model exists, but we can return mock or real)
  // We'll import Product dynamically or at the top
  res.json({
    newOrders,
    pendingReviews,
    readyForDispatch,
    deliveriesInProgress,
    completedDeliveries
  });
}));

export default router;
