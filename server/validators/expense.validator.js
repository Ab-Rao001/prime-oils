import { z } from 'zod';

export const createExpenseSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  category: z.enum(['Fuel', 'Salary', 'Maintenance', 'Rent', 'Utilities', 'Other'], {
    errorMap: () => ({ message: 'Invalid category' })
  }),
  description: z.string().min(3, 'Description is too short'),
  date: z.string().optional()
});

export const updateExpenseSchema = createExpenseSchema.partial();
