import { describe, it, expect } from 'vitest';
import {
  calculateEarnedPoints,
  calculateRedemptionDiscount,
  validateRedemption,
  calculatePurchase
} from '../src/services/rewardEngine.js';

const DEFAULT_RULE = {
  earn_threshold: 10,
  earn_multiplier: 1,
  redemption_rate: 10,
  min_redemption: 100
};

describe('calculateEarnedPoints', () => {
  it('calculates 1 point per ₹10 for ₹2000', () => {
    expect(calculateEarnedPoints(2000, DEFAULT_RULE)).toBe(200);
  });

  it('floors points correctly for ₹2005', () => {
    expect(calculateEarnedPoints(2005, DEFAULT_RULE)).toBe(200);
  });

  it('floors points correctly for ₹2009', () => {
    expect(calculateEarnedPoints(2009, DEFAULT_RULE)).toBe(200);
  });

  it('returns 0 for zero amount', () => {
    expect(calculateEarnedPoints(0, DEFAULT_RULE)).toBe(0);
  });

  it('returns 0 for negative amount', () => {
    expect(calculateEarnedPoints(-100, DEFAULT_RULE)).toBe(0);
  });

  it('calculates 1 point for exactly ₹10', () => {
    expect(calculateEarnedPoints(10, DEFAULT_RULE)).toBe(1);
  });

  it('returns 0 for ₹9.99 (below threshold)', () => {
    expect(calculateEarnedPoints(9.99, DEFAULT_RULE)).toBe(0);
  });
});

describe('calculateRedemptionDiscount', () => {
  it('calculates ₹10 discount for 100 points', () => {
    expect(calculateRedemptionDiscount(100, DEFAULT_RULE)).toBe(10);
  });

  it('calculates ₹1 discount for exactly 10 points', () => {
    expect(calculateRedemptionDiscount(10, DEFAULT_RULE)).toBe(1);
  });

  it('floors partial redemption (150 points → ₹15)', () => {
    expect(calculateRedemptionDiscount(150, DEFAULT_RULE)).toBe(15);
  });

  it('calculates correctly for 200 points', () => {
    expect(calculateRedemptionDiscount(200, DEFAULT_RULE)).toBe(20);
  });
});

describe('validateRedemption', () => {
  it('accepts valid redemption of 100 points with balance 200', () => {
    const result = validateRedemption(100, 200, 0, DEFAULT_RULE);
    expect(result.valid).toBe(true);
  });

  it('rejects redemption below minimum (50 points)', () => {
    const result = validateRedemption(50, 500, 0, DEFAULT_RULE);
    expect(result.valid).toBe(false);
    expect(result.code).toBe('BELOW_MINIMUM');
  });

  it('rejects redemption exceeding balance', () => {
    const result = validateRedemption(200, 100, 0, DEFAULT_RULE);
    expect(result.valid).toBe(false);
    expect(result.code).toBe('INSUFFICIENT_BALANCE');
  });

  it('accepts exactly the minimum redemption (100 points)', () => {
    const result = validateRedemption(100, 100, 0, DEFAULT_RULE);
    expect(result.valid).toBe(true);
  });

  it('accepts exactly balance redemption', () => {
    const result = validateRedemption(500, 500, 0, DEFAULT_RULE);
    expect(result.valid).toBe(true);
  });

  it('rejects when discount exceeds purchase total', () => {
    // 200 points = ₹20 discount, but purchase total is ₹15
    const result = validateRedemption(200, 500, 15, DEFAULT_RULE);
    expect(result.valid).toBe(false);
    expect(result.code).toBe('DISCOUNT_EXCEEDS_TOTAL');
  });

  it('rejects zero points', () => {
    const result = validateRedemption(0, 500, 0, DEFAULT_RULE);
    expect(result.valid).toBe(false);
  });

  it('rejects non-integer points', () => {
    const result = validateRedemption(100.5, 500, 0, DEFAULT_RULE);
    expect(result.valid).toBe(false);
  });
});

describe('calculatePurchase', () => {
  it('calculates correctly for ₹2000 purchase with no redemption', () => {
    const result = calculatePurchase(2000, 0, null, DEFAULT_RULE);
    expect(result.pointsEarned).toBe(200);
    expect(result.redemptionUsed).toBe(0);
    expect(result.redemptionDiscount).toBe(0);
    expect(result.netEligible).toBe(2000);
    expect(result.finalBalance).toBe(200);
  });

  it('calculates net eligible amount when redemption applied', () => {
    // Balance: 200, redeem 100 → ₹10 discount, net = 1990, points = 199
    const result = calculatePurchase(2000, 200, 100, DEFAULT_RULE);
    expect(result.redemptionUsed).toBe(100);
    expect(result.redemptionDiscount).toBe(10);
    expect(result.netEligible).toBe(1990);
    expect(result.pointsEarned).toBe(199);
    expect(result.balanceAfterRedeem).toBe(100);
    expect(result.finalBalance).toBe(299);
  });

  it('demo scenario: Arun ₹2000, balance 0, no redemption', () => {
    const result = calculatePurchase(2000, 0, null, DEFAULT_RULE);
    expect(result.pointsEarned).toBe(200);
    expect(result.finalBalance).toBe(200);
  });

  it('demo scenario: Arun redeem 100 points from balance 200', () => {
    const result = calculatePurchase(2000, 200, 100, DEFAULT_RULE);
    expect(result.balanceAfterRedeem).toBe(100); // 200 - 100
    expect(result.pointsEarned).toBe(199);       // floor(1990/10)
    expect(result.finalBalance).toBe(299);
  });

  it('throws when attempting insufficient balance redemption', () => {
    expect(() => calculatePurchase(2000, 50, 100, DEFAULT_RULE)).toThrow();
  });

  it('throws when attempting below minimum redemption', () => {
    expect(() => calculatePurchase(2000, 500, 50, DEFAULT_RULE)).toThrow();
  });

  it('handles zero net eligible (redemption equals total)', () => {
    // 1000 points = ₹100 discount, total = ₹100 → net = 0, points = 0
    const result = calculatePurchase(100, 1000, 1000, DEFAULT_RULE);
    expect(result.netEligible).toBe(0);
    expect(result.pointsEarned).toBe(0);
  });
});
