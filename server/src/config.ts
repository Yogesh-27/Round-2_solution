import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().positive().default(900_000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().positive().default(30)
});

const isTest = process.env.NODE_ENV === 'test';

export const config = schema.parse({
  DATABASE_URL: process.env.DATABASE_URL ?? (isTest ? 'postgresql://postgres:postgres@localhost:5432/cafe_points_test?schema=public' : undefined),
  JWT_SECRET: process.env.JWT_SECRET ?? (isTest ? 'test-secret-test-secret-test-secret-1234' : undefined),
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  AUTH_RATE_LIMIT_WINDOW_MS: process.env.AUTH_RATE_LIMIT_WINDOW_MS,
  AUTH_RATE_LIMIT_MAX: process.env.AUTH_RATE_LIMIT_MAX
});
