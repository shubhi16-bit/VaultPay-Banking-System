import { z } from 'zod';

export const depositSchema = z.object({
  amount: z
    .number({ required_error: 'Deposit amount is required' })
    .positive('Deposit amount must be greater than zero')
    .min(1.0, 'Minimum simulated deposit is ₹1.00')
    .max(50000.0, 'Maximum simulated deposit per transaction is ₹50,000.00'),
  note: z
    .string()
    .trim()
    .max(100, 'Note cannot exceed 100 characters')
    .optional()
    .default('Simulated demo deposit'),
});

export const transferSchema = z.object({
  recipientVaultpayId: z
    .string({ required_error: 'Recipient VaultPay ID is required' })
    .trim()
    .toLowerCase()
    .min(3, 'Recipient VaultPay ID must be at least 3 characters')
    .max(100, 'Recipient VaultPay ID cannot exceed 100 characters')
    .refine(
      val => val.includes('@vaultpay'),
      'Recipient ID must be a valid VaultPay ID (e.g., username@vaultpay)'
    ),
  amount: z
    .number({ required_error: 'Transfer amount is required' })
    .positive('Transfer amount must be greater than zero')
    .min(1.0, 'Minimum transfer amount is ₹1.00')
    .max(100000.0, 'Maximum transfer amount per transaction is ₹100,000.00'),
  note: z
    .string()
    .trim()
    .max(150, 'Note cannot exceed 150 characters')
    .optional()
    .default('VaultPay transfer'),
  idempotencyKey: z
    .string()
    .trim()
    .max(128, 'Idempotency key cannot exceed 128 characters')
    .optional(),
});

export const searchRecipientSchema = z.object({
  q: z
    .string({ required_error: 'Search query parameter is required' })
    .trim()
    .min(1, 'Search query must be at least 1 character')
    .max(100, 'Search query cannot exceed 100 characters'),
});

export const transactionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  type: z.enum(['all', 'transfer', 'deposit', 'withdrawal']).default('all'),
  flow: z.enum(['all', 'sent', 'received']).default('all'),
  status: z.enum(['all', 'completed', 'pending', 'failed']).default('all'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().trim().optional(),
});
