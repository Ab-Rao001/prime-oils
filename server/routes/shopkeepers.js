import { Router } from 'express';
import Shopkeeper from '../models/Shopkeeper.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { formatShopkeeper } from '../utils/format.js';
import { paginate } from '../utils/pagination.js';
import { cache } from '../utils/cache.js';
import authenticate from '../middleware/auth.js';
import authorize from '../middleware/authorize.js';
import validate from '../middleware/validate.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { createShopkeeperSchema, updateShopkeeperSchema } from '../validators/shopkeeper.validator.js';

const router = Router();

router.use(authenticate);

async function buildShopkeeperListFilter(user) {
  const filter = {};
  if (user.role === 'shopkeeper') {
    const userDoc = await User.findById(user.id);
    filter.owner = userDoc ? userDoc.name : '';
  } else if (user.role === 'salesman') {
    const shopIds = await Order.distinct('shop', { man: user.id });
    filter.$or = [
      { _id: { $in: shopIds } },
      { salesman: user.id }
    ];
  }
  return filter;
}

router.get('/', authorize('admin', 'salesman', 'shopkeeper'), catchAsync(async (req, res) => {
  const page = req.query.page ? parseInt(req.query.page, 10) : null;
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;
  const { lat, lng, maxDistance } = req.query;

  const roleFilter = await buildShopkeeperListFilter(req.user);
  const cacheKey = `shopkeepers:list:role:${req.user.role}:user:${req.user.id}:page:${page || 'all'}:limit:${limit || 'all'}:lat:${lat || ''}:lng:${lng || ''}`;
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

  let responseData;

  if (page || limit) {
    const paginatedResult = await paginate(Shopkeeper, filter, {
      page,
      limit,
      sort: lat && lng ? null : { createdAt: -1 },
    });
    responseData = {
      data: paginatedResult.data.map(formatShopkeeper),
      pagination: paginatedResult.pagination,
    };
  } else {
    const docs = await Shopkeeper.find(filter)
      .sort(lat && lng ? {} : { createdAt: -1 })
      .lean();
    responseData = docs.map(formatShopkeeper);
  }

  await cache.set(cacheKey, responseData, 120);
  res.json(responseData);
}));

router.post('/', authorize('admin', 'salesman'), validate(createShopkeeperSchema), catchAsync(async (req, res) => {
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

router.patch('/:id', authorize('admin', 'salesman'), validate(updateShopkeeperSchema), catchAsync(async (req, res) => {
  const { id } = req.params;
  const query = { _id: id };

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

export default router;
