import type { NextFunction, Request, Response } from 'express';
import { authCookie, verifyAccessToken } from '../utils/jwt.js';
import { errors } from '../utils/errors.js';
import type { AuthenticatedRequest } from '../types/auth.js';

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[authCookie.name];
    if (!token) throw errors.unauthorized();
    const user = verifyAccessToken(token);
    (req as AuthenticatedRequest).user = user;
    next();
  } catch (error) {
    next(error instanceof Error && 'statusCode' in error ? error : errors.unauthorized());
  }
}
