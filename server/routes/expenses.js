import { Router } from 'express';
import Expense from '../models/Expense.js';
import authenticate from '../middleware/auth.js';
import { requirePermission } from '../utils/permissions.js';
import validate from '../middleware/validate.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { getPagination, getSafeSort } from '../utils/pagination.js';
import { createExpenseSchema, updateExpenseSchema } from '../validators/expense.validator.js';
import AuditService from '../services/AuditService.js';

const router = Router();

router.use(authenticate);

// Get all expenses
router.get('/', requirePermission('reports.read'), catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const sort = getSafeSort(req.query.sort, ['createdAt', 'date', 'amount', 'category'], { date: -1 });

  const [docs, total] = await Promise.all([
    Expense.find()
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('loggedBy', 'name email')
      .lean(),
    Expense.countDocuments()
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

// Create expense
router.post('/', requirePermission('admin'), validate(createExpenseSchema), catchAsync(async (req, res) => {
  const data = req.validatedBody;
  data.loggedBy = req.user.id;
  
  if (data.date) {
      data.date = new Date(data.date);
  }

  const newExpense = await Expense.create(data);
  const populated = await Expense.findById(newExpense._id).populate('loggedBy', 'name email');
  
  await AuditService.log({
    user: req.user.id,
    action: 'CREATE_EXPENSE',
    collectionName: 'Expense',
    documentId: newExpense._id,
    newValue: data
  });

  res.status(201).json(populated);
}));

// Update expense
router.patch('/:id', requirePermission('admin'), validate(updateExpenseSchema), catchAsync(async (req, res) => {
  const data = req.validatedBody;
  if (data.date) {
      data.date = new Date(data.date);
  }
  
  const expense = await Expense.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true })
    .populate('loggedBy', 'name email');
    
  if (!expense) throw AppError.notFound('Expense not found');

  await AuditService.log({
    user: req.user.id,
    action: 'UPDATE_EXPENSE',
    collectionName: 'Expense',
    documentId: expense._id,
    newValue: data
  });

  res.json(expense);
}));

// Delete expense
router.delete('/:id', requirePermission('admin'), catchAsync(async (req, res) => {
  const expense = await Expense.findByIdAndDelete(req.params.id);
  if (!expense) throw AppError.notFound('Expense not found');

  await AuditService.log({
    user: req.user.id,
    action: 'DELETE_EXPENSE',
    collectionName: 'Expense',
    documentId: expense._id,
    oldValue: expense
  });

  res.status(204).send();
}));

export default router;
