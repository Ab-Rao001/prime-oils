import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import validate from '../middleware/validate.js';
import authenticate from '../middleware/auth.js';
import catchAsync from '../utils/catchAsync.js';
import { loginSchema, signupSchema, refreshSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from '../validators/auth.validator.js';
import { 
  login, 
  refresh, 
  signup, 
  logout, 
  logoutAll, 
  getMe, 
  forgotPassword, 
  resetPassword, 
  changePassword 
} from '../controllers/authController.js';

const router = Router();

import { authLimiter } from '../middleware/rateLimiters.js';
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh', validate(refreshSchema), refresh);
router.post('/signup', authLimiter, validate(signupSchema), signup);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password/:token', authLimiter, validate(resetPasswordSchema), resetPassword);
router.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);

router.get('/sessions', authenticate, catchAsync(async (req, res) => {
  const { default: Session } = await import('../models/Session.js');
  const sessions = await Session.find({ user: req.user.id, isRevoked: false }).sort({ lastActivity: -1 }).lean();
  res.json({ success: true, data: sessions });
}));

router.delete('/sessions/all', authenticate, logoutAll);

router.delete('/sessions/:sessionId', authenticate, catchAsync(async (req, res) => {
  const { default: Session } = await import('../models/Session.js');
  const session = await Session.findOne({ _id: req.params.sessionId, user: req.user.id });
  if (session) {
    session.isRevoked = true;
    await session.save();
  }
  res.json({ success: true, message: 'Session revoked' });
}));

export default router;
