import { Prisma, PrismaClient, Tier } from '@prisma/client';
import { calculatePurchasePoints, multiplierForTier, tierForLifetimePoints } from '../domain/loyalty.js';
import { AppError, errors } from '../utils/errors.js';
import { getActiveProgram, toLoyaltyConfig } from './configService.js';
import { getClockNow } from './clockService.js';
import { enqueueTierChangeNotification } from './notificationService.js';
import { expireMemberPoints } from './expirationService.js';

async function lockMember(tx: Prisma.TransactionClient, memberId: string) {
  await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT "id" FROM "Member" WHERE "id" = ${memberId}::uuid FOR UPDATE`);
  const member = await tx.member.findUnique({ where: { id: memberId } });
  if (!member) throw errors.memberNotFound();
  return member;
}

async function consumePointLots(tx: Prisma.TransactionClient, memberId: string, points: number, now: Date) {
  let remaining = points;
  const lots = await tx.pointLot.findMany({
    where: { memberId, remainingPoints: { gt: 0 }, expiresAt: { gt: now } },
    orderBy: [{ expiresAt: 'asc' }, { earnedAt: 'asc' }, { createdAt: 'asc' }]
  });

  for (const lot of lots) {
    if (remaining <= 0) break;
    const consumed = Math.min(remaining, lot.remainingPoints);
    await tx.pointLot.update({ where: { id: lot.id }, data: { remainingPoints: lot.remainingPoints - consumed } });
    remaining -= consumed;
  }

  if (remaining > 0) throw errors.insufficientPoints();
}

function formatPurchaseResult(
  purchase: { id: string; amount: Prisma.Decimal; currency: string; tierAtPurchase: Tier; earningMultiplier: Prisma.Decimal; pointsEarned: number; createdAt: Date },
  member: { id: string; currentTier: Tier; lifetimeEarnedPoints: number; currentPointsBalance: number }
) {
  return {
    success: true,
    purchase: {
      id: purchase.id,
      amount: purchase.amount.toFixed(2),
      currency: purchase.currency,
      tierAtPurchase: purchase.tierAtPurchase,
      earningMultiplier: purchase.earningMultiplier.toNumber(),
      pointsEarned: purchase.pointsEarned,
      createdAt: purchase.createdAt
    },
    member: {
      id: member.id,
      currentTier: member.currentTier,
      lifetimeEarnedPoints: member.lifetimeEarnedPoints,
      currentPointsBalance: member.currentPointsBalance
    }
  };
}

export async function recordPurchase(
  prisma: PrismaClient,
  input: { memberId: string; amount: string; currency: string; clientRequestId: string; notes?: string; createdById: string }
) {
  const existing = await prisma.purchase.findUnique({ where: { clientRequestId: input.clientRequestId }, include: { member: true } });
  if (existing) return formatPurchaseResult(existing, existing.member);

  // Expire stale points before the write transaction. This keeps a rejected/failed purchase from rolling back an otherwise valid expiry.
  await expireMemberPoints(prisma, input.memberId);

  try {
    return await prisma.$transaction(async (tx) => {
      const existingInTransaction = await tx.purchase.findUnique({ where: { clientRequestId: input.clientRequestId }, include: { member: true } });
      if (existingInTransaction) return formatPurchaseResult(existingInTransaction, existingInTransaction.member);

      const member = await lockMember(tx, input.memberId);
      const now = await getClockNow(tx);
      const program = await getActiveProgram(tx);
      if (input.currency !== program.currency) {
        throw new AppError(422, 'INVALID_CURRENCY', `This loyalty programme accepts ${program.currency} purchases.`);
      }

      const loyalty = toLoyaltyConfig(program);
      const tierAtPurchase = tierForLifetimePoints(member.lifetimeEarnedPoints, loyalty);
      const multiplier = multiplierForTier(tierAtPurchase, loyalty);
      const pointsEarned = calculatePurchasePoints(input.amount, tierAtPurchase, loyalty);
      const newLifetime = member.lifetimeEarnedPoints + pointsEarned;
      const newBalance = member.currentPointsBalance + pointsEarned;
      const newTier = tierForLifetimePoints(newLifetime, loyalty);
      const expiresAt = new Date(now.getTime() + program.pointsExpiryDays * 86400000);

      const purchase = await tx.purchase.create({
        data: {
          memberId: member.id,
          amount: new Prisma.Decimal(input.amount),
          currency: input.currency,
          tierAtPurchase,
          earningMultiplier: multiplier,
          pointsEarned,
          clientRequestId: input.clientRequestId,
          notes: input.notes,
          createdById: input.createdById,
          createdAt: now
        }
      });

      await tx.pointLot.create({
        data: {
          memberId: member.id,
          sourceType: 'PURCHASE_EARN',
          sourceId: purchase.id,
          originalPoints: pointsEarned,
          remainingPoints: pointsEarned,
          earnedAt: now,
          expiresAt,
          createdAt: now
        }
      });

      await tx.pointLedger.create({
        data: {
          memberId: member.id,
          transactionType: 'PURCHASE_EARN',
          pointsDelta: pointsEarned,
          balanceAfter: newBalance,
          referenceId: purchase.id,
          referenceType: 'PURCHASE',
          description: `Purchase earned ${pointsEarned} points at ${tierAtPurchase} rate. Points expire ${expiresAt.toISOString()}.`,
          createdById: input.createdById,
          createdAt: now
        }
      });

      const updatedMember = await tx.member.update({
        where: { id: member.id },
        data: { lifetimeEarnedPoints: newLifetime, currentPointsBalance: newBalance, currentTier: newTier, updatedAt: now }
      });

      let notificationQueued = false;
      if (newTier !== tierAtPurchase) {
        await enqueueTierChangeNotification(tx, {
          memberId: member.id,
          fullName: member.fullName,
          phoneNumber: member.phoneNumber,
          previousTier: tierAtPurchase,
          newTier,
          occurredAt: now
        });
        notificationQueued = true;
      }

      return {
        ...formatPurchaseResult(purchase, updatedMember),
        tierChanged: newTier !== tierAtPurchase,
        notificationQueued
      };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existingAfterRace = await prisma.purchase.findUnique({ where: { clientRequestId: input.clientRequestId }, include: { member: true } });
      if (existingAfterRace) return formatPurchaseResult(existingAfterRace, existingAfterRace.member);
    }
    throw error;
  }
}

function formatRedemptionResult(
  redemption: { id: string; pointsUsed: number; createdAt: Date },
  member: { id: string; currentTier: Tier; lifetimeEarnedPoints: number; currentPointsBalance: number },
  reward: { id: string; name: string; pointsCost: number }
) {
  return {
    success: true,
    redemption: { id: redemption.id, rewardId: reward.id, rewardName: reward.name, pointsUsed: redemption.pointsUsed, createdAt: redemption.createdAt },
    member: { id: member.id, currentTier: member.currentTier, lifetimeEarnedPoints: member.lifetimeEarnedPoints, currentPointsBalance: member.currentPointsBalance }
  };
}

export async function redeemReward(
  prisma: PrismaClient,
  input: { memberId: string; rewardId: string; clientRequestId: string; notes?: string; createdById: string }
) {
  const existing = await prisma.redemption.findUnique({ where: { clientRequestId: input.clientRequestId }, include: { member: true, reward: true } });
  if (existing) return formatRedemptionResult(existing, existing.member, existing.reward);

  await expireMemberPoints(prisma, input.memberId);

  try {
    return await prisma.$transaction(async (tx) => {
      const existingInTransaction = await tx.redemption.findUnique({ where: { clientRequestId: input.clientRequestId }, include: { member: true, reward: true } });
      if (existingInTransaction) return formatRedemptionResult(existingInTransaction, existingInTransaction.member, existingInTransaction.reward);

      const member = await lockMember(tx, input.memberId);
      const now = await getClockNow(tx);
      const reward = await tx.reward.findUnique({ where: { id: input.rewardId } });
      if (!reward) throw errors.rewardNotFound();
      if (!reward.active) throw errors.rewardInactive();

      const program = await getActiveProgram(tx);
      const loyalty = toLoyaltyConfig(program);
      const currentTier = tierForLifetimePoints(member.lifetimeEarnedPoints, loyalty);
      if (member.currentPointsBalance < reward.pointsCost) throw errors.insufficientPoints();
      await consumePointLots(tx, member.id, reward.pointsCost, now);

      const newBalance = member.currentPointsBalance - reward.pointsCost;
      const redemption = await tx.redemption.create({
        data: {
          memberId: member.id,
          rewardId: reward.id,
          pointsUsed: reward.pointsCost,
          clientRequestId: input.clientRequestId,
          notes: input.notes,
          createdById: input.createdById,
          createdAt: now
        }
      });

      await tx.pointLedger.create({
        data: {
          memberId: member.id,
          transactionType: 'REDEMPTION',
          pointsDelta: -reward.pointsCost,
          balanceAfter: newBalance,
          referenceId: redemption.id,
          referenceType: 'REDEMPTION',
          description: `Redeemed ${reward.name} for ${reward.pointsCost} points.`,
          createdById: input.createdById,
          createdAt: now
        }
      });

      const updatedMember = await tx.member.update({
        where: { id: member.id },
        data: { currentPointsBalance: newBalance, currentTier, updatedAt: now }
      });

      return formatRedemptionResult(redemption, updatedMember, reward);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existingAfterRace = await prisma.redemption.findUnique({ where: { clientRequestId: input.clientRequestId }, include: { member: true, reward: true } });
      if (existingAfterRace) return formatRedemptionResult(existingAfterRace, existingAfterRace.member, existingAfterRace.reward);
    }
    throw error;
  }
}
