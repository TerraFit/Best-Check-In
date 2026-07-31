// src/services/entitlementService.ts
// Programme 1 finalisation: pricing from src/config/packages only
import {
  SubscriptionEntitlement,
  BusinessSubscription,
  PlanType,
  PromotionCode,
} from '../types/entitlements';
import { getPackage, normalizePlanId } from '../config/packages';
import { featuresForPackageDisplay } from '../config/featureRegistry';

function planPricing(plan: PlanType): { monthly: number; yearly: number } {
  const pkg = getPackage(plan);
  return { monthly: pkg.priceMonthly, yearly: pkg.priceYearly };
}

export function getPlanFeatureNames(plan: PlanType): string[] {
  return featuresForPackageDisplay(normalizePlanId(plan)).map((f) => f.name);
}

export class EntitlementService {
  calculateSubscription(
    businessId: string,
    billingPlan: PlanType,
    billingCycle: 'monthly' | 'yearly',
    entitlements: SubscriptionEntitlement[]
  ): BusinessSubscription {
    const now = new Date();
    const activeEntitlements = entitlements.filter(
      (e) =>
        e.isActive &&
        e.startsAt <= now &&
        (e.lifetime || !e.endsAt || e.endsAt > now)
    );

    const complimentary = activeEntitlements.find((e) => e.type === 'complimentary_plan');
    if (complimentary && complimentary.complimentaryPlan) {
      const effectivePlan = normalizePlanId(complimentary.complimentaryPlan) as PlanType;
      return {
        businessId,
        billingPlan,
        effectivePlan,
        billingCycle,
        entitlements: activeEntitlements,
        monthlyCharge: 0,
        yearlyCharge: 0,
        isComplimentary: true,
        isOnTrial: false,
        status: 'complimentary',
        statusMessage: `Complimentary ${getPackage(effectivePlan).name} plan until ${complimentary.endsAt?.toLocaleDateString() || 'permanently'}`,
        validUntil: complimentary.endsAt,
      };
    }

    const trial = activeEntitlements.find((e) => e.type === 'trial');
    if (trial) {
      return {
        businessId,
        billingPlan,
        effectivePlan: billingPlan,
        billingCycle,
        entitlements: activeEntitlements,
        monthlyCharge: 0,
        yearlyCharge: 0,
        isComplimentary: false,
        isOnTrial: true,
        status: 'trial',
        statusMessage: `Free trial until ${trial.endsAt?.toLocaleDateString()}`,
        validUntil: trial.endsAt,
      };
    }

    const pricing = planPricing(billingPlan);
    let monthlyPrice = pricing.monthly;
    let yearlyPrice = pricing.yearly;

    const percentageDiscounts = activeEntitlements.filter(
      (e) => e.type === 'discount_percentage'
    );
    const fixedDiscounts = activeEntitlements.filter((e) => e.type === 'discount_fixed');

    for (const discount of percentageDiscounts) {
      const multiplier = 1 - (discount.value || 0) / 100;
      monthlyPrice *= multiplier;
      yearlyPrice *= multiplier;
    }
    for (const discount of fixedDiscounts) {
      monthlyPrice = Math.max(0, monthlyPrice - (discount.value || 0));
      yearlyPrice = Math.max(0, yearlyPrice - (discount.value || 0) * 12);
    }

    monthlyPrice = Math.round(monthlyPrice * 100) / 100;
    yearlyPrice = Math.round(yearlyPrice * 100) / 100;

    let status: 'active' | 'expired' | 'suspended' = 'active';
    let statusMessage: string | undefined;
    let validUntil: Date | undefined;

    const activeDiscounts = activeEntitlements.filter(
      (e) => e.type === 'discount_percentage' || e.type === 'discount_fixed'
    );
    const earliestEnd = activeDiscounts
      .filter((e) => e.endsAt)
      .sort((a, b) => a.endsAt!.getTime() - b.endsAt!.getTime())[0];

    if (earliestEnd?.endsAt) {
      statusMessage = `Discounted pricing until ${earliestEnd.endsAt.toLocaleDateString()}`;
      validUntil = earliestEnd.endsAt;
    }

    const promo = activeEntitlements.find((e) => e.type === 'promo_code');
    if (promo) {
      statusMessage = `Promo code applied: ${promo.promoCode}`;
    }

    const hasExpiredEntitlement = entitlements.some(
      (e) => e.isActive && e.endsAt && e.endsAt < now
    );
    if (hasExpiredEntitlement && !activeEntitlements.length) {
      status = 'expired';
      statusMessage = 'Subscription expired. Please renew.';
    }

    return {
      businessId,
      billingPlan,
      effectivePlan: billingPlan,
      billingCycle,
      entitlements: activeEntitlements,
      monthlyCharge: monthlyPrice,
      yearlyCharge: yearlyPrice,
      isComplimentary: false,
      isOnTrial: false,
      status,
      statusMessage,
      validUntil,
    };
  }

