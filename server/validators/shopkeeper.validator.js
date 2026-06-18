import { z } from 'zod';

export const createShopkeeperSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  owner: z.string().max(100).optional().nullable(),
  loc: z.string().max(200).optional().nullable(),
  phone: z.string().optional().nullable(),
  status: z.string().optional().default('active'),
  credit: z.number().optional().default(0),
  total: z.number().optional().default(0),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});

export const updateShopkeeperSchema = createShopkeeperSchema.partial();
