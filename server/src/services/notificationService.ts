import type { Prisma } from '@prisma/client';

export const TIER_CHANGED_EVENT = 'MEMBER_TIER_CHANGED';

export async function enqueueTierChangeNotification(
  tx: Prisma.TransactionClient,
  input: {
    memberId: string;
    fullName: string;
    phoneNumber: string;
    previousTier: string;
    newTier: string;
    occurredAt: Date;
  }
) {
  return tx.outboxEvent.create({
    data: {
      eventType: TIER_CHANGED_EVENT,
      aggregateType: 'MEMBER',
      aggregateId: input.memberId,
      payload: {
        memberId: input.memberId,
        memberName: input.fullName,
        phoneNumber: input.phoneNumber,
        previousTier: input.previousTier,
        newTier: input.newTier,
        message: `Your CaféPoints tier changed from ${input.previousTier} to ${input.newTier}.`,
        occurredAt: input.occurredAt.toISOString()
      },
      availableAt: input.occurredAt,
      createdAt: input.occurredAt
    }
  });
}
