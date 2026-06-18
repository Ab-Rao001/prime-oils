import { z } from 'zod';

const roleEnum = z.enum(['admin', 'shopkeeper', 'salesman', 'supplier']);

export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Must be a valid email'),
  role: roleEnum,
});

export const updateUserRoleSchema = z.object({
  role: roleEnum,
});
