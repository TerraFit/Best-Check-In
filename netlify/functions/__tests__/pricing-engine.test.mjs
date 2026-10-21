import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PACKAGE_MIN_ROOMS,
  ROOM_BLOCK_SIZE,
  ROOM_BLOCK_MONTHLY_PRICE,
  calculateRoomCapacityBase,
  packageAcceptsRoomCount,
  calculateSubscriptionMonthlyPrice,
  calculateSubscriptionAnnualPrice,
  getBusinessEnterpriseVolumeDiscountRate,
  calculateEnterpriseAdditionalEstablishmentMonthlyFee,
  calculateEnterprisePortfolioMonthlyPrice,
  calculateEnterprisePortfolioAnnualPrice,
  calculateMarketingDownloadMonthlyAddon,
  calculateMarketingDownloadVoucher,
} from '../../../src/config/pricing-engine.js';
import { getPlanPricing } from '../lib/packages.js';

test('shared engine uses five-room blocks and the agreed package minimums', () => {
  assert.equal(ROOM_BLOCK_SIZE, 5);
  assert.equal(ROOM_BLOCK_MONTHLY_PRICE, 349);
  assert.deepEqual(PACKAGE_MIN_ROOMS, { starter: 1, growth: 6, pro: 11, business: 16, enterprise: 21 });
  assert.equal(calculateRoomCapacityBase(1), 349);
  assert.equal(calculateRoomCapacityBase(5), 349);
  assert.equal(calculateRoomCapacityBase(6), 698);
  assert.equal(calculateRoomCapacityBase(27), 2094);
  assert.equal(packageAcceptsRoomCount('starter', 500), true);
  assert.equal(packageAcceptsRoomCount('growth', 5), false);
  assert.equal(packageAcceptsRoomCount('business', 15), false);
  assert.equal(packageAcceptsRoomCount('business', 16), true);
  assert.equal(packageAcceptsRoomCount('business', 20), true);
  assert.equal(packageAcceptsRoomCount('enterprise', 20), false);
  assert.equal(packageAcceptsRoomCount('enterprise', 21), true);
});

test('customer-facing subscription prices are rounded to whole currency units', () => {
  assert.equal(calculateSubscriptionMonthlyPrice(1, 'starter'), 349);
  assert.equal(calculateSubscriptionMonthlyPrice(6, 'growth'), 649);
  assert.equal(calculateSubscriptionMonthlyPrice(11, 'pro'), 949);
  assert.equal(calculateSubscriptionMonthlyPrice(15, 'business'), 0);
  assert.equal(calculateSubscriptionMonthlyPrice(16, 'business'), 1290);
  assert.equal(calculateSubscriptionMonthlyPrice(20, 'business'), 1290);
  assert.equal(calculateSubscriptionMonthlyPrice(20, 'enterprise'), 0);
  assert.equal(calculateSubscriptionMonthlyPrice(21, 'enterprise'), 1698);
  assert.equal(calculateSubscriptionAnnualPrice(1, 'starter'), 3839);
  assert.equal(calculateSubscriptionAnnualPrice(6, 'growth'), 7139);
  assert.equal(calculateSubscriptionAnnualPrice(11, 'pro'), 10439);
  assert.equal(calculateSubscriptionAnnualPrice(16, 'business'), 14190);
  assert.equal(calculateSubscriptionAnnualPrice(21, 'enterprise'), 18678);
});

test('Business and Enterprise automatically discount only room-capacity charges at each threshold', () => {
  assert.equal(getBusinessEnterpriseVolumeDiscountRate(50), 0);
  assert.equal(getBusinessEnterpriseVolumeDiscountRate(51), 0.10);
  assert.equal(getBusinessEnterpriseVolumeDiscountRate(100), 0.10);
  assert.equal(getBusinessEnterpriseVolumeDiscountRate(101), 0.12);
  assert.equal(getBusinessEnterpriseVolumeDiscountRate(300), 0.12);
  assert.equal(getBusinessEnterpriseVolumeDiscountRate(301), 0.15);
  assert.equal(calculateSubscriptionMonthlyPrice(51, 'business'), 3349);
  assert.equal(calculateSubscriptionMonthlyPrice(101, 'business'), 6344);
  assert.equal(calculateSubscriptionMonthlyPrice(301, 'business'), 17990);
});

test('Enterprise additional-establishment fees are rounded to whole ZAR', () => {
  assert.equal(calculateEnterpriseAdditionalEstablishmentMonthlyFee(1), 0);
  assert.equal(calculateEnterpriseAdditionalEstablishmentMonthlyFee(2), 0);
  assert.equal(calculateEnterpriseAdditionalEstablishmentMonthlyFee(3), 299);
  assert.equal(calculateEnterpriseAdditionalEstablishmentMonthlyFee(5), 299);
  assert.equal(calculateEnterpriseAdditionalEstablishmentMonthlyFee(6), 254);
  assert.equal(calculateEnterpriseAdditionalEstablishmentMonthlyFee(10), 254);
});

test('Enterprise portfolio pricing requires at least two establishments and 21 combined rooms', () => {
  assert.equal(calculateEnterprisePortfolioMonthlyPrice(1, 1), 0);
  assert.equal(calculateEnterprisePortfolioMonthlyPrice(21, 1), 0);
  assert.equal(calculateEnterprisePortfolioMonthlyPrice(20, 1), 0);
  assert.equal(calculateEnterprisePortfolioAnnualPrice(20, 1), 0);
  assert.equal(calculateEnterprisePortfolioMonthlyPrice(20, 2), 0);
  assert.equal(calculateEnterprisePortfolioMonthlyPrice(21, 2), 1698);
  assert.equal(calculateEnterprisePortfolioMonthlyPrice(21, 3), 1997);
  assert.equal(calculateEnterprisePortfolioMonthlyPrice(21, 5), 2595);
  assert.equal(calculateEnterprisePortfolioMonthlyPrice(21, 6), 2849);
  assert.equal(calculateEnterprisePortfolioAnnualPrice(21, 6), 31339);
});

test('Marketing Download add-on and voucher retain the agreed price and validity', () => {
  assert.equal(calculateMarketingDownloadMonthlyAddon('starter'), 39);
  assert.equal(calculateMarketingDownloadMonthlyAddon('growth'), 39);
  assert.equal(calculateMarketingDownloadMonthlyAddon('pro'), 0);
  assert.deepEqual(calculateMarketingDownloadVoucher(), { price: 149, validityMonths: 3, dataPeriodMonths: 3 });
});

test('Enterprise is enquiry-only and is blocked from online payment pricing', () => {
  const enterprise = getPlanPricing('enterprise', 'monthly', 21);
  assert.equal(enterprise.amount, 0);
  assert.equal(enterprise.contactSales, true);
});

test('Netlify package pricing uses the shared engine and rejects ineligible room counts', () => {
  assert.equal(getPlanPricing('starter', 'monthly', 1).amount, 349);
  assert.equal(getPlanPricing('growth', 'monthly', 10).amount, 649);
  assert.equal(getPlanPricing('growth', 'monthly', 5).amount, 0);
  assert.equal(getPlanPricing('business', 'monthly', 15).amount, 0);
  assert.equal(getPlanPricing('business', 'monthly', 16).amount, 1290);
  assert.equal(getPlanPricing('business', 'monthly', 51).amount, 3349);
  assert.equal(getPlanPricing('business', 'yearly', 51).amount, 36839);
});
