import { Router } from 'express';
import Notification from '../models/Notification.js';
import { formatNotification } from '../utils/format.js';
import { getPagination, getSafeSort } from '../utils/pagination.js';
import { cache } from '../utils/cache.js';
import authenticate from '../middleware/auth.js';
import { requirePermission } from '../utils/permissions.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import validate from '../middleware/validate.js';
import { createNotificationSchema } from '../validators/notification.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('notifications.read'), catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const sort = getSafeSort(req.query.sort, ['createdAt', 'date', 'type', 'priority'], { createdAt: -1 });

  const cacheKey = `notifications:list:user:${req.user.id}:page:${page}:limit:${limit}:sort:${JSON.stringify(sort)}`;
  const cachedData = await cache.get(cacheKey);
  if (cachedData) {
    return res.json(cachedData);
  }

  const filter = { 
    $or: [
      { recipient: req.user.id },
      { role: req.user.role },
      { recipient: null, role: null }
    ] 
  };

  const [docs, total] = await Promise.all([
    Notification.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter)
  ]);

  const responseData = {
    data: docs.map(formatNotification),
    pagination: {
      page,
      limit,
      count: total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1,
    }
  };

  await cache.set(cacheKey, responseData, 60);
  res.json(responseData);
}));

router.post('/', requirePermission('notifications.send'), validate(createNotificationSchema), catchAsync(async (req, res) => {
  const d = new Date();
  const date = req.validatedBody.date || d.toLocaleString('en-US', { month: 'short', day: '2-digit' });
  const doc = await Notification.create({ ...req.validatedBody, date });

  await cache.del('notifications:list:*');

  res.status(201).json(formatNotification(doc));
}));

router.patch('/:id/read', requirePermission('notifications.read'), catchAsync(async (req, res) => {
  const { id } = req.params;
  const query = { _id: id };

  if (req.user.role !== 'admin') {
    query.$or = [{ recipient: req.user.id }, { recipient: null }];
  }

  const doc = await Notification.findOneAndUpdate(query, { isRead: true, readAt: new Date() }, { new: true });
  if (!doc) throw AppError.notFound('Notification not found');

  await cache.del('notifications:list:*');

  res.json(formatNotification(doc));
}));

router.post('/mark-all-read', requirePermission('notifications.read'), catchAsync(async (req, res) => {
  const filter = { recipient: req.user.id, isRead: false };
  await Notification.updateMany(filter, { isRead: true, readAt: new Date() });

  const docs = await Notification.find({
    $or: [{ recipient: req.user.id }, { role: req.user.role }, { recipient: null, role: null }]
  }).sort({ createdAt: -1 }).lean();

  await cache.del('notifications:list:*');

  res.json(docs.map(formatNotification));
}));

export default router;
