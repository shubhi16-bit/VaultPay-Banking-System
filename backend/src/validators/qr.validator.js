import { z } from 'zod';

export const resolvePayeeSchema = z.object({
  vaultpayId: z
    .string({
      required_error: 'VaultPay ID is required',
    })
    .trim()
    .min(3, 'VaultPay ID must be at least 3 characters')
    .max(100, 'VaultPay ID cannot exceed 100 characters'),
});

export const qrResolveBodySchema = z.object({
  qrPayload: z
    .string()
    .trim()
    .min(5, 'QR payload must be at least 5 characters')
    .optional(),
  vaultpayId: z
    .string()
    .trim()
    .min(3, 'VaultPay ID must be at least 3 characters')
    .optional(),
}).refine(data => data.qrPayload || data.vaultpayId, {
  message: 'Either qrPayload or vaultpayId must be provided',
});
