import { Router } from 'express';
import authenticate from '../middleware/auth.js';
import { requirePermission } from '../utils/permissions.js';
import validate from '../middleware/validate.js';
import { verifyShopOwnership, verifySalesmanCustomerAccess } from '../middleware/checkOwnership.js';
import { createPaymentSchema, updatePaymentSchema } from '../validators/payment.validator.js';
import { paymentsLimiter } from '../middleware/rateLimiters.js';
import { getPayments, getPayment, createPayment, updatePayment, payOrder } from '../controllers/paymentController.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('payments.read'), getPayments);
router.get('/:id', requirePermission('payments.read'), verifyShopOwnership, verifySalesmanCustomerAccess, getPayment);
router.post('/', paymentsLimiter, requirePermission('payments.collect'), validate(createPaymentSchema), verifyShopOwnership, verifySalesmanCustomerAccess, createPayment);
router.patch('/:paymentId', requirePermission('payments.collect'), validate(updatePaymentSchema), verifyShopOwnership, verifySalesmanCustomerAccess, updatePayment);
router.post('/pay-order', paymentsLimiter, requirePermission('payments.pay'), verifyShopOwnership, verifySalesmanCustomerAccess, payOrder);

export default router;
