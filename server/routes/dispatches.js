import { Router } from 'express';
import authenticate from '../middleware/auth.js';
import { requirePermission } from '../utils/permissions.js';
import {
  getDispatches,
  getVehicles,
  createDispatch,
  updateDispatchStatus
} from '../controllers/dispatchController.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('dispatch.read'), getDispatches);
router.get('/vehicles', requirePermission('dispatch.read'), getVehicles);
router.post('/', requirePermission('dispatch.manage'), createDispatch);
router.patch('/:id/status', requirePermission('delivery.complete'), updateDispatchStatus);

export default router;
