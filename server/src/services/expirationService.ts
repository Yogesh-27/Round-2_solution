import type { Prisma, PrismaClient } from '@prisma/client';
import { getClockNow } from './clockService.js';
import { getActiveProgram } from './configService.js';

async function lockMember(tx: Prisma.TransactionClient, memberId: string) {
  await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT "id" FROM "Member" WHERE "id" = ${memberId}::uuid FOR UPDATE`);
  return tx.member.findUnique({ where: { id: memberId } });
}

export async function expireMemberPoints(
  prisma: PrismaClient,
  memberId: string,
  now?: Date
): Promise<{ expiredPoints: number; expiredLots: number }> {
  return prisma.$transaction(async (tx) => expireMemberPointsInTransaction(tx, memberId, now ?? await getClockNow(tx)));
}

export async function expireMemberPointsInTransaction(
  tx: Prisma.TransactionClient,
  memberId: string,
  now: Date
): Promise<{ expiredPoints: number; expiredLots: number }> {
  const member = await lockMember(tx, memberId);
  if (!member) return { expiredPoints: 0, expiredLots: 0 };

  const lots = await tx.pointLot.findMany({
    where: { memberId, remainingPoints: { gt: 0 }, expiresAt: { lte: now } },
    orderBy: [{ expiresAt: 'asc' }, { earnedAt: 'asc' }, { createdAt: 'asc' }]
  });
  if (lots.length === 0) return { expiredPoints: 0, expiredLots: 0 };

  let newBalance = member.currentPointsBalance;
  let expiredPoints = 0;
  for (const lot of lots) {
    if (lot.remainingPoints <= 0) continue;
    newBalance -= lot.remainingPoints;
    expiredPoints += lot.remainingPoints;
    if (newBalance < 0) {
      throw new Error(`POINT_BALANCE_INVARIANT_BROKEN:${member.id}`);
    }
    await tx.pointLot.update({ where: { id: lot.id }, data: { remainingPoints: 0 } });
    await tx.pointLedger.create({
      data: {
        memberId: member.id,
        transactionType: 'EXPIRATION',
        pointsDelta: -lot.remainingPoints,
        balanceAfter: newBalance,
        referenceId: lot.id,
        referenceType: 'POINT_EXPIRATION',
        description: `Unused points expired after ${Math.round((lot.expiresAt.getTime() - lot.earnedAt.getTime()) / 86400000)} days.`,
        createdById: null,
        createdAt: now
      }
    });
  }

  await tx.member.update({
    where: { id: member.id },
    data: { currentPointsBalance: newBalance },
  });

  return { expiredPoints, expiredLots: lots.length };
}

export async function runExpirationJob(prisma: PrismaClient, now?: Date) {
  const currentTime = now ?? await getClockNow(prisma);
  // Read the active programme so this job is explicitly tied to the configured expiry window.
  await getActiveProgram(prisma);
  const candidates = await prisma.pointLot.findMany({
    where: { remainingPoints: { gt: 0 }, expiresAt: { lte: currentTime } },
    distinct: ['memberId'],
    select: { memberId: true }
  });

  let expiredPoints = 0;
  let expiredLots = 0;
  let expiredMembers = 0;
  for (const candidate of candidates) {
    const result = await expireMemberPoints(prisma, candidate.memberId, currentTime);
    if (result.expiredPoints > 0) expiredMembers += 1;
    expiredPoints += result.expiredPoints;
    expiredLots += result.expiredLots;
  }
  return { now: currentTime, expiredPoints, expiredLots, expiredMembers };
}
