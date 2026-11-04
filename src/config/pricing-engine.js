/**
 * FastCheckIn shared pricing engine.
 * Keep commercial price rules here; both browser and Netlify code import this module.
 * All customer-facing subscription prices are rounded to the nearest whole currency unit.
 */
export const PACKAGE_IDS = ['starter', 'growth', 'pro', 'business', 'enterprise'];
export const ROOM_BLOCK_SIZE = 5;
export const ROOM_BLOCK_MONTHLY_PRICE = 349;
export const ANNUAL_BILLING_MONTHS = 11;
// Enterprise's 21-room value is its included pricing baseline, not an eligibility minimum.
export const PACKAGE_MIN_ROOMS = Object.freeze({ starter: 1, growth: 6, pro: 11, business: 21, enterprise: 21 });
// Package premiums preserve the agreed starting-price ladder while each additional five-room capacity block adds R349.
export const PACKAGE_MONTHLY_SURCHARGES = Object.freeze({ starter: 0, growth: -49, pro: -98, business: 515, enterprise: 871 });
export const MARKETING_DOWNLOAD_MONTHLY_PRICE = 39;
export const MARKETING_DOWNLOAD_VOUCHER_PRICE = 149;
export const MARKETING_DOWNLOAD_VOUCHER_VALIDITY_MONTHS = 3;
export const MARKETING_DOWNLOAD_VOUCHER_DATA_PERIOD_MONTHS = 3;

export function normalizeRoomCount(rooms) {
  const value = Number(rooms);
  return Math.max(1, Math.ceil(Number.isFinite(value) ? value : 1));
}
export function packageAcceptsRoomCount(packageName, rooms) {
  if (!PACKAGE_IDS.includes(packageName)) return false;
  // Enterprise eligibility is based on 2+ establishments, validated by the portfolio calculator.
  if (packageName === 'enterprise') return normalizeRoomCount(rooms) >= 1;
  return normalizeRoomCount(rooms) >= PACKAGE_MIN_ROOMS[packageName];
}
export function calculateRoomCapacityBase(rooms) {
  return Math.ceil(normalizeRoomCount(rooms) / ROOM_BLOCK_SIZE) * ROOM_BLOCK_MONTHLY_PRICE;
}
export function getBusinessEnterpriseVolumeDiscountRate(eligiblePortfolioRooms) {
  const rooms = Math.max(0, Number(eligiblePortfolioRooms) || 0);
  if (rooms >= 301) return 0.15;
  if (rooms >= 101) return 0.12;
  if (rooms >= 51) return 0.10;
  return 0;
}
export function calculateSubscriptionMonthlyPrice(rooms, packageName, roomCapacityDiscountRate = null) {
  if (!packageAcceptsRoomCount(packageName, rooms)) return 0;
  if (packageName === 'enterprise') {
    // The base Enterprise price covers the first 21 combined rooms. Only additional
    // five-room blocks are charged on top, with volume discounts applied to those blocks.
    const includedRooms = PACKAGE_MIN_ROOMS.enterprise;
    const basePrice = calculateRoomCapacityBase(includedRooms) + PACKAGE_MONTHLY_SURCHARGES.enterprise;
    const additionalBlocks = Math.ceil(Math.max(0, rooms - includedRooms) / ROOM_BLOCK_SIZE);
    const requestedDiscount = roomCapacityDiscountRate === null
      ? getBusinessEnterpriseVolumeDiscountRate(rooms)
      : Number(roomCapacityDiscountRate) || 0;
    const discount = Math.min(1, Math.max(0, requestedDiscount));
    const additionalRoomCharge = Math.round(additionalBlocks * ROOM_BLOCK_MONTHLY_PRICE * (1 - discount));
    return Math.round(basePrice + additionalRoomCharge);
  }
  const isVolumeEligible = packageName === 'business';
  const requestedDiscount = roomCapacityDiscountRate === null
    ? (isVolumeEligible ? getBusinessEnterpriseVolumeDiscountRate(rooms) : 0)
    : Number(roomCapacityDiscountRate) || 0;
  const discount = isVolumeEligible ? Math.min(1, Math.max(0, requestedDiscount)) : 0;
  return Math.round(calculateRoomCapacityBase(rooms) * (1 - discount) + PACKAGE_MONTHLY_SURCHARGES[packageName]);
}
export function calculateSubscriptionAnnualPrice(rooms, packageName, roomCapacityDiscountRate = null) {
  return Math.round(calculateSubscriptionMonthlyPrice(rooms, packageName, roomCapacityDiscountRate) * ANNUAL_BILLING_MONTHS);
}
export function calculateEnterpriseMonthlyPrice(roomCount) {
  return calculateSubscriptionMonthlyPrice(normalizeRoomCount(roomCount), 'enterprise');
}
/** Enterprise portfolio price: 2+ establishments qualify; the base covers 21 combined rooms, with discounted five-room blocks above that plus establishment fees. */
export function calculateEnterprisePortfolioMonthlyPrice(roomCount, propertyCount = 1) {
  const properties = Math.max(1, Math.floor(Number(propertyCount) || 1));
  if (properties < 2) return 0;
  let establishmentFees = 0;
  for (let establishmentNumber = 3; establishmentNumber <= properties; establishmentNumber += 1) {
    establishmentFees += calculateEnterpriseAdditionalEstablishmentMonthlyFee(establishmentNumber);
  }
  return Math.round(calculateEnterpriseMonthlyPrice(roomCount) + establishmentFees);
}
export function calculateEnterprisePortfolioAnnualPrice(roomCount, propertyCount = 1) {
  return Math.round(calculateEnterprisePortfolioMonthlyPrice(roomCount, propertyCount) * ANNUAL_BILLING_MONTHS);
}
/** Establishments 1–2 included; 3–5 R299 each; from establishment 6 onward R299 less 15% = R254.15 each. */
export function calculateEnterpriseAdditionalEstablishmentMonthlyFee(establishmentNumber) {
  if (!Number.isInteger(establishmentNumber) || establishmentNumber < 3) return 0;
  return establishmentNumber <= 5 ? 299 : Math.round(299 * 0.85);
}
export function calculateMarketingDownloadMonthlyAddon(packageName) {
  return packageName === 'starter' || packageName === 'growth' ? MARKETING_DOWNLOAD_MONTHLY_PRICE : 0;
}
export function calculateMarketingDownloadVoucher() {
  return { price: MARKETING_DOWNLOAD_VOUCHER_PRICE, validityMonths: MARKETING_DOWNLOAD_VOUCHER_VALIDITY_MONTHS, dataPeriodMonths: MARKETING_DOWNLOAD_VOUCHER_DATA_PERIOD_MONTHS };
}
export function getStartingPrice(packageName, billingCycle = 'monthly') {
  const rooms = PACKAGE_MIN_ROOMS[packageName];
  return billingCycle === 'yearly' ? calculateSubscriptionAnnualPrice(rooms, packageName) : calculateSubscriptionMonthlyPrice(rooms, packageName);
}
