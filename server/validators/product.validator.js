import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, {
  message: 'Invalid ObjectId format'
});

export const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  cat: z.string().max(50).optional().nullable(),
  size: z.string().max(30).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  stock: z.number().int('Stock must be an integer').nonnegative('Stock cannot be negative').optional().default(0),
  unit: z.string().max(20).optional().nullable(),
  price: z.number().nonnegative('Price cannot be negative').optional().default(0),
  costPrice: z.number().min(0, 'Cost price cannot be negative').optional(),
  min: z.number().nonnegative('Min stock limit cannot be negative').optional().default(0),
  isActive: z.boolean().optional().default(true),
  supplier: objectIdSchema.optional().nullable(),
  imageFile: z.string().optional().nullable(),
  imageUrl: z.string().url('Must be a valid URL').optional().nullable(),
  cloudinaryPublicId: z.string().optional().nullable(),
});

export const updateProductSchema = createProductSchema.partial();

export const updateProductStockSchema = z.object({
  delta: z.number().int('Delta must be an integer'),
});
