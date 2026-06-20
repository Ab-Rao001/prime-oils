import AppError from './AppError.js';
import User from '../models/User.js';
import Shopkeeper from '../models/Shopkeeper.js';
import Order from '../models/Order.js';

/**
 * Returns a filter object to scope MongoDB queries by tenant/role.
 * Must be spread into all .find(), .findOne(), .countDocuments() queries.
 * @param {Object} user - req.user (must have role and id)
 * @returns {Promise<Object>} Mongoose filter object
 */
export const getTenantFilter = async (user) => {
  const filter = {};
  
  if (!user || !user.role) {
    throw AppError.forbidden('Access denied: Authentication missing or invalid role');
  }

  if (user.role === 'admin') {
    return filter; // Admins see everything
  }

  if (user.role === 'supplier') {
    filter.supplier = user.id; // Models must have a supplier field if applicable
  }

  if (user.role === 'salesman') {
    // Salesman can see their own assigned customers and orders
    // The exact filter depends on the collection, but commonly they are assigned via 'man' or 'salesman' field
    // We will return a generic filter, but the controller might need to map it (e.g., filter.man = user.id)
    filter.man = user.id;
  }

  if (user.role === 'shopkeeper') {
    const userDoc = await User.findById(user.id).select('name');
    if (!userDoc) throw AppError.forbidden('User record not found');
    
    const shops = await Shopkeeper.find({ owner: userDoc.name }).select('_id');
    const shopIds = shops.map(s => s._id);
    
    // Most collections use 'shop' or 'customer' to refer to the shopkeeper
    filter.shop = { $in: shopIds };
  }

  return filter;
};

/**
 * Validates ownership for a specific document by comparing against the tenant filter.
 * Throws 403 Forbidden if the user doesn't own it.
 * @param {Object} doc - The Mongoose document to check
 * @param {Object} user - req.user
 * @param {string} [ownerField] - Optional: specific field to check (e.g. 'supplier', 'man', 'shop')
 */
export const requireOwnership = async (doc, user, ownerField = null) => {
  if (!doc) throw AppError.notFound('Resource not found or access denied');
  if (user.role === 'admin') return true;

  if (user.role === 'supplier') {
    if (doc.supplier && doc.supplier.toString() !== user.id) {
      throw AppError.forbidden('Access denied: Cross-tenant access violation');
    }
  }

  if (user.role === 'salesman') {
    const manId = doc.man || doc.salesman || doc.driver;
    if (manId && manId.toString() !== user.id) {
      throw AppError.forbidden('Access denied: Resource belongs to another assigned user');
    }
  }

  if (user.role === 'shopkeeper') {
    const userDoc = await User.findById(user.id).select('name');
    const shopName = doc.owner || doc.shop?.owner;
    
    if (shopName && userDoc && shopName !== userDoc.name) {
      // In some cases, shop is an ObjectId.
      const shops = await Shopkeeper.find({ owner: userDoc.name }).select('_id');
      const shopIds = shops.map(s => s._id.toString());
      
      const targetShopId = doc.shop?._id ? doc.shop._id.toString() : doc.shop?.toString() || doc.customer?.toString();
      
      if (!shopIds.includes(targetShopId)) {
        throw AppError.forbidden('Access denied: Cross-tenant access violation');
      }
    }
  }

  return true;
};
