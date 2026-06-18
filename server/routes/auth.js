import { Router } from 'express';
import User from '../models/User.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { generateAccessToken, generateTokenPair, verifyToken } from '../utils/jwt.js';
import validate from '../middleware/validate.js';
import authenticate from '../middleware/auth.js';
import { loginSchema, signupSchema, refreshSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from '../validators/auth.validator.js';
import crypto from 'crypto';


const router = Router();

/**
 * POST /auth/login
 * Supports both Firebase tokens and local email/password authentication.
 * Returns signed server JWT access and refresh tokens.
 */
router.post('/login', validate(loginSchema), catchAsync(async (req, res) => {
  const { email, password } = req.validatedBody;

  // Local email/password login
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
    await user.recordSuccessfulLogin();

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
}));

/**
 * POST /auth/refresh
 * Refresh token rotation to request new short-lived access tokens.
 */
router.post('/refresh', validate(refreshSchema), catchAsync(async (req, res) => {
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
}));

/**
 * POST /auth/signup
 * Register a new user with email and password
 */
router.post('/signup', validate(signupSchema), catchAsync(async (req, res) => {
  const { name, email, password, confirmPassword, phone, role } = req.validatedBody;

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new AppError('Email is already registered', 409, 'EMAIL_EXISTS');
  }

  // Create new user
  const newUser = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    phone: phone || null,
    role: role || 'shopkeeper',
    status: 'active',
    active: true,
  });

  // Generate tokens
  const payload = {
    id: newUser._id.toString(),
    role: newUser.role,
    email: newUser.email,
    tokenVersion: newUser.tokenVersion || 0
  };

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
}));

/**
 * POST /auth/logout
 * Logout endpoint (optional - for frontend cookie/token cleanup)
 */
router.post('/logout', catchAsync(async (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = { httpOnly: true, secure: isProduction, sameSite: 'strict' };
  
  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}));

/**
 * POST /auth/logout-all
 * Invalidate all active sessions
 */
router.post('/logout-all', authenticate, catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (user) {
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
  }
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = { httpOnly: true, secure: isProduction, sameSite: 'strict' };
  
  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);

  res.json({
    success: true,
    message: 'Logged out of all sessions successfully'
  });
}));

/**
 * GET /auth/me
 * Get current user profile
 */
router.get('/me', authenticate, catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw AppError.notFound('User not found');
  res.json({
    success: true,
    user: user.toPublic()
  });
}));

/**
 * POST /auth/forgot-password
 */
router.post('/forgot-password', validate(forgotPasswordSchema), catchAsync(async (req, res) => {
  const user = await User.findOne({ email: req.validatedBody.email.toLowerCase() });
  if (!user) {
    return res.status(404).json({ success: false, message: 'There is no user with that email address.' });
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // Mock sending email
  res.json({ success: true, message: 'Password reset token generated.', token: resetToken });
}));

/**
 * POST /auth/reset-password/:token
 */
router.post('/reset-password/:token', validate(resetPasswordSchema), catchAsync(async (req, res) => {
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
  user.tokenVersion = (user.tokenVersion || 0) + 1; // invalidate all active sessions
  await user.save();

  res.json({ success: true, message: 'Password reset successfully' });
}));

/**
 * POST /auth/change-password
 */
router.post('/change-password', authenticate, validate(changePasswordSchema), catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id).select('+password');
  if (!user) throw AppError.notFound('User not found');

  const { currentPassword, newPassword } = req.validatedBody;
  
  if (!(await user.comparePassword(currentPassword))) {
    throw new AppError('Incorrect current password', 401, 'INVALID_CREDENTIALS');
  }

  user.password = newPassword;
  user.tokenVersion = (user.tokenVersion || 0) + 1; // invalidate all active sessions
  await user.save();

  res.json({ success: true, message: 'Password changed successfully' });
}));

export default router;
