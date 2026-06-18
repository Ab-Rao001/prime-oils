import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

export const signupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().optional().nullable(),
  role: z.enum(['shopkeeper', 'supplier', 'salesman', 'admin']).optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

export const refreshSchema = z.object({
  refreshToken: z.string().optional()
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email')
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters')
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters')
});
