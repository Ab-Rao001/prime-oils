import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import validate from '../middleware/validate.js';
import authenticate from '../middleware/auth.js';
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

router.post('/login', validate(loginSchema), login);
router.post('/refresh', validate(refreshSchema), refresh);
router.post('/signup', validate(signupSchema), signup);
router.post('/logout', logout);
router.post('/logout-all', authenticate, logoutAll);
router.get('/me', authenticate, getMe);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password/:token', validate(resetPasswordSchema), resetPassword);
router.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);

export default router;
