import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, {
  message: 'Invalid ObjectId format'
});

export const createOrderSchema = z.object({
  shopkeeperId: objectIdSchema.optional(),
  shop: z.string().min(1, 'Shop or Shopkeeper identifier is required'),
  man: z.string().optional().nullable(), // Can be salesman ID or name
  items: z.array(
    z.object({
      productId: objectIdSchema,
      quantity: z.number().int('Quantity must be an integer').positive('Quantity must be greater than zero')
    })
  ).min(1, 'Order must contain at least one item'),
  total: z.number().nonnegative('Total must be non-negative').optional(),
  status: z.enum(['pending', 'confirmed', 'delivered', 'cancelled']).optional().default('pending'),
  date: z.string().optional(),
  pay: z.string().optional().default('installment'),
}).refine(data => data.shopkeeperId || data.shop, {
  message: "Either shopkeeperId (ObjectId) or shop identifier must be provided",
  path: ["shop"]
});

export const updateOrderSchema = z.object({
  shopkeeperId: objectIdSchema.optional(),
  shop: z.string().optional(),
  man: z.string().optional().nullable(),
  items: z.array(
    z.object({
      productId: objectIdSchema,
      quantity: z.number().int().positive()
    })
  ).min(1).optional(),
  total: z.number().nonnegative().optional(),
  status: z.enum(['pending', 'confirmed', 'delivered', 'cancelled']).optional(),
  date: z.string().optional(),
  pay: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'delivered', 'cancelled'], { required_error: 'Status is required' }),
});
