import { describe, expect, it } from 'vitest';
import { formatPoints } from './format';

describe('formatPoints', () => {
  it('formats integer point balances clearly', () => {
    expect(formatPoints(1500)).toBe('1,500 pts');
  });
});
