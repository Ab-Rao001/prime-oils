import Order from '../models/Order.js';
import DeliveryItem from '../models/DeliveryItem.js';
import AuditService from './AuditService.js';
import Notification from '../models/Notification.js';
import Shopkeeper from '../models/Shopkeeper.js';
import NotificationService from './NotificationService.js';

class DeliveryService {
  /**
   * Calculates the overall progress of an order based on DeliveryItems and updates its status.
   * Ensures that Orders with multiple partial dispatches correctly hit "delivered" once complete.
   * 
   * @param {mongoose.Types.ObjectId} orderId 
   * @param {mongoose.ClientSession} session 
   */
  static async calculateProgress(orderId, session) {
    const order = await Order.findById(orderId).session(session);
    if (!order) return null;

    // Fetch all DeliveryItems across all dispatches for this order
    const items = await DeliveryItem.find({ order: orderId }).session(session);

    if (items.length === 0) return order;

    // Group by product to calculate total delivered per line item
    const progressMap = {};
    for (const line of order.lineItems) {
      progressMap[line.productId.toString()] = {
        expected: line.quantity,
        delivered: 0,
      };
    }

    for (const item of items) {
       const pid = item.product.toString();
       if (progressMap[pid]) {
         progressMap[pid].delivered += (item.deliveredQuantity || 0);
       }
    }

    let isFullyDelivered = true;
    let isPartiallyDelivered = false;

    for (const key of Object.keys(progressMap)) {
       const prog = progressMap[key];
       if (prog.delivered > 0) {
           isPartiallyDelivered = true;
       }
       if (prog.delivered < prog.expected) {
           isFullyDelivered = false;
       }
    }

    let newStatus = order.status;
    
    // Only transition if the order was in_transit or partially_delivered
    // If it's cancelled or returned, we shouldn't overwrite it.
    if (['in_transit', 'partially_delivered', 'ready_for_dispatch'].includes(order.status)) {
        if (isFullyDelivered) {
           newStatus = 'delivered';
        } else if (isPartiallyDelivered) {
           newStatus = 'partially_delivered';
        }
    }

    if (newStatus !== order.status) {
       const oldStatus = order.status;
       order.status = newStatus;
       await order.save({ session });
       
       await AuditService.log({
         user: null, // System-triggered recalculation
         action: 'UPDATE_ORDER_STATUS',
         collectionName: 'Order',
         documentId: order._id,
         oldValue: { status: oldStatus },
         newValue: { status: newStatus },
         session
       });

       if (newStatus === 'delivered') {
           await NotificationService.send({
             title: 'Order Delivered', 
             message: `Order ${order.orderId} fully delivered`, 
             msg: `Order ${order.orderId} fully delivered`, // Backwards compatibility
             type: 'DELIVERY', 
             priority: 'MEDIUM',
             module: 'Delivery',
             documentId: order._id
           }, null, 'all', session);
           
           // Phase 5: Reconcile Shopkeeper Credit
           if (order.shop) {
              const shop = await Shopkeeper.findById(order.shop).session(session);
              if (shop) {
                 // Increase shopkeeper's outstanding debt (credit)
                 shop.credit = (shop.credit || 0) + order.total;
                 await shop.save({ session });

                 await AuditService.log({
                    user: null,
                    action: 'UPDATE_SHOPKEEPER_CREDIT',
                    collectionName: 'Shopkeeper',
                    documentId: shop._id,
                    newValue: { credit: shop.credit, added: order.total, reason: `Order ${order.orderId} delivered` },
                    session
                 });
              }
           }
       } else if (newStatus === 'partially_delivered') {
           await NotificationService.send({
             title: 'Order Partially Delivered', 
             message: `Order ${order.orderId} partially delivered. Needs follow-up dispatch.`, 
             msg: `Order ${order.orderId} partially delivered. Needs follow-up dispatch.`, // Backwards compatibility
             type: 'DELIVERY', 
             priority: 'HIGH',
             module: 'Delivery',
             documentId: order._id
           }, null, 'all', session);
       }
    }
    
    return order;
  }
}

export default DeliveryService;
