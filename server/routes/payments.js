import { Router } from 'express';
import authenticate from '../middleware/auth.js';
import authorize from '../middleware/authorize.js';
import validate from '../middleware/validate.js';
import { createPaymentSchema, updatePaymentSchema } from '../validators/payment.validator.js';
import { getPayments, createPayment, updatePayment, payOrder } from '../controllers/paymentController.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('admin', 'salesman', 'shopkeeper'), getPayments);
router.post('/', authorize('admin', 'salesman'), validate(createPaymentSchema), createPayment);
router.patch('/:paymentId', authorize('admin', 'salesman', 'shopkeeper'), validate(updatePaymentSchema), updatePayment);
router.post('/pay-order', authorize('admin', 'salesman', 'shopkeeper'), payOrder);

export default router;
