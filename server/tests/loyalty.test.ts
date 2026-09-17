import { describe, expect, it } from 'vitest';
import { Decimal } from 'decimal.js';
import { calculatePurchasePoints, tierForLifetimePoints, multiplierForTier } from '../src/domain/loyalty.js';

const config = {
  bronzeThreshold: 0,
  silverThreshold: 500,
  goldThreshold: 1500,
  platinumThreshold: 5000,
  bronzeMultiplier: new Decimal('1.00'),
  silverMultiplier: new Decimal('1.25'),
  goldMultiplier: new Decimal('1.50'),
  platinumMultiplier: new Decimal('0.30'),
  baseEarningRate: new Decimal('1.00')
};

describe('loyalty rules', () => {
  it('starts new members at Bronze', () => expect(tierForLifetimePoints(0, config)).toBe('BRONZE'));
  it('moves to Silver at 500 lifetime points', () => expect(tierForLifetimePoints(500, config)).toBe('SILVER'));
  it('moves to Gold at 1500 lifetime points', () => expect(tierForLifetimePoints(1500, config)).toBe('GOLD'));
  it('moves to Platinum at 5000 lifetime points', () => expect(tierForLifetimePoints(5000, config)).toBe('PLATINUM'));
  it('uses the pre-purchase tier rate', () => expect(calculatePurchasePoints('30', 'BRONZE', config)).toBe(30));
  it('calculates Silver at 1.25x', () => expect(calculatePurchasePoints('100', 'SILVER', config)).toBe(125));
  it('calculates Gold at 1.50x', () => expect(calculatePurchasePoints('100', 'GOLD', config)).toBe(150));
  it('calculates Platinum at 0.30x', () => expect(calculatePurchasePoints('100', 'PLATINUM', config)).toBe(30));
  it('rounds fractional points down', () => expect(calculatePurchasePoints('1.99', 'SILVER', config)).toBe(2));
  it('returns the configured multiplier for each tier', () => {
    expect(multiplierForTier('BRONZE', config).toNumber()).toBe(1);
    expect(multiplierForTier('SILVER', config).toNumber()).toBe(1.25);
    expect(multiplierForTier('GOLD', config).toNumber()).toBe(1.5);
    expect(multiplierForTier('PLATINUM', config).toNumber()).toBe(0.3);
  });
});
