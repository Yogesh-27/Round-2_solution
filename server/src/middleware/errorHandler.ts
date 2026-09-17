import type { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error(error);

  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) } });
    return;
  }

  if (error instanceof ZodError) {
    res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Request validation failed.', details: error.flatten() } });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    const target = Array.isArray(error.meta?.target) ? error.meta?.target.join(',') : 'unique field';
    const isPhone = String(target).includes('normalizedPhoneNumber');
    res.status(409).json({ error: { code: isPhone ? 'DUPLICATE_PHONE' : 'DUPLICATE_REQUEST', message: isPhone ? 'A member with this phone number already exists.' : 'A record with this unique key already exists.' } });
    return;
  }

  res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected server error occurred.' } });
};
