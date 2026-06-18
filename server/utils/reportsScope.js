import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Shopkeeper from '../models/Shopkeeper.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';

export function parseDateRange(startDate, endDate) {
  const createdAt = {};

  if (startDate) {
    const start = new Date(startDate);
    if (Number.isNaN(start.getTime())) {
      throw AppError.validation('Invalid startDate. Use YYYY-MM-DD.');
    }
    start.setUTCHours(0, 0, 0, 0);
    createdAt.$gte = start;
  }

  if (endDate) {
    const end = new Date(endDate);
    if (Number.isNaN(end.getTime())) {
      throw AppError.validation('Invalid endDate. Use YYYY-MM-DD.');
    }
    end.setUTCHours(23, 59, 59, 999);
    createdAt.$lte = end;
  }

  return Object.keys(createdAt).length ? { createdAt } : {};
}

export async function buildReportsScope(user, startDate, endDate) {
  const dateFilter = parseDateRange(startDate, endDate);

  if (user.role === 'admin') {
    return {
      orderMatch: { ...dateFilter },
      paymentMatch: { ...dateFilter },
    };
  }

  if (user.role === 'salesman') {
    const salesmanId = new mongoose.Types.ObjectId(user.id);
    const shopIds = await Order.distinct('shop', { man: salesmanId });
    const assignedShops = await Shopkeeper.find({ salesman: salesmanId }).select('_id').lean();
    const allShopIds = [...new Set([...shopIds.map(id => id.toString()), ...assignedShops.map(s => s._id.toString())])].map(id => new mongoose.Types.ObjectId(id));
    return {
      orderMatch: { ...dateFilter, man: salesmanId },
      paymentMatch: {
        ...dateFilter,
        shop: allShopIds.length ? { $in: allShopIds } : { $in: [] },
      },
    };
  }

  if (user.role === 'shopkeeper') {
    const userDoc = await User.findById(user.id).select('name').lean();
    const ownerName = userDoc?.name || '';
    const shops = await Shopkeeper.find({ owner: ownerName }).select('_id').lean();
    const shopIds = shops.map(s => s._id);
    return {
      orderMatch: {
        ...dateFilter,
        shop: shopIds.length ? { $in: shopIds } : { $in: [] },
      },
      paymentMatch: {
        ...dateFilter,
        shop: shopIds.length ? { $in: shopIds } : { $in: [] },
      },
    };
  }

  throw AppError.forbidden();
}

export function revenueOrderMatch(orderMatch) {
  return {
    ...orderMatch,
    status: { $ne: 'cancelled' },
  };
}
