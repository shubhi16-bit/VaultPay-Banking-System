import { z } from 'zod';

export const linkAccountSchema = z.object({
  bankId: z
    .number({ required_error: 'Bank ID is required' })
    .int('Bank ID must be an integer')
    .positive('Bank ID must be a positive integer'),
  accountType: z
    .enum(['savings', 'current'], {
      errorMap: () => ({ message: 'Account type must be either savings or current' }),
    })
    .default('savings')
    .optional(),
  initialBalance: z
    .number()
    .min(0, 'Initial balance cannot be negative')
    .max(1000000, 'Initial demo balance cannot exceed ₹1,000,000')
    .default(0.00)
    .optional(),
});
