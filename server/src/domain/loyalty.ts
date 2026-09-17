import { Decimal } from 'decimal.js';
import type { Tier } from '@prisma/client';

export interface LoyaltyConfig {
  bronzeThreshold: number;
  silverThreshold: number;
  goldThreshold: number;
  platinumThreshold: number;
  bronzeMultiplier: Decimal;
  silverMultiplier: Decimal;
  goldMultiplier: Decimal;
  platinumMultiplier: Decimal;
  baseEarningRate: Decimal;
}

export function tierForLifetimePoints(lifetimeEarnedPoints: number, config: LoyaltyConfig): Tier {
  if (lifetimeEarnedPoints >= config.platinumThreshold) return 'PLATINUM';
  if (lifetimeEarnedPoints >= config.goldThreshold) return 'GOLD';
  if (lifetimeEarnedPoints >= config.silverThreshold) return 'SILVER';
  return 'BRONZE';
}

export function multiplierForTier(tier: Tier, config: LoyaltyConfig): Decimal {
  if (tier === 'PLATINUM') return config.platinumMultiplier;
  if (tier === 'GOLD') return config.goldMultiplier;
  if (tier === 'SILVER') return config.silverMultiplier;
  return config.bronzeMultiplier;
}

export function calculatePurchasePoints(amount: Decimal.Value, tier: Tier, config: LoyaltyConfig): number {
  return new Decimal(amount).mul(config.baseEarningRate).mul(multiplierForTier(tier, config)).floor().toNumber();
}
