import { Router } from 'express';
import crypto from 'crypto';
import User from '../models/User.js';
import authenticate from '../middleware/auth.js';
import authorize from '../middleware/authorize.js';
import validate from '../middleware/validate.js';
import { paginate } from '../utils/pagination.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
const isSuperAdminEmail = (email) => {
  return String(email).toLowerCase() === (process.env.SUPER_ADMIN_EMAIL || 'admin@primeoil.com').toLowerCase();
};
import { createUserSchema, updateUserRoleSchema } from '../validators/user.validator.js';

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/', catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;

  if (req.query.page || req.query.limit) {
    const paginatedResult = await paginate(User, {}, {
      page,
      limit,
      sort: { createdAt: -1 },
    });
    
    // Remove passwords manually since we can't easily chain select to paginate currently without modifying paginate.js
    const users = paginatedResult.data.map(u => {
      const pu = { ...u };
      delete pu.password;
      return pu;
    });

    res.json({
      success: true,
      data: {
        ...paginatedResult,
        data: users.map(u => ({
          id: u._id.toString(),
          name: u.name,
          email: u.email,
          role: u.role,
          status: u.active === false ? 'inactive' : u.status,
          active: u.active !== false,
          createdAt: u.createdAt,
          joinedDate: u.createdAt,
          lastLogin: u.lastLogin,
          isSuperAdmin: isSuperAdminEmail(u.email),
        })),
      }
    });
  } else {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: users.map(u => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.active === false ? 'inactive' : u.status,
        active: u.active !== false,
        createdAt: u.createdAt,
        joinedDate: u.createdAt,
        lastLogin: u.lastLogin,
        isSuperAdmin: isSuperAdminEmail(u.email),
      })),
    });
  }
}));

router.post('/', validate(createUserSchema), catchAsync(async (req, res) => {
  const { name, email, role } = req.validatedBody;
  const emailNorm = email.toLowerCase();

  if (isSuperAdminEmail(emailNorm)) {
    throw AppError.validation('This email is reserved for the super admin account');
  }

  const existing = await User.findOne({ email: emailNorm });
  if (existing) {
    throw AppError.validation('Email is already registered');
  }

  const tempPassword = crypto.randomBytes(24).toString('base64url');
  const user = await User.create({
    name,
    email: emailNorm,
    role,
    password: tempPassword,
    status: 'active',
    active: true,
  });

  const resetToken = user.createPasswordResetToken();
  await user.save();

  res.status(201).json({
    success: true,
    data: user.toPublic(),
    invite: { token: resetToken },
    message: 'User created. Please share the reset token to allow them to set their password.',
  });
}));

router.put('/:id/role', validate(updateUserRoleSchema), catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw AppError.notFound('User not found');

  if (isSuperAdminEmail(user.email)) {
    throw AppError.forbidden('Super admin role cannot be changed');
  }

  if (user._id.toString() === req.user.id && req.validatedBody.role !== 'admin') {
    throw AppError.forbidden('You cannot remove your own admin role');
  }

  user.role = req.validatedBody.role;
  await user.save();

  res.json({ success: true, data: user.toPublic() });
}));

router.delete('/:id', catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw AppError.notFound('User not found');

  if (isSuperAdminEmail(user.email)) {
    throw AppError.forbidden('Super admin account cannot be disabled');
  }

  if (user._id.toString() === req.user.id) {
    throw AppError.forbidden('You cannot disable your own account');
  }

  // Remove firebase usage

  user.active = false;
  user.status = 'inactive';
  await user.save();

  res.json({
    success: true,
    data: user.toPublic(),
    message: 'User disabled in Firebase and marked inactive in the database',
  });
}));

router.post('/:id/reset-password', catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw AppError.notFound('User not found');

  if (!user.active) {
    throw AppError.validation('Cannot reset password for a disabled user');
  }

  const resetToken = user.createPasswordResetToken();
  await user.save();

  res.json({
    success: true,
    message: 'Password reset token generated successfully',
    data: { token: resetToken },
  });
}));

export default router;
