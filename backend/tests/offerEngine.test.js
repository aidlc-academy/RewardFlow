import { describe, it, expect } from 'vitest';
import { generateOffers } from '../src/services/offerEngine.js';

function makeCustomer(overrides = {}) {
  return {
    id: 1,
    name: 'Test Customer',
    join_date: new Date().toISOString().split('T')[0],
    points_balance: 0,
    lifetime_spend: 0,
    last_purchase_date: null,
    ...overrides
  };
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function makePurchase(daysBack, category) {
  return {
    id: Math.random(),
    created_at: daysAgo(daysBack),
    items: [{ category, quantity: 1, unit_price: 100 }]
  };
}

describe('generateOffers', () => {
  it('generates Welcome Offer for brand-new customer with no purchases', () => {
    const customer = makeCustomer({ join_date: new Date().toISOString().split('T')[0] });
    const offers = generateOffers(customer, []);
    expect(offers.some(o => o.offer_type === 'welcome')).toBe(true);
  });

  it('does NOT generate Welcome Offer for customer joined 31+ days ago', () => {
    const d = new Date();
    d.setDate(d.getDate() - 31);
    const customer = makeCustomer({ join_date: d.toISOString().split('T')[0] });
    const offers = generateOffers(customer, []);
    expect(offers.some(o => o.offer_type === 'welcome')).toBe(false);
  });

  it('generates Comeback Offer for customer inactive 61 days', () => {
    const customer = makeCustomer({ last_purchase_date: daysAgo(61).split('T')[0] });
    const offers = generateOffers(customer, [makePurchase(61, 'Groceries')]);
    expect(offers.some(o => o.offer_type === 'comeback')).toBe(true);
  });

  it('does NOT generate Comeback Offer for customer active 30 days ago', () => {
    const customer = makeCustomer({ last_purchase_date: daysAgo(30).split('T')[0] });
    const offers = generateOffers(customer, [makePurchase(30, 'Groceries')]);
    expect(offers.some(o => o.offer_type === 'comeback')).toBe(false);
  });

  it('generates Grocery Offer for customer with 3+ grocery purchases in 90 days', () => {
    const customer = makeCustomer({ last_purchase_date: daysAgo(5).split('T')[0] });
    const purchases = [
      makePurchase(10, 'Groceries'),
      makePurchase(20, 'Groceries'),
      makePurchase(30, 'Groceries')
    ];
    const offers = generateOffers(customer, purchases);
    expect(offers.some(o => o.offer_type === 'grocery')).toBe(true);
  });

  it('does NOT generate Grocery Offer for only 2 grocery purchases in 90 days', () => {
    const customer = makeCustomer({ last_purchase_date: daysAgo(5).split('T')[0] });
    const purchases = [
      makePurchase(10, 'Groceries'),
      makePurchase(20, 'Groceries')
    ];
    const offers = generateOffers(customer, purchases);
    expect(offers.some(o => o.offer_type === 'grocery')).toBe(false);
  });

  it('generates Café Offer for 3+ café purchases', () => {
    const customer = makeCustomer({ last_purchase_date: daysAgo(5).split('T')[0] });
    const purchases = [
      makePurchase(10, 'Café'),
      makePurchase(20, 'Café'),
      makePurchase(30, 'Café')
    ];
    const offers = generateOffers(customer, purchases);
    expect(offers.some(o => o.offer_type === 'cafe')).toBe(true);
  });

  it('generates Premium Offer for customer with ₹10,000+ lifetime spend', () => {
    const customer = makeCustomer({ lifetime_spend: 10000 });
    const offers = generateOffers(customer, []);
    expect(offers.some(o => o.offer_type === 'premium')).toBe(true);
  });

  it('does NOT generate Premium Offer for customer with ₹9,999 spend', () => {
    const customer = makeCustomer({ lifetime_spend: 9999 });
    const offers = generateOffers(customer, []);
    expect(offers.some(o => o.offer_type === 'premium')).toBe(false);
  });

  it('generates Repeat Offer for customer with 5+ purchases', () => {
    const customer = makeCustomer({ last_purchase_date: daysAgo(5).split('T')[0] });
    const purchases = Array.from({ length: 5 }, (_, i) => makePurchase(i * 10 + 1, 'Groceries'));
    const offers = generateOffers(customer, purchases);
    expect(offers.some(o => o.offer_type === 'repeat')).toBe(true);
  });

  it('stores reason behind each offer', () => {
    const customer = makeCustomer({ lifetime_spend: 10000 });
    const offers = generateOffers(customer, []);
    offers.forEach(o => {
      expect(o.reason).toBeTruthy();
      expect(o.trigger_rule).toBeTruthy();
    });
  });

  it('can generate multiple offers for qualifying customer', () => {
    const d31 = new Date();
    d31.setDate(d31.getDate() - 31);
    const customer = makeCustomer({
      join_date: d31.toISOString().split('T')[0],
      lifetime_spend: 12000,
      last_purchase_date: daysAgo(5).split('T')[0]
    });
    const purchases = Array.from({ length: 5 }, (_, i) => makePurchase(i * 5 + 1, 'Groceries'));
    const offers = generateOffers(customer, purchases);
    // Should have grocery (3+), premium (12000+), repeat (5+) — at minimum
    expect(offers.length).toBeGreaterThanOrEqual(3);
  });
});
