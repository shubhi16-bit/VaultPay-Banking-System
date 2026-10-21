import { z } from 'zod';

export const dashboardAnalyticsQuerySchema = z.object({
  period: z
    .enum(['1m', '3m', '6m', '1y'], {
      errorMap: () => ({ message: "Period must be one of '1m', '3m', '6m', or '1y'" }),
    })
    .default('6m')
    .optional(),
  days: z
    .coerce
    .number()
    .int('Days must be an integer')
    .min(1, 'Days must be at least 1')
    .max(90, 'Days cannot exceed 90')
    .default(30)
    .optional(),
});
