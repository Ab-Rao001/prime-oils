import { z } from 'zod';

export const createPurchaseOrderSchema = z.object({
  supplier: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Product ID'),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    unitCost: z.number().min(0, 'Unit cost cannot be negative'),
  })).min(1, 'At least one item is required'),
  notes: z.string().optional()
});

export const updatePurchaseOrderSchema = z.object({
  status: z.enum(['pending', 'received', 'cancelled']).optional(),
  notes: z.string().optional()
});
