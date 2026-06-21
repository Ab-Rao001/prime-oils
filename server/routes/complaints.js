import { Router } from 'express';
import Complaint from '../models/Complaint.js';
import Shopkeeper from '../models/Shopkeeper.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { formatComplaint } from '../utils/format.js';
import { getPagination, getSafeSort } from '../utils/pagination.js';
import { cache } from '../utils/cache.js';
import authenticate from '../middleware/auth.js';
import { requirePermission } from '../utils/permissions.js';
import validate from '../middleware/validate.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import NotificationService from '../services/NotificationService.js';
import { createComplaintSchema, updateComplaintSchema } from '../validators/complaint.validator.js';
import { convertComplaintSchema } from '../validators/return.validator.js';
import { convertComplaintToReturn } from '../controllers/returnController.js';

const router = Router();

router.use(authenticate);

async function buildComplaintListFilter(user) {
  const filter = {};
  if (user.role === 'shopkeeper') {
    const userDoc = await User.findById(user.id);
    const ownerName = userDoc ? userDoc.name : '';
    const shops = await Shopkeeper.find({ owner: ownerName }).select('_id');
    filter.shop = { $in: shops.map(s => s._id) };
  } else if (user.role === 'salesman') {
    const shopIds = await Order.distinct('shop', { man: user.id });
    const assignedShops = await Shopkeeper.find({ salesman: user.id }).select('_id');
    const allShopIds = [...new Set([...shopIds.map(id => id.toString()), ...assignedShops.map(s => s._id.toString())])];
    filter.shop = { $in: allShopIds };
  }
  return filter;
}

router.get('/', requirePermission('complaints.read'), catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const sort = getSafeSort(req.query.sort, ['createdAt', 'complaintId', 'status', 'type', 'issue'], { createdAt: -1 });

  const filter = await buildComplaintListFilter(req.user);
  const cacheKey = `complaints:list:role:${req.user.role}:user:${req.user.id}:page:${page}:limit:${limit}:sort:${JSON.stringify(sort)}`;
  const cachedData = await cache.get(cacheKey);
  if (cachedData) {
    return res.json(cachedData);
  }

  const populateOpts = ['shop', 'productRef', 'orderRef', 'returnRequestId', 'targetUser'];

  const [docs, total] = await Promise.all([
    Complaint.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('shop')
      .populate('productRef')
      .populate('orderRef')
      .populate('returnRequestId')
      .populate('targetUser', 'name email role')
      .lean(),
    Complaint.countDocuments(filter)
  ]);

  const responseData = {
    data: docs.map(formatComplaint),
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

router.post('/', requirePermission('complaints.create'), validate(createComplaintSchema), catchAsync(async (req, res) => {
  const count = await Complaint.countDocuments();
  const complaintId = req.validatedBody.complaintId || `CMP-${String(count + 1).padStart(3, '0')}`;

  let shopId = req.validatedBody.shop;
  
  if (!shopId && req.user.role === 'shopkeeper') {
    const userDoc = await User.findById(req.user.id);
    const sk = await Shopkeeper.findOne({ owner: userDoc.name });
    if (sk) shopId = sk._id;
  }
  
  if (typeof shopId === 'string' && !shopId.match(/^[0-9a-fA-F]{24}$/)) {
    const sk = await Shopkeeper.findOne({ name: shopId });
    if (!sk) throw AppError.validation(`Shopkeeper not found: ${shopId}`);
    shopId = sk._id;
  }

  let productRefId = req.validatedBody.productRef;
  if (!productRefId && req.validatedBody.product) {
    const p = await Product.findOne({ name: req.validatedBody.product });
    if (p) productRefId = p._id;
  }

  const doc = await Complaint.create({
    ...req.validatedBody,
    complaintId,
    shop: shopId,
    productRef: productRefId,
    targetUser: req.validatedBody.targetUser
  });

  if (req.validatedBody.targetUser) {
    const fromShop = typeof req.validatedBody.shop === 'string' ? req.validatedBody.shop : 'a shopkeeper';
    await NotificationService.create({
      recipient: req.validatedBody.targetUser,
      type: 'SYSTEM',
      priority: 'HIGH',
      title: 'New Behaviour Complaint',
      message: `A new behaviour complaint was filed against you by ${fromShop}. Issue: ${req.validatedBody.issue}`,
      link: '/dashboard', // Adjust as needed
    });
  }

  await cache.del('complaints:list:*');

  const populatedDoc = await Complaint.findById(doc._id)
    .populate('shop')
    .populate('productRef')
    .populate('orderRef')
    .populate('targetUser', 'name email role');
  res.status(201).json(formatComplaint(populatedDoc));
}));

router.post(
  '/:complaintId/convert-to-return',
  requirePermission('returns.manage'),
  validate(convertComplaintSchema),
  convertComplaintToReturn
);

router.patch('/:complaintId', requirePermission('returns.manage'), validate(updateComplaintSchema), catchAsync(async (req, res) => {
  const updates = { ...req.validatedBody };
  if (updates.shop && typeof updates.shop === 'string' && !updates.shop.match(/^[0-9a-fA-F]{24}$/)) {
    const sk = await Shopkeeper.findOne({ name: updates.shop });
    if (sk) updates.shop = sk._id;
  }
  if (updates.productRef && typeof updates.productRef === 'string' && !updates.productRef.match(/^[0-9a-fA-F]{24}$/)) {
    const p = await Product.findOne({ name: updates.productRef });
    if (p) updates.productRef = p._id;
  }

  const doc = await Complaint.findOneAndUpdate(
    { complaintId: req.params.complaintId },
    updates,
    { new: true }
  ).populate('shop').populate('productRef').populate('orderRef').populate('returnRequestId');

  if (!doc) throw AppError.notFound('Complaint not found');

  await cache.del('complaints:list:*');

  res.json(formatComplaint(doc));
}));

export default router;
