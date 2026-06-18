import { Router } from 'express';
import Notification from '../models/Notification.js';
import { formatNotification } from '../utils/format.js';
import { paginate } from '../utils/pagination.js';
import { cache } from '../utils/cache.js';
import authenticate from '../middleware/auth.js';
import authorize from '../middleware/authorize.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import validate from '../middleware/validate.js';
import { createNotificationSchema } from '../validators/notification.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('admin', 'salesman', 'shopkeeper', 'supplier'), catchAsync(async (req, res) => {
  const page = req.query.page ? parseInt(req.query.page, 10) : null;
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;

  const cacheKey = `notifications:list:user:${req.user.id}:page:${page || 'all'}:limit:${limit || 'all'}`;
  const cachedData = await cache.get(cacheKey);
  if (cachedData) {
    return res.json(cachedData);
  }

  const filter = { $or: [{ recipient: req.user.id }, { recipient: null }] };
  let responseData;

  if (page || limit) {
    const paginatedResult = await paginate(Notification, filter, {
      page,
      limit,
      sort: { createdAt: -1 },
    });
    responseData = {
      data: paginatedResult.data.map(formatNotification),
      pagination: paginatedResult.pagination,
    };
  } else {
    const docs = await Notification.find(filter).sort({ createdAt: -1 }).lean();
    responseData = docs.map(formatNotification);
  }

  await cache.set(cacheKey, responseData, 60);
  res.json(responseData);
}));

router.post('/', authorize('admin'), validate(createNotificationSchema), catchAsync(async (req, res) => {
  const d = new Date();
  const date = req.validatedBody.date || d.toLocaleString('en-US', { month: 'short', day: '2-digit' });
  const doc = await Notification.create({ ...req.validatedBody, date });

  await cache.del('notifications:list:*');

  res.status(201).json(formatNotification(doc));
}));

router.patch('/:id/read', authorize('admin', 'salesman', 'shopkeeper', 'supplier'), catchAsync(async (req, res) => {
  const { id } = req.params;
  const query = { _id: id };

  if (req.user.role !== 'admin') {
    query.$or = [{ recipient: req.user.id }, { recipient: null }];
  }

  const doc = await Notification.findOneAndUpdate(query, { read: true }, { new: true });
  if (!doc) throw AppError.notFound('Notification not found');

  await cache.del('notifications:list:*');

  res.json(formatNotification(doc));
}));

router.post('/mark-all-read', authorize('admin', 'salesman', 'shopkeeper', 'supplier'), catchAsync(async (req, res) => {
  const filter = { recipient: req.user.id };
  await Notification.updateMany(filter, { read: true });

  const docs = await Notification.find({
    $or: [{ recipient: req.user.id }, { recipient: null }]
  }).sort({ createdAt: -1 }).lean();

  await cache.del('notifications:list:*');

  res.json(docs.map(formatNotification));
}));

export default router;
