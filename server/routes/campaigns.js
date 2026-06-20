import { Router } from 'express';
import Campaign from '../models/Campaign.js';
import Expense from '../models/Expense.js';
import { formatCampaign } from '../utils/format.js';
import { getPagination, getSafeSort } from '../utils/pagination.js';
import { cache } from '../utils/cache.js';
import authenticate from '../middleware/auth.js';
import { requirePermission } from '../utils/permissions.js';
import catchAsync from '../utils/catchAsync.js';
import validate from '../middleware/validate.js';
import AppError from '../utils/AppError.js';
import { createCampaignSchema } from '../validators/campaign.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('campaigns.read'), catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const sort = getSafeSort(req.query.sort, ['createdAt', 'name', 'budget', 'spent', 'status', 'startDate', 'endDate'], { createdAt: -1 });

  const cacheKey = `campaigns:list:page:${page}:limit:${limit}:sort:${JSON.stringify(sort)}`;
  const cachedData = await cache.get(cacheKey);
  if (cachedData) {
    return res.json(cachedData);
  }

  const [docs, total] = await Promise.all([
    Campaign.find()
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Campaign.countDocuments()
  ]);

  const responseData = {
    data: docs.map(formatCampaign),
    pagination: {
      page,
      limit,
      count: total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1,
    }
  };

  await cache.set(cacheKey, responseData, 300);
  res.json(responseData);
}));

router.post('/', requirePermission('admin'), validate(createCampaignSchema), catchAsync(async (req, res) => {
  const doc = await Campaign.create({ ...req.validatedBody });

  await cache.del('campaigns:list:*');

  res.status(201).json(formatCampaign(doc));
}));

router.post('/:id/spend', requirePermission('admin'), catchAsync(async (req, res) => {
  const { id } = req.params;
  const { amount, description } = req.body;
  
  if (!amount || isNaN(amount) || amount <= 0) throw AppError.validation('Valid amount is required');

  const doc = await Campaign.findById(id);
  if (!doc) throw AppError.notFound('Campaign not found');

  doc.spent = (doc.spent || 0) + Number(amount);
  await doc.save();

  await Expense.create({
    amount: Number(amount),
    category: 'Marketing',
    description: description || `Campaign Spend: ${doc.name}`,
    loggedBy: req.user.id
  });

  await cache.del('campaigns:list:*');
  await cache.del('expenses:list:*');

  res.json({ success: true, spent: doc.spent });
}));

router.delete('/:id', requirePermission('admin'), catchAsync(async (req, res) => {
  const { id } = req.params;
  const doc = await Campaign.findById(id);
  if (!doc) throw AppError.notFound('Campaign not found');

  await Campaign.findByIdAndDelete(id);

  await cache.del('campaigns:list:*');
  await cache.del('expenses:list:*');

  res.json({ success: true, id });
}));

export default router;
