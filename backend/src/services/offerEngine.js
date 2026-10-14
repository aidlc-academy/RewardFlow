/**
 * RewardFlow — Offer Recommendation Engine
 * Deterministic, rule-based personalised offer generation.
 * Each rule is transparent and the reason is stored with every offer.
 */

const OFFER_TYPES = {
  WELCOME: 'welcome',
  COMEBACK: 'comeback',
  GROCERY: 'grocery',
  CAFE: 'cafe',
  PREMIUM: 'premium',
  REPEAT: 'repeat'
};

/**
 * Generate offers for a customer based on their purchase history.
 *
 * @param {object} customer - Customer record
 * @param {Array}  purchases - Array of purchase records with items
 * @returns {Array} Array of offer objects
 */
export function generateOffers(customer, purchases) {
  const now = new Date();
  const offers = [];

  const totalPurchases = purchases.length;
  const lifetimeSpend = customer.lifetime_spend || 0;

  // Days since joining
  const joinDate = new Date(customer.join_date || customer.created_at);
  const daysSinceJoin = Math.floor((now - joinDate) / (1000 * 60 * 60 * 24));

  // Days since last purchase
  let daysSinceLastPurchase = Infinity;
  if (customer.last_purchase_date) {
    const lastDate = new Date(customer.last_purchase_date);
    daysSinceLastPurchase = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
  }

  // Category purchases in last 90 days
  const cutoff90 = new Date(now);
  cutoff90.setDate(cutoff90.getDate() - 90);

  const recentPurchases = purchases.filter(p => new Date(p.created_at) >= cutoff90);

  // Count category frequency from purchase_items (items embedded in purchases)
  const categoryCounts = {};
  recentPurchases.forEach(p => {
    if (p.items && Array.isArray(p.items)) {
      p.items.forEach(item => {
        const cat = (item.category || '').toLowerCase();
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });
    }
  });

  // Expiry: 30 days from today
  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + 30);
  const validUntilStr = validUntil.toISOString().split('T')[0];

  // Rule 1: Welcome Offer — new customer with few purchases
  if (daysSinceJoin < 30 && totalPurchases < 2) {
    offers.push({
      offer_type: OFFER_TYPES.WELCOME,
      title: '🎉 Welcome Offer — 5% off your next purchase',
      description: 'As a new customer, enjoy 5% off your next purchase. Welcome to the RewardFlow programme!',
      reason: `Customer joined ${daysSinceJoin} day(s) ago and has made ${totalPurchases} purchase(s).`,
      trigger_rule: 'join_days < 30 AND total_purchases < 2',
      discount_pct: 5,
      valid_until: validUntilStr
    });
  }

  // Rule 2: Comeback Offer — inactive customer
  if (daysSinceLastPurchase > 60 && totalPurchases > 0) {
    offers.push({
      offer_type: OFFER_TYPES.COMEBACK,
      title: '👋 We Miss You — 50 Bonus Points on Your Return',
      description: `It's been over 60 days since your last visit. Come back and earn 50 bonus points on your next purchase!`,
      reason: `Customer's last purchase was ${daysSinceLastPurchase === Infinity ? 'unknown' : daysSinceLastPurchase} day(s) ago.`,
      trigger_rule: 'days_since_last_purchase > 60',
      discount_pct: null,
      valid_until: validUntilStr
    });
  }

  // Rule 3: Grocery Discount — frequent grocery buyer
  const groceryCount = (categoryCounts['groceries'] || 0) + (categoryCounts['grocery'] || 0);
  if (groceryCount >= 3) {
    offers.push({
      offer_type: OFFER_TYPES.GROCERY,
      title: '🛒 Grocery Loyalist — 10% off Grocery Purchases',
      description: 'You are one of our top grocery shoppers! Enjoy 10% off on all grocery purchases this month.',
      reason: `Customer made ${groceryCount} grocery purchase(s) in the last 90 days.`,
      trigger_rule: 'category_purchases[groceries] >= 3 in last 90 days',
      discount_pct: 10,
      valid_until: validUntilStr
    });
  }

  // Rule 4: Café Reward — frequent café buyer
  const cafeCount = (categoryCounts['café'] || 0) + (categoryCounts['cafe'] || 0) + (categoryCounts['beverages'] || 0);
  if (cafeCount >= 3) {
    offers.push({
      offer_type: OFFER_TYPES.CAFE,
      title: '☕ Café Favourite — Free Beverage with Every 5th Visit',
      description: 'You love our café! Earn a free beverage voucher with every 5th café purchase.',
      reason: `Customer made ${cafeCount} café/beverage purchase(s) in the last 90 days.`,
      trigger_rule: 'category_purchases[café] >= 3 in last 90 days',
      discount_pct: null,
      valid_until: validUntilStr
    });
  }

  // Rule 5: Premium Loyalty — high spender
  if (lifetimeSpend >= 10000) {
    offers.push({
      offer_type: OFFER_TYPES.PREMIUM,
      title: '⭐ Premium Member — Exclusive 15% Off',
      description: `You've spent over ₹10,000 with us! As a premium member, enjoy 15% off your next purchase plus double points.`,
      reason: `Customer lifetime spend is ₹${lifetimeSpend.toLocaleString('en-IN')}, which exceeds the ₹10,000 premium threshold.`,
      trigger_rule: 'lifetime_spend >= 10000',
      discount_pct: 15,
      valid_until: validUntilStr
    });
  }

  // Rule 6: Repeat Customer — 5+ purchases
  if (totalPurchases >= 5) {
    offers.push({
      offer_type: OFFER_TYPES.REPEAT,
      title: '🔄 Loyal Customer — 100 Bonus Points',
      description: `Thank you for ${totalPurchases} purchases! Earn 100 bonus points on your next transaction.`,
      reason: `Customer has made ${totalPurchases} purchases, qualifying as a repeat customer.`,
      trigger_rule: 'total_purchases >= 5',
      discount_pct: null,
      valid_until: validUntilStr
    });
  }

  return offers;
}

/**
 * Save generated offers to the database (replaces existing offers for the customer).
 */
export function saveOffers(db, customerId, offers) {
  // Delete old offers for this customer
  db.prepare('DELETE FROM customer_offers WHERE customer_id = ?').run(customerId);

  const insertOffer = db.prepare(`
    INSERT INTO customer_offers
      (customer_id, offer_type, title, description, reason, trigger_rule, discount_pct, valid_until)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const offer of offers) {
    insertOffer.run(
      customerId,
      offer.offer_type,
      offer.title,
      offer.description,
      offer.reason,
      offer.trigger_rule,
      offer.discount_pct || null,
      offer.valid_until
    );
  }
}
