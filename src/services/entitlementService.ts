// src/services/entitlementService.ts
import { 
  SubscriptionEntitlement, 
  BusinessSubscription, 
  PlanType, 
  EntitlementType,
  PromotionCode 
} from '../types/entitlements';

// ============================================================
// PLAN PRICING
// ============================================================

const PLAN_PRICING: Record<PlanType, { monthly: number; yearly: number }> = {
  starter: { monthly: 349, yearly: 3490 },
  growth: { monthly: 649, yearly: 6490 },
  pro: { monthly: 949, yearly: 9490 },
  business: { monthly: 1290, yearly: 12900 },
  enterprise: { monthly: 0, yearly: 0 } // Custom pricing
};

const PLAN_FEATURES: Record<PlanType, string[]> = {
  starter: [
    'Digital guest check-in forms',
    'Booking dashboard',
    'Guest data export (CSV)',
    'Basic branding',
    'Email support'
  ],
  growth: [
    'Everything in Starter',
    'Automated email confirmations',
    'Guest history tracking',
    'Regional data auto-fill',
    'Priority email support',
    'Guest Origins by Country',
    'How Guests Found You'
  ],
  pro: [
    'Everything in Growth',
    'Custom branding (logo + colors)',
    'Analytics dashboard',
    'Multi-user access',
    'Export to integrations',
    'Travel Pattern Tracking',
    'Country-level Drill-down',
    'Province/Region Analytics'
  ],
  business: [
    'Everything in Pro',
    'Advanced analytics',
    'Priority support (fast response)',
    'Early access to new features',
    'Dedicated account manager',
    'City-level Analytics',
    'Full Geographic Drill-down'
  ],
  enterprise: [
    'Everything in Business',
    'Unlimited rooms',
    'Custom integrations',
    'Multi-property support',
    'Dedicated onboarding',
    'API access',
    'Custom reporting'
  ]
};

// ============================================================
// ENTITLEMENT SERVICE
// ============================================================

export class EntitlementService {
  
  /**
   * Calculate the effective plan and charges for a business
   */
  calculateSubscription(
    businessId: string,
    billingPlan: PlanType,
    billingCycle: 'monthly' | 'yearly',
    entitlements: SubscriptionEntitlement[]
  ): BusinessSubscription {
    // Find active entitlements
    const now = new Date();
    const activeEntitlements = entitlements.filter(e => 
      e.isActive && 
      e.startsAt <= now &&
      (e.lifetime || !e.endsAt || e.endsAt > now)
    );

    // Check for complimentary plan (highest priority)
    const complimentary = activeEntitlements.find(e => e.type === 'complimentary_plan');
    if (complimentary && complimentary.complimentaryPlan) {
      const effectivePlan = complimentary.complimentaryPlan;
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
        statusMessage: `Complimentary ${effectivePlan} plan until ${complimentary.endsAt?.toLocaleDateString() || 'permanently'}`,
        validUntil: complimentary.endsAt
      };
    }

    // Check for active trial (second priority)
    const trial = activeEntitlements.find(e => e.type === 'trial');
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
        validUntil: trial.endsAt
      };
    }

    // Calculate base price
    const pricing = PLAN_PRICING[billingPlan];
    let monthlyPrice = pricing.monthly;
    let yearlyPrice = pricing.yearly;

    // Apply discounts
    const percentageDiscounts = activeEntitlements.filter(e => e.type === 'discount_percentage');
    const fixedDiscounts = activeEntitlements.filter(e => e.type === 'discount_fixed');

    // Apply percentage discounts
    for (const discount of percentageDiscounts) {
      const multiplier = 1 - (discount.value || 0) / 100;
      monthlyPrice *= multiplier;
      yearlyPrice *= multiplier;
    }

    // Apply fixed discounts
    for (const discount of fixedDiscounts) {
      monthlyPrice = Math.max(0, monthlyPrice - (discount.value || 0));
      yearlyPrice = Math.max(0, yearlyPrice - (discount.value || 0) * 12);
    }

    // Round to 2 decimal places
    monthlyPrice = Math.round(monthlyPrice * 100) / 100;
    yearlyPrice = Math.round(yearlyPrice * 100) / 100;

    // Determine status
    let status: 'active' | 'expired' | 'suspended' = 'active';
    let statusMessage: string | undefined;
    let validUntil: Date | undefined;

    // Check if any discount has an end date
    const activeDiscounts = activeEntitlements.filter(e => 
      e.type === 'discount_percentage' || e.type === 'discount_fixed'
    );
    const earliestEnd = activeDiscounts
      .filter(e => e.endsAt)
      .sort((a, b) => a.endsAt!.getTime() - b.endsAt!.getTime())[0];

    if (earliestEnd?.endsAt) {
      statusMessage = `Discounted pricing until ${earliestEnd.endsAt.toLocaleDateString()}`;
      validUntil = earliestEnd.endsAt;
    }

    // Check if there's a promo code applied
    const promo = activeEntitlements.find(e => e.type === 'promo_code');
    if (promo) {
      statusMessage = `Promo code applied: ${promo.promoCode}`;
    }

    // Check if expired
    const hasExpiredEntitlement = entitlements.some(e => 
      e.isActive && e.endsAt && e.endsAt < now
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
      validUntil
    };
  }

  /**
   * Grant a complimentary plan to a business
   */
  grantComplimentaryPlan(
    businessId: string,
    plan: PlanType,
    adminId: string,
    options?: {
      endsAt?: Date;
      lifetime?: boolean;
      notes?: string;
    }
  ): SubscriptionEntitlement {
    const now = new Date();
    
    // Deactivate existing complimentary plans
    // This would be handled by the database layer
    
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
      isActive: true
    };
  }

  /**
   * Apply a discount to a business
   */
  applyDiscount(
    businessId: string,
    type: 'discount_percentage' | 'discount_fixed',
    value: number,
    adminId: string,
    options?: {
      endsAt?: Date;
      lifetime?: boolean;
      notes?: string;
    }
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
      isActive: true
    };
  }

  /**
   * Validate and apply a promo code
   */
  validatePromoCode(
    code: string,
    businessId: string
  ): { valid: boolean; entitlement?: SubscriptionEntitlement; message?: string } {
    // This would query the database for the promo code
    // For now, return a placeholder
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
      notes: 'Expo 2026 special discount'
    };

    if (!promo.isActive) {
      return { valid: false, message: 'Promo code is inactive' };
    }

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
      isActive: true
    };

    return { valid: true, entitlement };
  }

  /**
   * Get a business's current subscription status
   */
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
      validUntil: subscription.validUntil
    };
  }
}

export const entitlementService = new EntitlementService();
