import { Router } from 'express';
import authenticate from '../middleware/auth.js';
import authorize from '../middleware/authorize.js';
import validate from '../middleware/validate.js';
import { createOrderSchema, updateOrderSchema, updateOrderStatusSchema } from '../validators/order.validator.js';
import { getOrders, createOrder, updateOrder, updateOrderStatus } from '../controllers/orderController.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('admin', 'salesman', 'shopkeeper', 'supplier'), getOrders);
router.post('/', authorize('admin', 'salesman', 'shopkeeper'), validate(createOrderSchema), createOrder);
router.patch('/:orderId', authorize('admin', 'salesman'), validate(updateOrderSchema), updateOrder);
router.put('/:id/status', authorize('admin', 'salesman', 'supplier'), validate(updateOrderStatusSchema), updateOrderStatus);

export default router;
