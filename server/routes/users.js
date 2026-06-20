import { Router } from 'express';
import crypto from 'crypto';
import User from '../models/User.js';
import Shopkeeper from '../models/Shopkeeper.js';
import authenticate from '../middleware/auth.js';
import { requirePermission } from '../utils/permissions.js';
import validate from '../middleware/validate.js';
import { getPagination, getSafeSort } from '../utils/pagination.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
const isSuperAdminEmail = (email) => {
  return String(email).toLowerCase() === (process.env.SUPER_ADMIN_EMAIL || 'admin@primeoil.com').toLowerCase();
};
import { createUserSchema, updateUserRoleSchema } from '../validators/user.validator.js';
import { auth, isFirebaseInitialized } from '../config/firebase.js';
import { handleProductImageUpload } from '../middleware/uploadProductImage.js';
import { uploadImageBuffer, destroyImage } from '../utils/cloudinaryUpload.js';
import { getOnlineUsers } from '../utils/socket.js';
import { cache } from '../utils/cache.js';

const router = Router();

router.use(authenticate);



router.put('/profile', catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw AppError.notFound('User not found');

  const { name, phone, address } = req.body;
  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (address !== undefined) user.address = address;

  await user.save();

  if (user.role === 'shopkeeper') {
    const shopkeeper = await Shopkeeper.findOne({ 
      $or: [{ userId: user._id }, { email: user.email }, { owner: user.name }] 
    });
    if (shopkeeper) {
      if (address !== undefined) {
        shopkeeper.loc = address;
        // Extract coordinates from formatted address "[lat, lon]" or "lat, lon"
        const coordMatch = address.match(/\[([\d.-]+),\s*([\d.-]+)\]/);
        const legacyMatch = address.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
        
        if (coordMatch) {
          shopkeeper.location = {
            type: 'Point',
            coordinates: [parseFloat(coordMatch[2]), parseFloat(coordMatch[1])] // [lon, lat]
          };
        } else if (legacyMatch) {
          shopkeeper.location = {
            type: 'Point',
            coordinates: [parseFloat(legacyMatch[2]), parseFloat(legacyMatch[1])]
          };
        }
      }
      if (phone !== undefined) shopkeeper.phone = phone;
      if (name) shopkeeper.owner = name;
      await shopkeeper.save();
      await cache.del('shopkeepers:list:*');
    }
  }

  res.json({ success: true, data: user.toPublic(), message: 'Profile updated' });
}));

router.post('/profile/avatar', handleProductImageUpload, catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw AppError.notFound('User not found');

  if (user.cloudinaryPublicId) {
    try {
      await destroyImage(user.cloudinaryPublicId);
    } catch (e) {
      console.warn('Failed to destroy old avatar image:', e.message);
    }
  }

  const result = await uploadImageBuffer(req.file.buffer, {
    public_id: `avatar-${user._id}`,
    folder: 'avatars',
    overwrite: true,
  });

  user.avatarUrl = result.secure_url;
  user.cloudinaryPublicId = result.public_id;
  await user.save();

  res.json({ success: true, data: user.toPublic(), message: 'Avatar updated successfully' });
}));

router.get('/salesmen', catchAsync(async (req, res) => {
  const salesmen = await User.find({ role: 'salesman', active: { $ne: false }, isDeleted: { $ne: true } }).select('name').lean();
  res.json({
    success: true,
    data: salesmen.map(s => ({ id: s._id.toString(), name: s.name }))
  });
}));

router.use(requirePermission('admin'));

router.get('/', catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const sort = getSafeSort(req.query.sort, ['createdAt', 'name', 'email', 'role', 'status'], { createdAt: -1 });

  const filter = { isDeleted: { $ne: true } };

  const [docs, total] = await Promise.all([
    User.find(filter)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter)
  ]);

  const onlineSet = new Set(getOnlineUsers());

  const users = docs.map(u => ({
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.active === false ? 'inactive' : u.status,
    active: u.active !== false,
    createdAt: u.createdAt,
    joinedDate: u.createdAt,
    lastLogin: u.lastLogin,
    loginHistory: u.loginHistory || [],
    isSuperAdmin: isSuperAdminEmail(u.email),
    isOnline: onlineSet.has(u._id.toString()),
  }));

  res.json({
    success: true,
    data: users,
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

router.post('/', validate(createUserSchema), catchAsync(async (req, res) => {
  const { name, email, password, role } = req.validatedBody;
  const emailNorm = email.toLowerCase();

  if (isSuperAdminEmail(emailNorm)) {
    throw AppError.validation('This email is reserved for the super admin account');
  }

  const existing = await User.findOne({ email: emailNorm });
  if (existing) {
    throw AppError.validation('Email is already registered');
  }

  const user = await User.create({
    name,
    email: emailNorm,
    role,
    password,
    status: 'active',
    active: true,
  });

  if (isFirebaseInitialized && auth) {
    try {
      const firebaseUser = await auth.createUser({
        email: emailNorm,
        password,
        displayName: name,
      });
      user.firebaseUid = firebaseUser.uid;
      await user.save();
    } catch (firebaseErr) {
      // If Firebase fails, rollback MongoDB user creation
      await User.findByIdAndDelete(user._id);
      throw AppError.validation('Failed to create user in Firebase: ' + firebaseErr.message);
    }
  }

  res.status(201).json({
    success: true,
    data: user.toPublic(),
    message: 'User created successfully.',
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

  if (isFirebaseInitialized && user.firebaseUid && auth) {
    try {
      await auth.deleteUser(user.firebaseUid);
    } catch (firebaseErr) {
      console.warn('Failed to delete user from Firebase (they might not exist there):', firebaseErr.message);
    }
  }

  await User.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'User permanently deleted from the database',
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
