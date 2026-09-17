import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export function validateBody(schema: { parse: (input: unknown) => unknown }) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Request validation failed.', details: error.flatten() } });
        return;
      }
      next(error);
    }
  };
}

export function validateQuery(schema: { parse: (input: unknown) => unknown }) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as typeof req.query;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function validateParams(schema: { parse: (input: unknown) => unknown }) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      next(error);
    }
  };
}
