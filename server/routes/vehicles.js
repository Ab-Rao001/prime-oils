import { Router } from 'express';
import Vehicle from '../models/Vehicle.js';
import authenticate from '../middleware/auth.js';
import authorize from '../middleware/authorize.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

const router = Router();
router.use(authenticate);

router.get('/', authorize('admin', 'salesman', 'supplier'), catchAsync(async (req, res) => {
  const docs = await Vehicle.find().sort({ createdAt: -1 }).lean();
  res.json(docs);
}));

router.post('/', authorize('admin', 'supplier'), catchAsync(async (req, res) => {
  const { plateNumber, model, capacity, status } = req.body;
  const created = await Vehicle.create({ plateNumber, model, capacity, status });
  res.status(201).json(created);
}));

router.patch('/:id', authorize('admin', 'supplier'), catchAsync(async (req, res) => {
  const updated = await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updated) throw AppError.notFound('Vehicle not found');
  res.json(updated);
}));

export default router;
