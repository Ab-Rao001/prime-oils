import { Router } from 'express';
import authenticate from '../middleware/auth.js';
import { requirePermission } from '../utils/permissions.js';
import validate from '../middleware/validate.js';
import catchAsync from '../utils/catchAsync.js';
import { verifyShopOwnership } from '../middleware/checkOwnership.js';
import {
  getReturns,
  getReturn,
  createReturn,
  inspectReturn,
  approveReturn,
  receiveReturn,
  convertComplaintToReturn,
} from '../controllers/returnController.js';
import {
  createReturnSchema,
  approveReturnSchema,
  inspectReturnSchema,
  convertComplaintSchema,
} from '../validators/return.validator.js';
import { returnsLimiter } from '../middleware/rateLimiters.js';

const router = Router();
router.use(authenticate);

router.get('/', requirePermission('returns.read'), getReturns);
router.get('/:id', requirePermission('returns.read'), getReturn);
router.post('/', returnsLimiter, requirePermission('returns.create'), verifyShopOwnership, validate(createReturnSchema), createReturn);
router.patch('/:id/inspect', requirePermission('returns.manage'), validate(inspectReturnSchema), inspectReturn);
router.patch('/:id/approve', requirePermission('returns.manage'), validate(approveReturnSchema), approveReturn);
router.patch('/:id/receive', requirePermission('returns.manage'), receiveReturn);

export default router;
