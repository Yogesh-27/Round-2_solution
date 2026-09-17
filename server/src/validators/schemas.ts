import { z } from 'zod';

const uuid = z.string().uuid();

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(8).max(100),
  confirmPassword: z.string().min(8).max(100)
}).refine((data) => data.password === data.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match.' });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(100)
});

export const memberCreateSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phoneNumber: z.string().trim().min(4).max(40),
  email: z.string().trim().email().max(200).optional().or(z.literal(''))
});

export const purchaseSchema = z.object({
  amount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a positive decimal with at most 2 decimal places.'),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  clientRequestId: z.string().trim().min(8).max(120),
  notes: z.string().trim().max(500).optional()
}).superRefine((data, ctx) => {
  const amount = Number(data.amount);
  if (!Number.isFinite(amount) || amount <= 0) ctx.addIssue({ code: 'custom', path: ['amount'], message: 'Amount must be greater than 0.' });
});

export const redemptionSchema = z.object({
  rewardId: uuid,
  clientRequestId: z.string().trim().min(8).max(120),
  notes: z.string().trim().max(500).optional()
});

export const memberListSchema = z.object({
  search: z.string().trim().max(100).optional().default(''),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'phone', 'tier', 'balance', 'lifetimeEarnedPoints', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export const uuidParamSchema = z.object({ id: uuid });
export const transactionsQuerySchema = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20) });
