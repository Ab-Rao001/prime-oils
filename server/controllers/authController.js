import User from '../models/User.js';
import Shopkeeper from '../models/Shopkeeper.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { generateAccessToken, generateTokenPair, verifyToken } from '../utils/jwt.js';
import crypto from 'crypto';
import { auth, isFirebaseInitialized } from '../config/firebase.js';
import AuditService from '../services/AuditService.js';

export const login = catchAsync(async (req, res) => {
  const { email, password } = req.validatedBody;

  if (email && password) {
    const user = await User.findByEmailWithPassword(email);
    if (!user) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    if (user.isAccountLocked()) {
      throw new AppError('Account is locked. Try again after 15 minutes', 403, 'ACCOUNT_LOCKED');
    }

    const passwordMatch = await user.comparePassword(password);
    if (!passwordMatch) {
      await user.recordFailedLogin();
      await AuditService.log({
        user: user._id,
        action: 'FAILED_LOGIN',
        collectionName: 'User',
        documentId: user._id,
        ipAddress: req.ip
      });
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.active || user.status !== 'active') {
      throw AppError.forbidden('User account is inactive or suspended');
    }

    const payload = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      tokenVersion: user.tokenVersion || 0
    };

    const { accessToken, refreshToken } = generateTokenPair(payload);
    user.loginHistory.push({ time: new Date(), ip: req.ip, status: 'success' });
    if (user.loginHistory.length > 20) user.loginHistory.shift();
    await user.recordSuccessfulLogin();
    
    await AuditService.log({
      user: user._id,
      action: 'LOGIN',
      collectionName: 'User',
      documentId: user._id,
      ipAddress: req.ip
    });

    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = { httpOnly: true, secure: isProduction, sameSite: 'strict' };
    res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 24 * 60 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

    return res.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  }

  throw AppError.validation('Email and password are required');
});

export const refresh = catchAsync(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.validatedBody.refreshToken;
  if (!refreshToken) {
    throw new AppError('Refresh token is required', 401, 'TOKEN_REQUIRED');
  }

  try {
    const decoded = verifyToken(refreshToken);
    const user = await User.findById(decoded.id);
    if (!user || !user.active || user.status !== 'active') {
      throw new AppError('Invalid user or suspended', 401, 'USER_SUSPENDED');
    }

    const payload = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      tokenVersion: user.tokenVersion || 0
    };

    const accessToken = generateAccessToken(payload);

    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('accessToken', accessToken, { 
      httpOnly: true, 
      secure: isProduction, 
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 
    });

    res.json({
      success: true
    });
  } catch (err) {
    if (err instanceof AppError && err.code === 'USER_SUSPENDED') throw err;
    throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }
});

export const signup = catchAsync(async (req, res) => {
  const { name, email, password, confirmPassword, phone, role } = req.validatedBody;

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new AppError('Email is already registered', 409, 'EMAIL_EXISTS');
  }

  const newUser = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    phone: phone || null,
    role: role || 'shopkeeper',
    status: 'active',
    active: true,
  });

  if (newUser.role === 'shopkeeper') {
    await Shopkeeper.create({
      name: newUser.name + " Store",
      owner: newUser.name,
      phone: newUser.phone,
      loc: "Pending",
      status: 'active'
    });
  }

  const payload = {
    id: newUser._id.toString(),
    role: newUser.role,
    email: newUser.email,
    tokenVersion: newUser.tokenVersion || 0
  };

  if (isFirebaseInitialized && auth) {
    try {
      const firebaseUser = await auth.createUser({
        email: email.toLowerCase(),
        password,
        displayName: name,
      });
      newUser.firebaseUid = firebaseUser.uid;
      await newUser.save();
    } catch (firebaseErr) {
      await User.findByIdAndDelete(newUser._id);
      throw AppError.validation('Failed to create user in Firebase: ' + firebaseErr.message);
    }
  }

  await AuditService.log({
    user: newUser._id,
    action: 'SIGNUP',
    collectionName: 'User',
    documentId: newUser._id,
    ipAddress: req.ip
  });

  const { accessToken, refreshToken } = generateTokenPair(payload);

  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = { httpOnly: true, secure: isProduction, sameSite: 'strict' };
  res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 24 * 60 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    user: {
      id: newUser._id.toString(),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      status: newUser.status
    }
  });
});

export const logout = catchAsync(async (req, res) => {
  await AuditService.log({
    user: req.user.id,
    action: 'LOGOUT',
    collectionName: 'User',
    documentId: req.user.id,
    ipAddress: req.ip
  });

  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = { httpOnly: true, secure: isProduction, sameSite: 'strict' };
  
  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

export const logoutAll = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (user) {
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
  }
  
  await AuditService.log({
    user: req.user.id,
    action: 'LOGOUT_ALL',
    collectionName: 'User',
    documentId: req.user.id,
    ipAddress: req.ip
  });

  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = { httpOnly: true, secure: isProduction, sameSite: 'strict' };
  
  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);

  res.json({
    success: true,
    message: 'Logged out of all sessions successfully'
  });
});

export const getMe = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw AppError.notFound('User not found');
  res.json({
    success: true,
    user: user.toPublic()
  });
});

export const forgotPassword = catchAsync(async (req, res) => {
  const user = await User.findOne({ email: req.validatedBody.email.toLowerCase() });
  if (!user) {
    return res.status(404).json({ success: false, message: 'There is no user with that email address.' });
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  await AuditService.log({
    user: user._id,
    action: 'FORGOT_PASSWORD',
    collectionName: 'User',
    documentId: user._id,
    ipAddress: req.ip
  });

  res.json({ success: true, message: 'Password reset token generated.', token: resetToken });
});

export const resetPassword = catchAsync(async (req, res) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) {
    throw new AppError('Token is invalid or has expired', 400, 'INVALID_TOKEN');
  }

  user.password = req.validatedBody.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  user.tokenVersion = (user.tokenVersion || 0) + 1; 
  await user.save();
  
  await AuditService.log({
    user: user._id,
    action: 'PASSWORD_RESET',
    collectionName: 'User',
    documentId: user._id,
    ipAddress: req.ip
  });

  res.json({ success: true, message: 'Password reset successfully' });
});

export const changePassword = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id).select('+password');
  if (!user) throw AppError.notFound('User not found');

  const { currentPassword, newPassword } = req.validatedBody;
  
  if (!(await user.comparePassword(currentPassword))) {
    throw new AppError('Incorrect current password', 401, 'INVALID_CREDENTIALS');
  }

  user.password = newPassword;
  user.tokenVersion = (user.tokenVersion || 0) + 1; 
  await user.save();

  res.json({ success: true, message: 'Password changed successfully' });
});
