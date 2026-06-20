import { Router } from 'express';
import Vehicle from '../models/Vehicle.js';
import authenticate from '../middleware/auth.js';
import { requirePermission } from '../utils/permissions.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { getPagination, getSafeSort } from '../utils/pagination.js';

const router = Router();
router.use(authenticate);

router.get('/', requirePermission('dispatch.read'), catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const sort = getSafeSort(req.query.sort, ['createdAt', 'plateNumber', 'model', 'status'], { createdAt: -1 });

  const [docs, total] = await Promise.all([
    Vehicle.find()
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Vehicle.countDocuments()
  ]);

  res.json({
    data: docs,
    pagination: {
      page,
      limit,
      count: total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1,
    }
  });
}));

router.post('/', requirePermission('dispatch.manage'), catchAsync(async (req, res) => {
  const { plateNumber, model, capacity, status } = req.body;
  const created = await Vehicle.create({ plateNumber, model, capacity, status });
  res.status(201).json(created);
}));

router.patch('/:id', requirePermission('dispatch.manage'), catchAsync(async (req, res) => {
  const updated = await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updated) throw AppError.notFound('Vehicle not found');
  res.json(updated);
}));

export default router;
