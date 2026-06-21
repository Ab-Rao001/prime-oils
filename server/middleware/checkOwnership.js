import AppError from '../utils/AppError.js';
import Order from '../models/Order.js';
import Shopkeeper from '../models/Shopkeeper.js';
import Dispatch from '../models/Dispatch.js';
import Payment from '../models/Payment.js';

export const verifyShopOwnership = async (req, res, next) => {
  try {
    if (req.user.role !== 'shopkeeper') {
      return next(); // Other roles rely on RBAC
    }

    const User = (await import('../models/User.js')).default;
    const userDoc = await User.findById(req.user.id);
    if (!userDoc) return next(new AppError('User not found', 404));

    const orderId = req.params.id || req.body.orderId || req.body.order;
    if (orderId) {
      let order;
      if (typeof orderId === 'string' && !orderId.match(/^[0-9a-fA-F]{24}$/)) {
        order = await Order.findOne({ orderId }).populate('shop');
      } else {
        order = await Order.findById(orderId).populate('shop');
      }
      if (!order) return next(new AppError('Order not found', 404));
      
      const shopOwnerName = order.shop?.owner;
      if (!shopOwnerName || shopOwnerName !== userDoc.name) {
        return next(new AppError('Forbidden: You do not own this order', 403));
      }
    } 
    
    // Also check payment ID if provided
    const paymentId = req.params.paymentId || req.body.paymentId;
    if (paymentId) {
      const payment = await Payment.findById(paymentId).populate('shop');
      if (!payment) return next(new AppError('Payment not found', 404));
      if (payment.shop?.owner !== userDoc.name) {
        return next(new AppError('Forbidden: You do not own this payment', 403));
      }
    }

    // On creation logic
    let shopId = req.body.shopkeeperId || req.body.shop;
    if (shopId && !orderId && !paymentId) {
       let shop;
       if (typeof shopId === 'string' && shopId.match(/^[0-9a-fA-F]{24}$/)) {
         shop = await Shopkeeper.findById(shopId);
       } else {
         shop = await Shopkeeper.findOne({ $or: [{ name: shopId }, { owner: shopId }] });
       }
       
       if (!shop || (shop.owner !== userDoc.name && shop.name !== userDoc.name)) {
           return next(new AppError('Forbidden: You cannot act for another shop', 403));
       }
    }

    next();
  } catch (err) {
    next(err);
  }
};

export const verifySalesmanCustomerAccess = async (req, res, next) => {
  try {
    if (req.user.role !== 'salesman') {
      return next();
    }
    
    const orderId = req.params.id || req.body.orderId || req.body.order;
    if (orderId) {
      let order;
      if (typeof orderId === 'string' && !orderId.match(/^[0-9a-fA-F]{24}$/)) {
        order = await Order.findOne({ orderId });
      } else {
        order = await Order.findById(orderId);
      }
      if (!order) return next(new AppError('Order not found', 404));
      
      if (order.man?.toString() !== req.user.id) {
        return next(new AppError('Forbidden: You do not have access to this order', 403));
      }
    }
    next();
  } catch (err) {
    next(err);
  }
};

export const verifyDispatchOwnership = async (req, res, next) => {
  try {
    if (req.user.role !== 'salesman') {
      return next();
    }

    const dispatchId = req.params.id || req.body.dispatchId;
    if (dispatchId) {
      const dispatch = await Dispatch.findById(dispatchId);
      if (!dispatch) return next(new AppError('Dispatch not found', 404));
      
      if (dispatch.driver?.toString() !== req.user.id) {
        return next(new AppError('Forbidden: You are not assigned to this dispatch', 403));
      }
    }
    next();
  } catch (err) {
    next(err);
  }
};
