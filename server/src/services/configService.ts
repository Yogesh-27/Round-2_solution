import type { PrismaClient, Prisma } from '@prisma/client';
import { AppError } from '../utils/errors.js';
import type { LoyaltyConfig } from '../domain/loyalty.js';

export async function getActiveProgram(tx: Prisma.TransactionClient | PrismaClient) {
  const program = await tx.loyaltyProgram.findFirst({ where: { active: true }, orderBy: { createdAt: 'desc' } });
  if (!program) throw new AppError(500, 'LOYALTY_CONFIG_MISSING', 'No active loyalty programme is configured.');
  return program;
}

export function toLoyaltyConfig(program: Awaited<ReturnType<typeof getActiveProgram>>): LoyaltyConfig {
  return {
    bronzeThreshold: program.bronzeThreshold,
    silverThreshold: program.silverThreshold,
    goldThreshold: program.goldThreshold,
    platinumThreshold: program.platinumThreshold,
    bronzeMultiplier: program.bronzeMultiplier,
    silverMultiplier: program.silverMultiplier,
    goldMultiplier: program.goldMultiplier,
    platinumMultiplier: program.platinumMultiplier,
    baseEarningRate: program.baseEarningRate
  };
}
