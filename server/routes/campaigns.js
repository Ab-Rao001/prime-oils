import { Router } from 'express';
import Campaign from '../models/Campaign.js';
import { formatCampaign } from '../utils/format.js';
import { paginate } from '../utils/pagination.js';
import { cache } from '../utils/cache.js';
import authenticate from '../middleware/auth.js';
import authorize from '../middleware/authorize.js';
import catchAsync from '../utils/catchAsync.js';
import validate from '../middleware/validate.js';
import { createCampaignSchema } from '../validators/campaign.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('admin', 'salesman', 'shopkeeper'), catchAsync(async (req, res) => {
  const page = req.query.page ? parseInt(req.query.page, 10) : null;
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;

  const cacheKey = `campaigns:list:page:${page || 'all'}:limit:${limit || 'all'}`;
  const cachedData = await cache.get(cacheKey);
  if (cachedData) {
    return res.json(cachedData);
  }

  let responseData;

  if (page || limit) {
    const paginatedResult = await paginate(Campaign, {}, {
      page,
      limit,
      sort: { createdAt: -1 },
    });
    responseData = {
      data: paginatedResult.data.map(formatCampaign),
      pagination: paginatedResult.pagination,
    };
  } else {
    const docs = await Campaign.find().sort({ createdAt: -1 }).lean();
    responseData = docs.map(formatCampaign);
  }

  await cache.set(cacheKey, responseData, 300);
  res.json(responseData);
}));

router.post('/', authorize('admin'), validate(createCampaignSchema), catchAsync(async (req, res) => {
  const doc = await Campaign.create({ ...req.validatedBody });

  await cache.del('campaigns:list:*');

  res.status(201).json(formatCampaign(doc));
}));

export default router;
