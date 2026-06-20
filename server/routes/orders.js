import { Router } from 'express';
import authenticate from '../middleware/auth.js';
import { requirePermission } from '../utils/permissions.js';
import validate from '../middleware/validate.js';
import { verifyShopOwnership, verifySalesmanCustomerAccess } from '../middleware/checkOwnership.js';
import { createOrderSchema, updateOrderSchema, updateOrderStatusSchema } from '../validators/order.validator.js';
import { orderLimiter } from '../middleware/rateLimiters.js';
import { getOrders, getOrder, createOrder, updateOrder, updateOrderStatus } from '../controllers/orderController.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('orders.read'), getOrders);
router.get('/:id', requirePermission('orders.read'), verifyShopOwnership, verifySalesmanCustomerAccess, getOrder);
router.post('/', orderLimiter, requirePermission('orders.create'), validate(createOrderSchema), verifyShopOwnership, verifySalesmanCustomerAccess, createOrder);
router.patch('/:orderId', requirePermission('orders.manage'), validate(updateOrderSchema), verifyShopOwnership, verifySalesmanCustomerAccess, updateOrder);
router.put('/:id/status', requirePermission('orders.approve'), validate(updateOrderStatusSchema), verifyShopOwnership, verifySalesmanCustomerAccess, updateOrderStatus);

export default router;
