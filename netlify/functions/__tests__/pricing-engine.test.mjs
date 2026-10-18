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
  assert.deepEqual(PACKAGE_MIN_ROOMS, { starter: 1, growth: 6, pro: 11, business: 20, enterprise: 20 });
  assert.equal(calculateRoomCapacityBase(1), 349);
  assert.equal(calculateRoomCapacityBase(5), 349);
  assert.equal(calculateRoomCapacityBase(6), 698);
  assert.equal(calculateRoomCapacityBase(27), 2094);
  assert.equal(packageAcceptsRoomCount('starter', 500), true);
  assert.equal(packageAcceptsRoomCount('growth', 5), false);
});

test('public starting prices are derived from room blocks plus package surcharges', () => {
  assert.equal(calculateSubscriptionMonthlyPrice(1, 'starter'), 349);
  assert.equal(calculateSubscriptionMonthlyPrice(6, 'growth'), 749);
  assert.equal(calculateSubscriptionMonthlyPrice(11, 'pro'), 1337.7);
  assert.equal(calculateSubscriptionMonthlyPrice(20, 'business'), 1910.8);
  assert.equal(calculateSubscriptionMonthlyPrice(20, 'enterprise'), 2267);
  assert.equal(calculateSubscriptionAnnualPrice(1, 'starter'), 3839);
  assert.equal(calculateSubscriptionAnnualPrice(6, 'growth'), 8239);
  assert.equal(calculateSubscriptionAnnualPrice(20, 'business'), 21018.8);
});

test('Business and Enterprise automatically discount only room-capacity charges at each threshold', () => {
  assert.equal(getBusinessEnterpriseVolumeDiscountRate(50), 0);
  assert.equal(getBusinessEnterpriseVolumeDiscountRate(51), 0.10);
  assert.equal(getBusinessEnterpriseVolumeDiscountRate(100), 0.10);
  assert.equal(getBusinessEnterpriseVolumeDiscountRate(101), 0.12);
  assert.equal(getBusinessEnterpriseVolumeDiscountRate(300), 0.12);
  assert.equal(getBusinessEnterpriseVolumeDiscountRate(301), 0.15);
  assert.equal(calculateSubscriptionMonthlyPrice(51, 'business'), 3969.9);
  assert.equal(calculateSubscriptionMonthlyPrice(101, 'business'), 6964.32);
  assert.equal(calculateSubscriptionMonthlyPrice(301, 'business'), 18610.45);
});

test('Enterprise additional-establishment fees follow the corrected discount tiers', () => {
  assert.equal(calculateEnterpriseAdditionalEstablishmentMonthlyFee(1), 0);
  assert.equal(calculateEnterpriseAdditionalEstablishmentMonthlyFee(2), 0);
  assert.equal(calculateEnterpriseAdditionalEstablishmentMonthlyFee(3), 299);
  assert.equal(calculateEnterpriseAdditionalEstablishmentMonthlyFee(5), 299);
  assert.equal(calculateEnterpriseAdditionalEstablishmentMonthlyFee(6), 254.15);
  assert.equal(calculateEnterpriseAdditionalEstablishmentMonthlyFee(10), 254.15);
});


test('Enterprise portfolio pricing combines total room capacity with establishment fees', () => {
  assert.equal(calculateEnterprisePortfolioMonthlyPrice(1, 1), 2267);
  assert.equal(calculateEnterprisePortfolioMonthlyPrice(20, 2), 2267);
  assert.equal(calculateEnterprisePortfolioMonthlyPrice(20, 3), 2566);
  assert.equal(calculateEnterprisePortfolioMonthlyPrice(20, 5), 3164);
  assert.equal(calculateEnterprisePortfolioMonthlyPrice(20, 6), 3418.15);
  assert.equal(calculateEnterprisePortfolioMonthlyPrice(25, 2), 2616);
  assert.equal(calculateEnterprisePortfolioAnnualPrice(20, 6), 37599.65);
});

test('Marketing Download add-on and voucher retain the agreed price and validity', () => {
  assert.equal(calculateMarketingDownloadMonthlyAddon('starter'), 39);
  assert.equal(calculateMarketingDownloadMonthlyAddon('growth'), 39);
  assert.equal(calculateMarketingDownloadMonthlyAddon('pro'), 0);
  assert.deepEqual(calculateMarketingDownloadVoucher(), { price: 149, validityMonths: 3, dataPeriodMonths: 3 });
});

test('Netlify package pricing uses the shared engine and rejects ineligible room counts', () => {
  assert.equal(getPlanPricing('starter', 'monthly', 1).amount, 349);
  assert.equal(getPlanPricing('growth', 'monthly', 10).amount, 749);
  assert.equal(getPlanPricing('growth', 'monthly', 5).amount, 0);
  assert.equal(getPlanPricing('business', 'monthly', 51).amount, 3969.9);
  assert.equal(getPlanPricing('business', 'yearly', 51).amount, 43668.9);
});
