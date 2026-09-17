import type { Response } from 'express';
import { prisma } from '../db.js';
import { recordPurchase } from '../services/loyaltyService.js';
import type { AuthenticatedRequest } from '../types/auth.js';
import { errors } from '../utils/errors.js';

export async function createPurchaseController(req: AuthenticatedRequest, res: Response) {
  if (!req.user) throw errors.unauthorized();
  const result = await recordPurchase(prisma, { memberId: req.params.id, ...req.body, createdById: req.user.id });
  res.status(201).json(result);
}
