// src/types/entitlements.ts

export type PlanType = 'starter' | 'growth' | 'pro' | 'business' | 'enterprise';

export type EntitlementType = 
  | 'trial'
  | 'discount_percentage'
  | 'discount_fixed'
  | 'complimentary_plan'
  | 'promo_code';

export interface SubscriptionEntitlement {
  id: string;
  business_id: string;
  type: EntitlementType;
  
  // For percentage or fixed discounts
  value?: number;
  
  // For complimentary plans
  complimentaryPlan?: PlanType;
  
  // For promo codes
  promoCode?: string;
  
  // Date range
  startsAt: Date;
  endsAt?: Date;
  lifetime: boolean;
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
  
  // Status
  isActive: boolean;
  appliedAt?: Date;
}

export interface SubscriptionPlan {
  plan: PlanType;
  billingCycle: 'monthly' | 'yearly';
  price: number;
  features: string[];
}

export interface BusinessSubscription {
  businessId: string;
  billingPlan: PlanType;
  effectivePlan: PlanType;
  billingCycle: 'monthly' | 'yearly';
  
  // Current entitlements
  entitlements: SubscriptionEntitlement[];
  
  // Calculated charges
  monthlyCharge: number;
  yearlyCharge: number;
  isComplimentary: boolean;
  isOnTrial: boolean;
  
  // Status display
  status: 'active' | 'trial' | 'complimentary' | 'expired' | 'suspended';
  statusMessage?: string;
  validUntil?: Date;
}

export interface PromotionCode {
  code: string;
  type: EntitlementType;
  value?: number;
  complimentaryPlan?: PlanType;
  maxUses?: number;
  usedCount: number;
  expiresAt?: Date;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  notes?: string;
}
