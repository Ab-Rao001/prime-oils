import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, {
  message: 'Invalid ObjectId format',
});

export const createReturnSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  customerId: objectIdSchema.optional(),
  complaintId: objectIdSchema.optional(),
  products: z.array(z.object({
    productId: objectIdSchema,
    quantity: z.number().int().positive('Quantity must be positive'),
  })).min(1, 'At least one product is required'),
  reason: z.enum([
    'Leakage',
    'Damaged packaging',
    'Expired product',
    'Wrong product',
    'Quality issue',
    'Other',
  ]),
  resolutionType: z.enum(['REFUND', 'CREDIT_NOTE', 'REPLACEMENT', 'EXCHANGE']).optional().default('REFUND'),
  notes: z.string().optional(),
});

export const approveReturnSchema = z.object({
  outcome: z.enum(['APPROVED', 'REJECTED']),
  notes: z.string().optional(),
});

export const inspectReturnSchema = z.object({
  notes: z.string().optional(),
  grade: z.enum(['PASS', 'FAIL', 'PARTIAL']).optional(),
  inspectionPhotos: z.array(z.string()).optional(),
  products: z.array(z.object({
    productId: objectIdSchema,
    condition: z.enum(['UNOPENED', 'DAMAGED', 'EXPIRED', 'WRONG_ITEM']).optional(),
    disposition: z.enum(['RESTOCK_SELLABLE', 'RESTOCK_DAMAGED', 'SCRAP', 'REWORK']).optional(),
  })).optional(),
});

export const convertComplaintSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  products: z.array(z.object({
    productId: objectIdSchema,
    quantity: z.number().int().positive(),
  })).min(1),
  reason: z.enum([
    'Leakage',
    'Damaged packaging',
    'Expired product',
    'Wrong product',
    'Quality issue',
    'Other',
  ]).optional().default('Quality issue'),
  resolutionType: z.enum(['REFUND', 'CREDIT_NOTE', 'REPLACEMENT', 'EXCHANGE']).optional().default('REFUND'),
});
