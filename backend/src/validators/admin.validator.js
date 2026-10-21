import { z } from 'zod';

export const adminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
  search: z.string().trim().optional(),
  role: z.enum(['all', 'customer', 'admin']).default('all').optional(),
  status: z.enum(['all', 'active', 'frozen', 'closed']).default('all').optional(),
});

export const updateAccountStatusSchema = z.object({
  status: z.enum(['active', 'frozen'], {
    errorMap: () => ({ message: "Status must be either 'active' or 'frozen'" }),
  }),
  reason: z
    .string({
      required_error: 'A reason is required for updating account status',
    })
    .trim()
    .min(5, 'Reason must be at least 5 characters')
    .max(255, 'Reason cannot exceed 255 characters'),
});

export const adminAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  action: z.string().trim().optional(),
  entityType: z.string().trim().optional(),
  userId: z.coerce.number().int().positive().optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format')
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
    .optional(),
});
