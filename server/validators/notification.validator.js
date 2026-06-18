import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, {
  message: 'Invalid ObjectId format'
});

export const createNotificationSchema = z.object({
  recipient: objectIdSchema.optional().nullable(),
  type: z.string().min(1, 'Type is required').max(50),
  msg: z.string().min(1, 'Message is required').max(500),
  date: z.string().optional()
});

export const updateNotificationSchema = createNotificationSchema.partial();
