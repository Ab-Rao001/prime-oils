import { Router } from 'express';
import authenticate from '../middleware/auth.js';
import authorize from '../middleware/authorize.js';
import {
  getDispatches,
  getVehicles,
  createDispatch,
  updateDispatchStatus
} from '../controllers/dispatchController.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('admin', 'supplier', 'salesman', 'driver'), getDispatches);
router.get('/vehicles', authorize('admin', 'supplier'), getVehicles);
router.post('/', authorize('admin', 'supplier'), createDispatch);
router.patch('/:id/status', authorize('admin', 'supplier', 'salesman', 'driver'), updateDispatchStatus);

export default router;