  grantComplimentaryPlan(
    businessId: string,
    plan: PlanType,
    adminId: string,
    options?: { endsAt?: Date; lifetime?: boolean; notes?: string }
  ): SubscriptionEntitlement {
    const now = new Date();
    return {
      id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      business_id: businessId,
      type: 'complimentary_plan',
      complimentaryPlan: plan,
      startsAt: now,
      endsAt: options?.endsAt,
      lifetime: options?.lifetime || false,
      createdBy: adminId,
      createdAt: now,
      updatedAt: now,
      notes: options?.notes,
      isActive: true,
    };
  }

  applyDiscount(
    businessId: string,
    type: 'discount_percentage' | 'discount_fixed',
    value: number,
    adminId: string,
    options?: { endsAt?: Date; lifetime?: boolean; notes?: string }
  ): SubscriptionEntitlement {
    const now = new Date();
    return {
      id: `disc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      business_id: businessId,
      type,
      value,
      startsAt: now,
      endsAt: options?.endsAt,
      lifetime: options?.lifetime || false,
      createdBy: adminId,
      createdAt: now,
      updatedAt: now,
      notes: options?.notes,
      isActive: true,
    };
  }

  validatePromoCode(
    code: string,
    businessId: string
  ): { valid: boolean; entitlement?: SubscriptionEntitlement; message?: string } {
    const promo: PromotionCode = {
      code: 'EXPO2026',
      type: 'discount_percentage',
      value: 20,
      maxUses: 100,
      usedCount: 0,
      expiresAt: new Date('2026-12-31'),
      isActive: true,
      createdBy: 'admin',
      createdAt: new Date(),
      notes: 'Expo 2026 special discount',
    };

    if (!promo.isActive) return { valid: false, message: 'Promo code is inactive' };
    if (promo.expiresAt && promo.expiresAt < new Date()) {
      return { valid: false, message: 'Promo code has expired' };
    }
    if (promo.maxUses && promo.usedCount >= promo.maxUses) {
      return { valid: false, message: 'Promo code has reached maximum uses' };
    }

    const now = new Date();
    const entitlement: SubscriptionEntitlement = {
      id: `promo_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      business_id: businessId,
      type: 'promo_code',
      value: promo.value,
      promoCode: promo.code,
      startsAt: now,
      endsAt: promo.expiresAt,
      lifetime: false,
      createdBy: 'system',
      createdAt: now,
      updatedAt: now,
      notes: `Promo code: ${promo.code}`,
      isActive: true,
    };

    return { valid: true, entitlement };
  }

  getSubscriptionStatus(
    businessId: string,
    billingPlan: PlanType,
    billingCycle: 'monthly' | 'yearly',
    entitlements: SubscriptionEntitlement[]
  ): {
    status: string;
    message: string;
    charge: number;
    plan: PlanType;
    validUntil?: Date;
  } {
    const subscription = this.calculateSubscription(
      businessId,
      billingPlan,
      billingCycle,
      entitlements
    );
    return {
      status: subscription.status,
      message: subscription.statusMessage || 'Active subscription',
      charge: subscription.monthlyCharge,
      plan: subscription.effectivePlan,
      validUntil: subscription.validUntil,
    };
  }
}

export const entitlementService = new EntitlementService();
