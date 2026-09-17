import type { Response } from 'express';
import { prisma } from '../db.js';
import { createMember, getMember, listMembers } from '../services/memberService.js';
import type { AuthenticatedRequest } from '../types/auth.js';

export async function createMemberController(req: AuthenticatedRequest, res: Response) {
  const member = await createMember(prisma, req.body);
  res.status(201).json({ member });
}

export async function listMembersController(req: AuthenticatedRequest, res: Response) {
  const result = await listMembers(prisma, req.query as unknown as { search: string; page: number; pageSize: number; sortBy: string; sortOrder: 'asc' | 'desc' });
  res.json(result);
}

export async function getMemberController(req: AuthenticatedRequest, res: Response) {
  const member = await getMember(prisma, req.params.id);
  const program = await prisma.loyaltyProgram.findFirst({ where: { active: true }, orderBy: { createdAt: 'desc' } });
  const nextTier = member.currentTier === 'BRONZE' ? 'SILVER' : member.currentTier === 'SILVER' ? 'GOLD' : member.currentTier === 'GOLD' ? 'PLATINUM' : null;
  const threshold = nextTier === 'SILVER' ? program?.silverThreshold : nextTier === 'GOLD' ? program?.goldThreshold : nextTier === 'PLATINUM' ? program?.platinumThreshold : null;
  res.json({
    member,
    tierProgression: nextTier && threshold !== undefined && threshold !== null ? { nextTier, threshold, pointsNeeded: Math.max(0, threshold - member.lifetimeEarnedPoints) } : null
  });
}

export async function getMemberTransactionsController(req: AuthenticatedRequest, res: Response) {
  await getMember(prisma, req.params.id);
  const page = Number(req.query.page);
  const pageSize = Number(req.query.pageSize);
  const skip = (page - 1) * pageSize;
  const [items, total] = await Promise.all([
    prisma.pointLedger.findMany({
      where: { memberId: req.params.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      select: { id: true, transactionType: true, pointsDelta: true, balanceAfter: true, description: true, createdAt: true, referenceId: true, referenceType: true }
    }),
    prisma.pointLedger.count({ where: { memberId: req.params.id } })
  ]);
  res.json({ items, page, pageSize, total, totalPages: Math.ceil(total / pageSize), hasNext: page * pageSize < total, hasPrevious: page > 1 });
}
