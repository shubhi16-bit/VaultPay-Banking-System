import { z } from 'zod';

export const receiptQuerySchema = z.object({
  format: z.enum(['json', 'pdf']).default('json').optional(),
});
