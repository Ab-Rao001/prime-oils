import Product from '../models/Product.js';
import { formatProduct } from '../utils/format.js';
import { getPagination, getSafeSort } from '../utils/pagination.js';
import { cache } from '../utils/cache.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { uploadImageBuffer, destroyImage } from '../utils/cloudinaryUpload.js';
import { resolveProductQuery } from '../utils/productQuery.js';
import AuditService from '../services/AuditService.js';
import StockService from '../services/StockService.js';

export const getProducts = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const q = req.query.q || '';
  const cat = req.query.cat || '';
  const sort = getSafeSort(req.query.sort, ['createdAt', 'name', 'price', 'cat', 'sku', 'stock'], { createdAt: -1 });

  const cacheKey = `products:list:page:${page}:limit:${limit}:q:${q}:cat:${cat}:sort:${JSON.stringify(sort)}`;
  const cachedData = await cache.get(cacheKey);
  if (cachedData) {
    return res.json(cachedData);
  }

  const filter = { isActive: true, isDeleted: { $ne: true } };
  if (req.user && req.user.role === 'supplier') {
    filter.supplier = req.user.id;
  }
  
  if (q) {
    filter.$text = { $search: q };
  }
  if (cat) {
    filter.cat = cat;
  }

  const sortCriteria = q ? { score: { $meta: 'textScore' } } : sort;

  const [docs, total] = await Promise.all([
    Product.find(filter)
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit)
      .select('-description -longDescription -specs') // exclude heavy fields
      .lean(),
    Product.countDocuments(filter)
  ]);

  const responseData = {
    data: docs.map(formatProduct),
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
});

export const createProduct = catchAsync(async (req, res) => {
  const count = await Product.countDocuments();
  const sku = req.validatedBody.sku || `PROD-${String(count + 1).padStart(3, '0')}`;
  
  const productData = { ...req.validatedBody, sku };
  if (req.user && req.user.role === 'supplier') {
    productData.supplier = req.user.id;
  }
  
  const doc = await Product.create(productData);

  await AuditService.log({
    user: req.user.id,
    action: 'CREATE_PRODUCT',
    collectionName: 'Product',
    documentId: doc._id,
    newValue: { sku, name: doc.name }
  });

  await cache.del('products:list:*');

  res.status(201).json(formatProduct(doc));
});

export const uploadProductImage = catchAsync(async (req, res) => {
  const query = resolveProductQuery(req.params.id);
  if (req.user.role === 'supplier') query.supplier = req.user.id;
  
  const doc = await Product.findOne(query);
  if (!doc) throw AppError.notFound('Product not found or access denied');

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
});

export const deleteProductImage = catchAsync(async (req, res) => {
  const query = resolveProductQuery(req.params.id);
  if (req.user.role === 'supplier') query.supplier = req.user.id;

  const doc = await Product.findOne(query);
  if (!doc) throw AppError.notFound('Product not found or access denied');

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
});

export const updateProduct = catchAsync(async (req, res) => {
  const query = resolveProductQuery(req.params.id);
  if (req.user.role === 'supplier') query.supplier = req.user.id;

  const doc = await Product.findOneAndUpdate(query, req.validatedBody, { new: true });
  if (!doc) throw AppError.notFound('Product not found or access denied');

  await AuditService.log({
    user: req.user.id,
    action: 'UPDATE_PRODUCT',
    collectionName: 'Product',
    documentId: doc._id,
    newValue: req.validatedBody
  });

  await cache.del('products:list:*');

  res.json(formatProduct(doc));
});

export const updateProductStock = catchAsync(async (req, res) => {
  const { delta } = req.validatedBody;
  const deltaNum = Number(delta);
  if (deltaNum === 0) throw AppError.validation('Delta cannot be 0');

  const query = resolveProductQuery(req.params.id);
  if (req.user.role === 'supplier') query.supplier = req.user.id;

  const doc = await Product.findOne(query);
  if (!doc) throw AppError.notFound('Product not found or access denied');

  // We must use Mongoose Session to ensure atomicity, but for now we wrap the moveStock.
  const session = await Product.startSession();
  try {
    session.startTransaction();

    await StockService.moveStock({
      productId: doc._id,
      quantityChanged: deltaNum,
      movementType: 'adjustment',
      referenceDocument: null,
      user: req.user.id,
      session
    });

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

  // Fetch updated doc
  const updatedDoc = await Product.findById(doc._id);

  await AuditService.log({
    user: req.user.id,
    action: 'UPDATE_PRODUCT_STOCK',
    collectionName: 'Product',
    documentId: doc._id,
    newValue: { delta }
  });

  await cache.del('products:list:*');

  res.json(formatProduct(updatedDoc));
});

export const receiveProduct = catchAsync(async (req, res) => {
  const { productId, quantity, unitCost, notes } = req.body;
  const quantityNum = Number(quantity);
  if (quantityNum <= 0) throw AppError.validation('Received quantity must be strictly greater than 0');
  const costNum = unitCost ? Number(unitCost) : undefined;

  const query = resolveProductQuery(productId);
  if (req.user.role === 'supplier') query.supplier = req.user.id;

  const doc = await Product.findOne(query);
  if (!doc) throw AppError.notFound('Product not found or access denied');

  const session = await Product.startSession();
  try {
    session.startTransaction();

    await StockService.moveStock({
      productId: doc._id,
      quantityChanged: quantityNum,
      movementType: 'purchase',
      referenceDocument: null,
      unitCost: costNum,
      user: req.user.id,
      notes,
      session
    });

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

  const updatedDoc = await Product.findById(doc._id);

  await AuditService.log({
    user: req.user.id,
    action: 'RECEIVE_FACTORY_STOCK',
    collectionName: 'Product',
    documentId: doc._id,
    newValue: { quantity: quantityNum, unitCost: costNum }
  });

  await cache.del('products:list:*');

  res.json(formatProduct(updatedDoc));
});
