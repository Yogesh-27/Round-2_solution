import type { Response } from 'express';
import { prisma } from '../db.js';
import type { AuthenticatedRequest } from '../types/auth.js';

export async function dashboardSummaryController(_req: AuthenticatedRequest, res: Response) {
  const [totalMembers, pointsIssued, pointsRedeemed, tierCounts, recentPurchases, recentRedemptions] = await Promise.all([
    prisma.member.count(),
    prisma.purchase.aggregate({ _sum: { pointsEarned: true } }),
    prisma.redemption.aggregate({ _sum: { pointsUsed: true } }),
    prisma.member.groupBy({ by: ['currentTier'], _count: { _all: true } }),
    prisma.purchase.findMany({ orderBy: { createdAt: 'desc' }, take: 8, include: { member: { select: { id: true, fullName: true, currentTier: true } } } }),
    prisma.redemption.findMany({ orderBy: { createdAt: 'desc' }, take: 8, include: { member: { select: { id: true, fullName: true } }, reward: { select: { name: true } } } })
  ]);

  res.json({
    totalMembers,
    pointsIssued: pointsIssued._sum.pointsEarned ?? 0,
    pointsRedeemed: pointsRedeemed._sum.pointsUsed ?? 0,
    membersByTier: tierCounts.reduce<Record<string, number>>((acc, entry) => { acc[entry.currentTier] = entry._count._all; return acc; }, {}),
    recentPurchases,
    recentRedemptions
  });
}
