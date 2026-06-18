import { Router } from 'express';
import Product from '../models/Product.js';
import { formatProduct } from '../utils/format.js';
import { paginate } from '../utils/pagination.js';
import { cache } from '../utils/cache.js';
import authenticate from '../middleware/auth.js';
import authorize from '../middleware/authorize.js';
import validate from '../middleware/validate.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { handleProductImageUpload } from '../middleware/uploadProductImage.js';
import { uploadImageBuffer, destroyImage } from '../utils/cloudinaryUpload.js';
import { resolveProductQuery } from '../utils/productQuery.js';
import {
  createProductSchema,
  updateProductSchema,
  updateProductStockSchema,
} from '../validators/product.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('admin', 'supplier', 'salesman', 'shopkeeper'), catchAsync(async (req, res) => {
  const page = req.query.page ? parseInt(req.query.page, 10) : null;
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;
  const q = req.query.q || '';
  const cat = req.query.cat || '';

  const cacheKey = `products:list:page:${page || 'all'}:limit:${limit || 'all'}:q:${q}:cat:${cat}`;
  const cachedData = await cache.get(cacheKey);
  if (cachedData) {
    return res.json(cachedData);
  }

  const filter = { isActive: true };
  if (q) {
    filter.$text = { $search: q };
  }
  if (cat) {
    filter.cat = cat;
  }

  let responseData;

  if (page || limit) {
    const paginatedResult = await paginate(Product, filter, {
      page,
      limit,
      sort: q ? { score: { $meta: 'textScore' } } : { createdAt: -1 },
    });
    responseData = {
      data: paginatedResult.data.map(formatProduct),
      pagination: paginatedResult.pagination,
    };
  } else {
    const docs = await Product.find(filter)
      .sort(q ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
      .lean();
    responseData = docs.map(formatProduct);
  }

  await cache.set(cacheKey, responseData, 300);
  res.json(responseData);
}));

router.post('/', authorize('admin', 'supplier'), validate(createProductSchema), catchAsync(async (req, res) => {
  const count = await Product.countDocuments();
  const sku = req.validatedBody.sku || `PROD-${String(count + 1).padStart(3, '0')}`;
  const doc = await Product.create({ ...req.validatedBody, sku });

  await cache.del('products:list:*');

  res.status(201).json(formatProduct(doc));
}));

router.post(
  '/:id/image',
  authorize('admin', 'supplier'),
  handleProductImageUpload,
  catchAsync(async (req, res) => {
    const doc = await Product.findOne(resolveProductQuery(req.params.id));
    if (!doc) throw AppError.notFound('Product not found');

    if (doc.cloudinaryPublicId) {
      await destroyImage(doc.cloudinaryPublicId);
    }

    const result = await uploadImageBuffer(req.file.buffer, {
      public_id: `product-${doc._id}`,
      overwrite: true,
    });

    doc.imageUrl = result.secure_url;
    doc.cloudinaryPublicId = result.public_id;
    doc.imageFile = req.file.originalname;
    await doc.save();

    await cache.del('products:list:*');

    res.json(formatProduct(doc));
  })
);

router.delete('/:id/image', authorize('admin', 'supplier'), catchAsync(async (req, res) => {
  const doc = await Product.findOne(resolveProductQuery(req.params.id));
  if (!doc) throw AppError.notFound('Product not found');

  if (doc.cloudinaryPublicId) {
    await destroyImage(doc.cloudinaryPublicId);
  }

  const updated = await Product.findOneAndUpdate(
    { _id: doc._id },
    { $unset: { imageUrl: 1, cloudinaryPublicId: 1, imageFile: 1 } },
    { new: true }
  );

  await cache.del('products:list:*');

  res.json(formatProduct(updated));
}));

router.patch('/:id', authorize('admin', 'supplier'), validate(updateProductSchema), catchAsync(async (req, res) => {
  const doc = await Product.findOneAndUpdate(resolveProductQuery(req.params.id), req.validatedBody, { new: true });
  if (!doc) throw AppError.notFound('Product not found');

  await cache.del('products:list:*');

  res.json(formatProduct(doc));
}));

router.patch('/:id/stock', authorize('admin', 'supplier'), validate(updateProductStockSchema), catchAsync(async (req, res) => {
  const { delta } = req.validatedBody;
  const deltaNum = Number(delta);

  let doc;
  if (deltaNum < 0) {
    // Decrement stock: use atomic update with $gte check to prevent stock from going below 0
    doc = await Product.findOneAndUpdate(
      { ...resolveProductQuery(req.params.id), stock: { $gte: -deltaNum } },
      { $inc: { stock: deltaNum } },
      { new: true }
    );
    if (!doc) {
      // Check if product exists first
      const exists = await Product.findOne(resolveProductQuery(req.params.id));
      if (!exists) {
        throw AppError.notFound('Product not found');
      }
      throw AppError.validation('Insufficient stock for the requested adjustment');
    }
  } else {
    // Increment stock: always allowed, perform atomic increment
    doc = await Product.findOneAndUpdate(
      resolveProductQuery(req.params.id),
      { $inc: { stock: deltaNum } },
      { new: true }
    );
    if (!doc) {
      throw AppError.notFound('Product not found');
    }
  }

  await cache.del('products:list:*');

  res.json(formatProduct(doc));
}));


export default router;
