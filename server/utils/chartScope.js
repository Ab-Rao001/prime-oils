import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Shopkeeper from '../models/Shopkeeper.js';
import User from '../models/User.js';

/**
 * Build MongoDB match filters for chart aggregations by role.
 * - admin: no restrictions
 * - salesman: orders/payments for shops tied to their orders (man = user id)
 * - shopkeeper: orders/payments for shops they own (owner = user name)
 */
export async function getChartScope(user) {
  if (user.role === 'admin') {
    return {
      orderMatch: { status: { $ne: 'cancelled' } },
      paymentMatch: {},
    };
  }

  if (user.role === 'salesman') {
    const salesmanId = new mongoose.Types.ObjectId(user.id);
    const shopIds = await Order.distinct('shop', { man: salesmanId });
    const assignedShops = await Shopkeeper.find({ salesman: salesmanId }).select('_id').lean();
    const allShopIds = [...new Set([...shopIds.map(id => id.toString()), ...assignedShops.map(s => s._id.toString())])].map(id => new mongoose.Types.ObjectId(id));
    return {
      orderMatch: {
        status: { $ne: 'cancelled' },
        man: salesmanId,
      },
      paymentMatch: { shop: { $in: allShopIds } },
    };
  }

  if (user.role === 'shopkeeper') {
    const userDoc = await User.findById(user.id).select('name').lean();
    const ownerName = userDoc?.name || '';
    const shops = await Shopkeeper.find({ owner: ownerName }).select('_id').lean();
    const shopIds = shops.map(s => s._id);
    return {
      orderMatch: {
        status: { $ne: 'cancelled' },
        shop: shopIds.length ? { $in: shopIds } : { $in: [] },
      },
      paymentMatch: shopIds.length ? { shop: { $in: shopIds } } : { shop: { $in: [] } },
    };
  }

  return null;
}
