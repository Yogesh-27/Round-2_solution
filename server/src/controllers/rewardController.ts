import type { Response } from 'express';
import { prisma } from '../db.js';
import type { AuthenticatedRequest } from '../types/auth.js';

export async function listRewardsController(_req: AuthenticatedRequest, res: Response) {
  const rewards = await prisma.reward.findMany({ where: { active: true }, orderBy: { pointsCost: 'asc' }, select: { id: true, name: true, description: true, pointsCost: true, active: true } });
  res.json({ items: rewards });
}
