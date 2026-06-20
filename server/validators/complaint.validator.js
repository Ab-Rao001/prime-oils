import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, {
  message: 'Invalid ObjectId format',
});

export const createComplaintSchema = z.object({
  shop: z.string().min(1, 'Shop identifier is required'),
  product: z.string().optional().nullable(),
  productRef: objectIdSchema.optional().nullable(),
  orderRef: objectIdSchema.optional().nullable(),
  targetUser: objectIdSchema.optional().nullable(),
  issue: z.string().min(1, 'Issue description is required'),
  type: z.enum(['damaged', 'order', 'exchange', 'quality', 'delivery', 'behaviour']).optional(),
  status: z.enum([
    'pending',
    'in_review',
    'processing',
    'resolved',
    'converted_to_return',
    'escalated',
    'closed_no_action',
  ]).optional().default('pending'),
  date: z.string().optional(),
});

export const updateComplaintSchema = createComplaintSchema.partial();
