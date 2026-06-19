import { Router } from 'express';
import Expense from '../models/Expense.js';
import authenticate from '../middleware/auth.js';
import authorize from '../middleware/authorize.js';
import validate from '../middleware/validate.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { paginate } from '../utils/pagination.js';
import { createExpenseSchema, updateExpenseSchema } from '../validators/expense.validator.js';
import AuditService from '../services/AuditService.js';

const router = Router();

router.use(authenticate);

// Get all expenses
router.get('/', authorize('admin'), catchAsync(async (req, res) => {
  const page = req.query.page ? parseInt(req.query.page, 10) : null;
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;

  if (page || limit) {
    const paginatedResult = await paginate(Expense, {}, {
      page,
      limit,
      sort: { date: -1 },
      populate: ['loggedBy'],
    });
    res.json(paginatedResult);
  } else {
    const docs = await Expense.find()
      .sort({ date: -1 })
      .populate('loggedBy', 'name email')
      .lean();
    res.json(docs);
  }
}));

// Create expense
router.post('/', authorize('admin'), validate(createExpenseSchema), catchAsync(async (req, res) => {
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
router.patch('/:id', authorize('admin'), validate(updateExpenseSchema), catchAsync(async (req, res) => {
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
router.delete('/:id', authorize('admin'), catchAsync(async (req, res) => {
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
