import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, {
  message: 'Invalid ObjectId format'
});

export const createComplaintSchema = z.object({
  shop: z.string().min(1, 'Shop identifier is required'),
  product: z.string().optional().nullable(),
  productRef: objectIdSchema.optional().nullable(),
  issue: z.string().min(1, 'Issue description is required'),
  type: z.string().optional(),
  status: z.string().optional().default('pending'),
  date: z.string().optional(),
});

export const updateComplaintSchema = createComplaintSchema.partial();
