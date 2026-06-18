import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, {
  message: 'Invalid ObjectId format'
});

export const createPaymentSchema = z.object({
  shop: z.string().min(1, 'Shop identifier is required'),
  order: z.string().optional().nullable(), // Can be Order ID or order reference string
  total: z.number().nonnegative('Total must be non-negative').optional(),
  paid: z.number().nonnegative('Paid amount must be non-negative').optional().default(0),
  type: z.string().optional(),
  due: z.string().optional(),
  status: z.string().optional(),
});

export const updatePaymentSchema = createPaymentSchema.partial();
