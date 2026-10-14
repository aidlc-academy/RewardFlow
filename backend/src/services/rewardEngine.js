/**
 * RewardFlow — Reward Engine
 * All reward calculations are deterministic and performed server-side.
 */

/**
 * Get the active reward rule from the database.
 */
export function getActiveRule(db) {
  const rule = db.prepare('SELECT * FROM reward_rules WHERE is_active = 1 ORDER BY id DESC LIMIT 1').get();
  if (!rule) throw new Error('No active reward rule configured.');
  return rule;
}

/**
 * Calculate earned points for a given eligible amount.
 * Formula: floor(eligibleAmount / earnThreshold) * earnMultiplier
 *
 * @param {number} eligibleAmount - Net purchase amount eligible for points
 * @param {object} rule - Reward rule object
 * @returns {number} Points earned (integer, floored)
 */
export function calculateEarnedPoints(eligibleAmount, rule) {
  if (eligibleAmount <= 0) return 0;
  return Math.floor(eligibleAmount / rule.earn_threshold) * rule.earn_multiplier;
}

/**
 * Calculate redemption discount value.
 * Formula: floor(pointsToRedeem / redemptionRate)
 *
 * @param {number} pointsToRedeem - Points customer wants to redeem
 * @param {object} rule - Reward rule object
 * @returns {number} Discount in ₹
 */
export function calculateRedemptionDiscount(pointsToRedeem, rule) {
  return Math.floor(pointsToRedeem / rule.redemption_rate);
}

/**
 * Validate a redemption request.
 * Returns { valid: true } or { valid: false, error: string, code: string }
 *
 * @param {number} pointsToRedeem
 * @param {number} currentBalance
 * @param {number} purchaseTotal - 0 for standalone redemption
 * @param {object} rule
 */
export function validateRedemption(pointsToRedeem, currentBalance, purchaseTotal, rule) {
  if (!Number.isInteger(pointsToRedeem) || pointsToRedeem <= 0) {
    return { valid: false, error: 'Points to redeem must be a positive integer.', code: 'INVALID_POINTS' };
  }

  if (pointsToRedeem < rule.min_redemption) {
    return {
      valid: false,
      error: `Minimum redemption is ${rule.min_redemption} points.`,
      code: 'BELOW_MINIMUM',
      min_redemption: rule.min_redemption
    };
  }

  if (pointsToRedeem > currentBalance) {
    return {
      valid: false,
      error: `Insufficient points balance. Available: ${currentBalance}, requested: ${pointsToRedeem}.`,
      code: 'INSUFFICIENT_BALANCE',
      current_balance: currentBalance
    };
  }

  if (purchaseTotal > 0) {
    const discount = calculateRedemptionDiscount(pointsToRedeem, rule);
    if (discount > purchaseTotal) {
      return {
        valid: false,
        error: `Redemption discount (₹${discount}) cannot exceed purchase total (₹${purchaseTotal}).`,
        code: 'DISCOUNT_EXCEEDS_TOTAL'
      };
    }
  }

  return { valid: true };
}

/**
 * Full purchase processing — atomic, returns all values needed for DB writes.
 * Does NOT perform DB writes itself; caller handles the transaction.
 *
 * @param {number} purchaseTotal - Gross purchase total
 * @param {number} currentBalance - Customer's current points balance
 * @param {number|null} pointsToRedeem - Points to redeem (null = no redemption)
 * @param {object} rule - Active reward rule
 * @returns {object} Calculated values
 */
export function calculatePurchase(purchaseTotal, currentBalance, pointsToRedeem, rule) {
  let redemptionDiscount = 0;
  let redemptionUsed = 0;

  if (pointsToRedeem && pointsToRedeem > 0) {
    const validation = validateRedemption(pointsToRedeem, currentBalance, purchaseTotal, rule);
    if (!validation.valid) {
      throw Object.assign(new Error(validation.error), { code: validation.code, details: validation });
    }
    redemptionDiscount = calculateRedemptionDiscount(pointsToRedeem, rule);
    redemptionUsed = pointsToRedeem;
  }

  const netEligible = Math.max(0, purchaseTotal - redemptionDiscount);
  const pointsEarned = calculateEarnedPoints(netEligible, rule);
  const balanceAfterRedeem = currentBalance - redemptionUsed;
  const finalBalance = balanceAfterRedeem + pointsEarned;

  return {
    redemptionUsed,
    redemptionDiscount,
    netEligible,
    pointsEarned,
    balanceAfterRedeem,
    finalBalance
  };
}
