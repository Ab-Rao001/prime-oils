import { Router } from 'express';
import Shopkeeper from '../models/Shopkeeper.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { formatShopkeeper } from '../utils/format.js';
import { getPagination, getSafeSort } from '../utils/pagination.js';
import { cache } from '../utils/cache.js';
import authenticate from '../middleware/auth.js';
import { requirePermission } from '../utils/permissions.js';
import validate from '../middleware/validate.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { createShopkeeperSchema, updateShopkeeperSchema } from '../validators/shopkeeper.validator.js';

const router = Router();

router.use(authenticate);

async function buildShopkeeperListFilter(user) {
  const filter = { isDeleted: { $ne: true } };
  if (user.role === 'shopkeeper') {
    const userDoc = await User.findById(user.id);
    filter.owner = userDoc ? userDoc.name : '';
  } else if (user.role === 'salesman') {
    const mongoose = (await import('mongoose')).default;
    const salesmanId = new mongoose.Types.ObjectId(user.id);
    const shopIds = await Order.distinct('shop', { man: salesmanId });
    filter.$or = [
      { _id: { $in: shopIds } },
      { salesman: salesmanId }
    ];
  }
  return filter;
}

router.get('/', requirePermission('customers.read'), catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { lat, lng, maxDistance } = req.query;
  const sort = getSafeSort(req.query.sort, ['createdAt', 'name', 'credit', 'creditLimit', 'owner', 'loc'], (lat && lng) ? {} : { createdAt: -1 });

  const roleFilter = await buildShopkeeperListFilter(req.user);
  const cacheKey = `shopkeepers:list:role:${req.user.role}:user:${req.user.id}:page:${page}:limit:${limit}:lat:${lat || ''}:lng:${lng || ''}:sort:${JSON.stringify(sort)}`;
  const cachedData = await cache.get(cacheKey);
  if (cachedData) {
    return res.json(cachedData);
  }

  const filter = { ...roleFilter };

  if (lat && lng) {
    filter.location = {
      $nearSphere: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(lng), parseFloat(lat)],
        },
        $maxDistance: parseFloat(maxDistance || 50000),
      },
    };
  }

  const [docs, total] = await Promise.all([
    Shopkeeper.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Shopkeeper.countDocuments(filter)
  ]);

  const responseData = {
    data: docs.map(formatShopkeeper),
    pagination: {
      page,
      limit,
      count: total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1,
    }
  };

  await cache.set(cacheKey, responseData, 120);
  res.json(responseData);
}));

router.post('/', requirePermission('customers.create'), validate(createShopkeeperSchema), catchAsync(async (req, res) => {
  const body = { ...req.validatedBody };
  if (req.user.role === 'salesman') {
    body.salesman = req.user.id;
  }
  if (req.validatedBody.latitude && req.validatedBody.longitude) {
    body.location = {
      type: 'Point',
      coordinates: [parseFloat(req.validatedBody.longitude), parseFloat(req.validatedBody.latitude)],
    };
  }

  const doc = await Shopkeeper.create(body);

  await cache.del('shopkeepers:list:*');

  res.status(201).json(formatShopkeeper(doc));
}));

router.patch('/:id', requirePermission('customers.create'), validate(updateShopkeeperSchema), catchAsync(async (req, res) => {
  const { id } = req.params;
  const query = { _id: id };

  if (req.user.role === 'shopkeeper') {
    const userDoc = await User.findById(req.user.id);
    query.owner = userDoc ? userDoc.name : '';
  }

  const updates = { ...req.validatedBody };
  if (req.validatedBody.latitude && req.validatedBody.longitude) {
    updates.location = {
      type: 'Point',
      coordinates: [parseFloat(req.validatedBody.longitude), parseFloat(req.validatedBody.latitude)],
    };
  }

  const doc = await Shopkeeper.findOneAndUpdate(query, updates, { new: true });
  if (!doc) throw AppError.notFound('Shopkeeper not found');

  await cache.del('shopkeepers:list:*');

  res.json(formatShopkeeper(doc));
}));

router.delete('/:id', requirePermission('customers.create'), catchAsync(async (req, res) => {
  const { id } = req.params;
  const doc = await Shopkeeper.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
  if (!doc) throw AppError.notFound('Shopkeeper not found');
  await cache.del('shopkeepers:list:*');
  res.json({ success: true, id });
}));

export default router;
