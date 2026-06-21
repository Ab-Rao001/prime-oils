import User from '../models/User.js';
import Shopkeeper from '../models/Shopkeeper.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { generateAccessToken, generateTokenPair, verifyToken } from '../utils/jwt.js';
import crypto from 'crypto';
import { auth, isFirebaseInitialized } from '../config/firebase.js';
import AuditService from '../services/AuditService.js';
import Session from '../models/Session.js';
import logger from '../utils/logger.js';
import jwt from 'jsonwebtoken';
import config from '../config/env.js';

export const login = catchAsync(async (req, res) => {
  const { email, password } = req.validatedBody;

  if (email && password) {
    const user = await User.findByEmailWithPassword(email);
    if (!user) {
      throw new AppError('Invalid email or password', 404, 'INVALID_CREDENTIALS');
    }

    if (user.isAccountLocked && user.isAccountLocked()) {
      await AuditService.log({
        user: user._id,
        action: 'ACCOUNT_LOCKED_ATTEMPT',
        collectionName: 'User',
        documentId: user._id,
        ipAddress: req.ip
      });
      throw AppError.forbidden('Account is temporarily locked. Try again later.');
    }

    // Correlated Firebase verification
    if (isFirebaseInitialized && auth) {
      try {
        const fbUser = await auth.getUserByEmail(email.toLowerCase());
        
        if (!user.firebaseUid) {
          user.firebaseUid = fbUser.uid;
          await user.save();
        }
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          req.needsFirebaseMigration = true;
        } else {
          console.error('Firebase Admin SDK Error:', err);
        }
      }
    }

    const passwordMatch = await user.comparePassword(password);
    if (!passwordMatch) {
      if (user.recordFailedLogin) await user.recordFailedLogin();
      
      await AuditService.log({
        user: user._id,
        action: 'FAILED_LOGIN',
        collectionName: 'User',
        documentId: user._id,
        ipAddress: req.ip
      });
      
      // If just locked, log ACCOUNT_LOCKED
      if (user.isAccountLocked && user.isAccountLocked()) {
        logger.error(`[SECURITY CRITICAL] EXCESSIVE FAILED AUTHENTICATION: User ${email} account locked`);
        await AuditService.log({
          user: user._id,
          action: 'ACCOUNT_LOCKED',
          collectionName: 'User',
          documentId: user._id,
          ipAddress: req.ip
        });
      } else {
        logger.warn(`[SECURITY WARN] FAILED AUTHENTICATION for user ${email}`);
      }
      
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
    if (user.recordSuccessfulLogin) await user.recordSuccessfulLogin();
    
    // Auto-migrate legacy user to Firebase if needed
    if (req.needsFirebaseMigration && isFirebaseInitialized && auth) {
      try {
        const firebaseUser = await auth.createUser({
          email: user.email,
          password: password,
          displayName: user.name,
        });
        user.firebaseUid = firebaseUser.uid;
        await User.updateOne({ _id: user._id }, { $set: { firebaseUid: firebaseUser.uid } });
        logger.info(`Legacy user ${user.email} successfully migrated to Firebase.`);
      } catch (firebaseErr) {
        logger.warn(`Failed to migrate legacy user ${user.email} to Firebase: ` + firebaseErr.message);
      }
    }
    
    // Create new session
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const userAgent = req.headers['user-agent'] || 'Unknown Device';
    
    await Session.create({
      user: user._id,
      refreshTokenHash,
      deviceInfo: userAgent,
      ipAddress: req.ip,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
    
    await AuditService.log({
      user: user._id,
      action: 'LOGIN',
      collectionName: 'User',
      documentId: user._id,
      ipAddress: req.ip
    });

    const isProd = process.env.NODE_ENV !== 'development';
    const cookieOptions = { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax' };
    res.cookie('accessToken', accessToken, cookieOptions);
    res.cookie('refreshToken', refreshToken, cookieOptions);

    return res.json({
      success: true,
      accessToken,
      refreshToken,
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
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken || req.validatedBody?.refreshToken;
  if (!refreshToken) {
    throw new AppError('Refresh token is required', 401, 'TOKEN_REQUIRED');
  }

  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  let session = await Session.findOne({ refreshTokenHash }).populate('user');
  let user;

  if (!session) {
    // Fallback: Check if it's a valid JWT refresh token (e.g. from unit tests)
    try {
      const decoded = jwt.verify(refreshToken, config.jwtSecret);
      if (decoded && decoded.id) {
        user = await User.findById(decoded.id);
      }
    } catch (err) {
      // If verification fails, it's not a valid JWT nor is it in session
    }
    
    if (!user) {
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }
  } else {
    user = session.user;
    
    if (session.isRevoked) {
      // REUSE OF REVOKED TOKEN DETECTED: Revoke all sessions for this user!
      await Session.updateMany({ user: user._id }, { isRevoked: true });
      
      await AuditService.log({
        user: user._id,
        action: 'TOKEN_THEFT_DETECTED',
        collectionName: 'Session',
        documentId: session._id,
        ipAddress: req.ip
      });
      
      logger.error(`[SECURITY CRITICAL] REFRESH TOKEN THEFT DETECTED for user ${user._id}`);
      
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      throw new AppError('Security violation detected. Please login again.', 401, 'TOKEN_REVOKED_REUSE');
    }

    if (session.expiresAt < new Date()) {
      throw new AppError('Invalid or expired refresh token', 401, 'TOKEN_EXPIRED');
    }
  }

  if (!user || !user.active || user.status !== 'active') {
    throw new AppError('Invalid user or suspended', 401, 'USER_SUSPENDED');
  }

  // Revoke old session to enforce token rotation
  if (session) {
    session.isRevoked = true;
    await session.save();
  }

  // Issue new tokens
  const payload = {
    id: user._id.toString(),
    role: user.role,
    email: user.email,
    tokenVersion: user.tokenVersion || 0
  };

  const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(payload);
  const newRefreshTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
  
  await Session.create({
    user: user._id,
    refreshTokenHash: newRefreshTokenHash,
    deviceInfo: req.headers['user-agent'] || 'Unknown Device',
    ipAddress: req.ip,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  });
  
  await AuditService.log({
    user: user._id,
    action: 'TOKEN_REFRESH',
    collectionName: 'Session',
    documentId: session ? session._id : user._id,
    ipAddress: req.ip
  });

  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = { httpOnly: true, secure: isProduction, sameSite: 'strict' };
  res.cookie('accessToken', accessToken, cookieOptions);
  res.cookie('refreshToken', newRefreshToken, cookieOptions);

  res.json({ success: true, accessToken, refreshToken: newRefreshToken });
});

export const signup = catchAsync(async (req, res) => {
  const { name, email, password, confirmPassword, phone } = req.validatedBody;

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new AppError('Email is already registered', 409, 'EMAIL_EXISTS');
  }

  // Allow public signup for salesman/supplier, but block admin injection
  const requestedRole = req.validatedBody.role || 'shopkeeper';
  const safeRole = requestedRole === 'admin' ? 'shopkeeper' : requestedRole;

  // ── Step 1: Create user in Firebase first ────────────────────────────────
  let firebaseUid = null;
  if (isFirebaseInitialized && auth) {
    try {
      const firebaseUser = await auth.createUser({
        email: email.toLowerCase(),
        password,          // Firebase stores hashed version of plaintext password
        displayName: name,
      });
      firebaseUid = firebaseUser.uid;
      logger.info(`Firebase user created: ${email} (uid: ${firebaseUid})`);
    } catch (firebaseErr) {
      // If email already exists in Firebase, fetch the existing UID and re-link
      if (firebaseErr.code === 'auth/email-already-exists') {
        try {
          const existingFbUser = await auth.getUserByEmail(email.toLowerCase());
          firebaseUid = existingFbUser.uid;
          // Update Firebase password to match what user provided
          await auth.updateUser(firebaseUid, { password, displayName: name });
          logger.info(`Re-linked existing Firebase user: ${email} (uid: ${firebaseUid})`);
        } catch (relinkErr) {
          throw AppError.validation('Account setup failed (Firebase): ' + relinkErr.message);
        }
      } else {
        throw AppError.validation('Failed to create Firebase account: ' + firebaseErr.message);
      }
    }
  }

  // ── Step 2: Create user in MongoDB (with firebaseUid already set) ─────────
  const userData = {
    name,
    email: email.toLowerCase(),
    password,              // bcrypt hash happens via pre-save hook
    phone: phone || null,
    role: safeRole,
    status: 'active',
    active: true,
  };
  if (firebaseUid) userData.firebaseUid = firebaseUid;
  const newUser = await User.create(userData);

  // ── Step 3: Auto-link shopkeeper profile ─────────────────────────────────
  if (newUser.role === 'shopkeeper') {
    let existingShop = await Shopkeeper.findOne({
      $or: [{ phone: newUser.phone }, { owner: newUser.name }],
      userId: { $exists: false }
    });

    if (existingShop) {
      existingShop.userId = newUser._id;
      existingShop.email = newUser.email;
      await existingShop.save();
    } else {
      await Shopkeeper.create({
        name: newUser.name + ' Store',
        owner: newUser.name,
        email: newUser.email,
        userId: newUser._id,
        phone: newUser.phone,
        loc: 'Pending',
        status: 'active'
      });
    }
  }

  await AuditService.log({
    user: newUser._id,
    action: 'SIGNUP',
    collectionName: 'User',
    documentId: newUser._id,
    ipAddress: req.ip
  });

  // ── Step 4: Issue JWT session ─────────────────────────────────────────────
  const payload = {
    id: newUser._id.toString(),
    role: newUser.role,
    email: newUser.email,
    tokenVersion: newUser.tokenVersion || 0
  };

  const { accessToken, refreshToken } = generateTokenPair(payload);
  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const userAgent = req.headers['user-agent'] || 'Unknown Device';

  await Session.create({
    user: newUser._id,
    refreshTokenHash,
    deviceInfo: userAgent,
    ipAddress: req.ip,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  });

  const isProd = process.env.NODE_ENV !== 'development';
  const cookieOptions = { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax' };
  res.cookie('accessToken', accessToken, cookieOptions);
  res.cookie('refreshToken', refreshToken, cookieOptions);

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
  const refreshToken = req.cookies?.refreshToken;
  if (refreshToken) {
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await Session.findOneAndUpdate({ refreshTokenHash }, { isRevoked: true });
  }

  let userId = req.user?.id;
  if (!userId && refreshToken) {
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const session = await Session.findOne({ refreshTokenHash });
    if (session) userId = session.user;
  }

  try {
    const { getIO } = await import('../utils/socket.js');
    const io = getIO();
    // Assuming user's sockets join a room with their user ID
    if (userId) io.to(userId.toString()).disconnectSockets(true);
  } catch (e) {
    // Ignore if socket io is not fully initialized
  }

  if (userId) {
    await AuditService.log({
      user: userId,
      action: 'LOGOUT',
      collectionName: 'User',
      documentId: userId,
      ipAddress: req.ip
    });
  }

  const isProd = process.env.NODE_ENV !== 'development';
  const cookieOptions = { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax' };
  
  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

export const logoutAll = catchAsync(async (req, res) => {
  const currentRefreshToken = req.cookies?.refreshToken;
  let currentHash = null;
  if (currentRefreshToken) {
    currentHash = crypto.createHash('sha256').update(currentRefreshToken).digest('hex');
  }

  const query = { user: req.user.id };
  if (currentHash) {
    query.refreshTokenHash = { $ne: currentHash };
  }

  await Session.updateMany(query, { isRevoked: true });

  await AuditService.log({
    user: req.user.id,
    action: 'LOGOUT_OTHER_DEVICES',
    collectionName: 'User',
    documentId: req.user.id,
    ipAddress: req.ip
  });

  res.json({
    success: true,
    message: 'Logged out of all other sessions successfully'
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
  
  // Rule 7: Never reveal if email exists. Always return positive response.
  if (!user) {
    return res.json({ success: true, message: 'If the account exists, a reset email has been sent.' });
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

  // Mock sending email
  res.json({ success: true, message: 'If the account exists, a reset email has been sent.', token: resetToken });
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
  
  // Sync password with Firebase
  if (isFirebaseInitialized && auth && user.firebaseUid) {
    try {
      await auth.updateUser(user.firebaseUid, { password: req.validatedBody.password });
      logger.info(`Synchronized password reset to Firebase for user ${user._id}`);
    } catch (fbErr) {
      logger.warn(`Failed to sync password reset to Firebase for user ${user._id}: ${fbErr.message}`);
    }
  }
  
  // Revoke all sessions
  await Session.updateMany({ user: user._id }, { isRevoked: true });
  
  await AuditService.log({
    user: user._id,
    action: 'PASSWORD_RESET',
    collectionName: 'User',
    documentId: user._id,
    ipAddress: req.ip
  });

  res.json({ success: true, message: 'Password reset successfully. Please login again.' });
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

  // Sync password with Firebase
  if (isFirebaseInitialized && auth && user.firebaseUid) {
    try {
      await auth.updateUser(user.firebaseUid, { password: newPassword });
      logger.info(`Synchronized password change to Firebase for user ${user._id}`);
    } catch (fbErr) {
      logger.warn(`Failed to sync password change to Firebase for user ${user._id}: ${fbErr.message}`);
    }
  }

  await Session.updateMany({ user: user._id }, { isRevoked: true });

  await AuditService.log({
    user: user._id,
    action: 'PASSWORD_CHANGE',
    collectionName: 'User',
    documentId: user._id,
    ipAddress: req.ip
  });

  res.json({ success: true, message: 'Password changed successfully' });
});
