import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import Expense from '../models/Expense.js';
import { buildReportsScope, revenueOrderMatch } from '../utils/reportsScope.js';

function formatWeekLabel(date) {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const getReportsSummary = async (user, startDate, endDate) => {
  const { orderMatch, paymentMatch } = await buildReportsScope(user, startDate, endDate);
  const revenueMatch = { ...revenueOrderMatch(orderMatch), isDeleted: { $ne: true } };
  const scopedOrderMatch = { ...orderMatch, isDeleted: { $ne: true } };
  const scopedPaymentMatch = { ...paymentMatch, isDeleted: { $ne: true } };
  const expenseMatch = { isDeleted: { $ne: true } };
  if (startDate) expenseMatch.date = { ...expenseMatch.date, $gte: new Date(startDate) };
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    expenseMatch.date = { ...expenseMatch.date, $lte: end };
  }

  const [
    revenueAgg,
    orderCountAgg,
    paidAgg,
    outstandingAgg,
    statusAgg,
    weekAgg,
    topProductsAgg,
    expenseAgg,
  ] = await Promise.all([
    Order.aggregate([
      { $match: revenueMatch },
      { $group: { _id: null, totalRevenue: { $sum: '$total' } } },
    ]),

    Order.aggregate([
      { $match: scopedOrderMatch },
      { $count: 'totalOrders' },
    ]),

    Payment.aggregate([
      { $match: scopedPaymentMatch },
      { $group: { _id: null, totalPaid: { $sum: '$paid' } } },
    ]),

    Order.aggregate([
      { $match: scopedOrderMatch },
      {
        $lookup: {
          from: 'payments',
          localField: '_id',
          foreignField: 'order',
          as: 'payments',
        },
      },
      {
        $addFields: {
          paidSum: { $sum: '$payments.paid' },
          outstanding: {
            $max: [0, { $subtract: [{ $ifNull: ['$total', 0] }, { $sum: '$payments.paid' }] }],
          },
        },
      },
      { $group: { _id: null, outstandingBalance: { $sum: '$outstanding' } } },
    ]),

    Order.aggregate([
      { $match: scopedOrderMatch },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),

    Order.aggregate([
      { $match: revenueMatch },
      {
        $group: {
          _id: {
            year: { $isoWeekYear: '$createdAt' },
            week: { $isoWeek: '$createdAt' },
          },
          weekStart: { $min: '$createdAt' },
          revenue: { $sum: '$total' },
        },
      },
      { $sort: { weekStart: 1 } },
      {
        $project: {
          _id: 0,
          week: {
            $concat: [
              'W',
              { $toString: '$_id.week' },
              ' ',
              { $dateToString: { format: '%Y', date: '$weekStart' } },
            ],
          },
          label: { $literal: null },
          weekStart: 1,
          revenue: 1,
        },
      },
    ]),

    Order.aggregate([
      { $match: revenueMatch },
      { $match: { lineItems: { $exists: true, $ne: [] } } },
      { $unwind: '$lineItems' },
      {
        $group: {
          _id: '$lineItems.productId',
          name: { $first: '$lineItems.productName' },
          quantitySold: { $sum: '$lineItems.quantity' },
        },
      },
      { $sort: { quantitySold: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          name: { $ifNull: ['$name', 'Unknown product'] },
          quantitySold: 1,
        },
      },
    ]),

    Expense.aggregate([
      { $match: expenseMatch },
      { $group: { _id: null, totalExpenses: { $sum: '$amount' } } }
    ]),
  ]);

  const revenueByWeek = weekAgg.map(row => ({
    week: row.week,
    label: formatWeekLabel(row.weekStart),
    revenue: row.revenue || 0,
  }));

  return {
    startDate: startDate || null,
    endDate: endDate || null,
    totalRevenue: revenueAgg[0]?.totalRevenue || 0,
    totalOrders: orderCountAgg[0]?.totalOrders || 0,
    totalPaid: paidAgg[0]?.totalPaid || 0,
    outstandingBalance: outstandingAgg[0]?.outstandingBalance || 0,
    ordersByStatus: statusAgg.map(row => ({
      status: row._id || 'unknown',
      count: row.count,
    })),
    revenueByWeek,
    topProducts: topProductsAgg,
    totalExpenses: expenseAgg[0]?.totalExpenses || 0,
    netProfit: (revenueAgg[0]?.totalRevenue || 0) - (expenseAgg[0]?.totalExpenses || 0),
  };
};

export const fetchExportData = async (user, startDate, endDate) => {
  const { orderMatch, paymentMatch } = await buildReportsScope(user, startDate, endDate);
  const revenueMatch = { ...revenueOrderMatch(orderMatch), isDeleted: { $ne: true } };
  const scopedOrderMatch = { ...orderMatch, isDeleted: { $ne: true } };
  const scopedPaymentMatch = { ...paymentMatch, isDeleted: { $ne: true } };

  const [orders, payments, topProducts] = await Promise.all([
    Order.aggregate([
      { $match: scopedOrderMatch },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'shopkeepers',
          localField: 'shop',
          foreignField: '_id',
          as: 'shopDoc',
        },
      },
      { $unwind: { path: '$shopDoc', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          orderId: 1,
          shopkeeper: { $ifNull: ['$shopDoc.name', '—'] },
          items: 1,
          total: 1,
          status: 1,
          date: 1,
          createdAt: 1,
        },
      },
    ]),

    Payment.aggregate([
      { $match: paymentMatch },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'shopkeepers',
          localField: 'shop',
          foreignField: '_id',
          as: 'shopDoc',
        },
      },
      {
        $lookup: {
          from: 'orders',
          localField: 'order',
          foreignField: '_id',
          as: 'orderDoc',
        },
      },
      { $unwind: { path: '$shopDoc', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$orderDoc', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          paymentId: 1,
          shop: { $ifNull: ['$shopDoc.name', '—'] },
          orderId: { $ifNull: ['$orderDoc.orderId', '—'] },
          total: 1,
          paid: 1,
          status: 1,
          type: 1,
          createdAt: 1,
        },
      },
    ]),

    Order.aggregate([
      { $match: revenueMatch },
      { $match: { lineItems: { $exists: true, $ne: [] } } },
      { $unwind: '$lineItems' },
      {
        $group: {
          _id: '$lineItems.productId',
          name: { $first: '$lineItems.productName' },
          quantitySold: { $sum: '$lineItems.quantity' },
        },
      },
      { $sort: { quantitySold: -1 } },
      { $limit: 20 },
      {
        $project: {
          _id: 0,
          name: { $ifNull: ['$name', 'Unknown'] },
          quantitySold: 1,
        },
      },
    ]),
  ]);

  const summary = await getReportsSummary(user, startDate, endDate);

  return { orders, payments, topProducts, summary, startDate, endDate };
}
