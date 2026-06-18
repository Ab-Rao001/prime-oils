import { z } from 'zod';

export const createCampaignSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  budget: z.number().nonnegative('Budget cannot be negative').optional(),
  spent: z.number().nonnegative().optional().default(0),
  start: z.string().optional(),
  end: z.string().optional(),
  status: z.string().optional(),
  roi: z.string().optional(),
});

export const updateCampaignSchema = createCampaignSchema.partial();
