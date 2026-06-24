// src/pages/Billing.tsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBusinessId } from '../utils/auth';
import SubscriptionStatus from '../components/billing/SubscriptionStatus';
import { PlanType } from '../types/entitlements';

// ============================================================
// TYPES
// ============================================================

interface Plan {
  id: PlanType;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  minRooms: number;
  maxRooms: number;
  description: string;
  features: string[];
  popular?: boolean;
  color: 'green' | 'amber' | 'blue' | 'purple';
}

// ============================================================
// PLAN DATA
// ============================================================

const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 349,
    priceYearly: 3490,
    minRooms: 1,
    maxRooms: 5,
    description: 'Perfect for small guesthouses starting out',
    features: [
      'Digital guest check-in forms',
      'Booking dashboard',
      'Guest data export (CSV)',
      'Basic branding',
      'Email support',
      'World Map (View Only)'
    ],
    color: 'green'
  },
  {
    id: 'growth',
    name: 'Growth',
    priceMonthly: 649,
    priceYearly: 6490,
    minRooms: 6,
    maxRooms: 10,
    description: 'Best for growing guesthouses',
    features: [
      'Everything in Starter',
      'Automated email confirmations',
      'Guest history tracking',
      'Regional data auto-fill',
      'Priority email support',
      'Guest Origins by Country',
      'How Guests Found You',
      'Continental Map Drill-down'
    ],
    popular: true,
    color: 'amber'
  },
  {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 949,
    priceYearly: 9490,
    minRooms: 11,
    maxRooms: 15,
    description: 'For established properties needing team access',
    features: [
      'Everything in Growth',
      'Custom branding (logo + colors)',
      'Analytics dashboard',
      'Multi-user access',
      'Export to integrations',
      'Travel Pattern Tracking',
      'Country-level Drill-down',
      'Province/Region Analytics'
    ],
    color: 'blue'
  },
  {
    id: 'business',
    name: 'Business',
    priceMonthly: 1290,
    priceYearly: 12900,
    minRooms: 16,
    maxRooms: 20,
    description: 'For larger operations that need insights',
    features: [
      'Everything in Pro',
      'Advanced analytics',
      'Priority support (fast response)',
      'Early access to new features',
      'Dedicated account manager',
      'City-level Analytics',
      'Full Geographic Drill-down'
    ],
    color: 'purple'
  }
];

// ============================================================
// COLOR STYLES
// ============================================================

const colorStyles: Record<string, {
  bg: string;
  border: string;
  text: string;
  button: string;
  ring: string;
}> = {
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-600',
    button: 'bg-green-600 hover:bg-green-700',
    ring: 'ring-green-500'
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-600',
    button: 'bg-amber-500 hover:bg-amber-600',
    ring: 'ring-amber-500'
  },
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-600',
    button: 'bg-blue-600 hover:bg-blue-700',
    ring: 'ring-blue-500'
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-600',
    button: 'bg-purple-600 hover:bg-purple-700',
    ring: 'ring-purple-500'
  }
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Billing() {
  const navigate = useNavigate();
  const businessId = getBusinessId();
  
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [currentPlan, setCurrentPlan] = useState<string>('');
  const [totalRooms, setTotalRooms] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [business, setBusiness] = useState<any>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    status: string;
    message: string;
    charge: number;
    plan: string;
    validUntil?: Date;
  } | null>(null);

  // ============================================================
  // LOAD DATA
  // ============================================================

  useEffect(() => {
    if (!businessId) {
      navigate('/business/login');
      return;
    }
    loadCurrentPlan();
    loadSubscriptionStatus();
  }, [businessId]);

  const loadCurrentPlan = async () => {
    if (!businessId) return;

    try {
      const response = await fetch(`/.netlify/functions/get-business-branding?id=${businessId}`);
      if (!response.ok) throw new Error('Failed to load business data');
      
      const data = await response.json();
      setBusiness(data);
      setCurrentPlan(data.current_plan || data.subscription_tier || 'starter');
      setTotalRooms(data.total_rooms || 0);
    } catch (error) {
      console.error('Error loading current plan:', error);
    }
  };

  const loadSubscriptionStatus = async () => {
    if (!businessId) return;

    try {
      const response = await fetch(`/.netlify/functions/get-subscription-status?businessId=${businessId}`);
      if (response.ok) {
        const data = await response.json();
        setSubscriptionStatus(data);
      }
    } catch (error) {
      console.error('Error loading subscription status:', error);
    }
  };

  // ============================================================
  // PLAN VALIDATION
  // ============================================================

  // Get the minimum plan for the business based on room count
  const getMinimumPlan = (rooms: number): Plan | null => {
    // Sort plans by minRooms
    const sorted = [...plans].sort((a, b) => a.minRooms - b.minRooms);
    
    for (const plan of sorted) {
      if (rooms >= plan.minRooms && rooms <= plan.maxRooms) {
        return plan;
      }
    }
    
    // If rooms > 20, return the highest plan
    return plans[plans.length - 1];
  };

  // Check if a plan is eligible for downgrade
  const canDowngradeTo = (targetPlanId: string): boolean => {
    const minimumPlan = getMinimumPlan(totalRooms);
    if (!minimumPlan) return false;
    
    const targetPlan = plans.find(p => p.id === targetPlanId);
    if (!targetPlan) return false;
    
    // Can only downgrade to the minimum plan or higher
    const targetIndex = plans.findIndex(p => p.id === targetPlanId);
    const minIndex = plans.findIndex(p => p.id === minimumPlan.id);
    
    return targetIndex >= minIndex;
  };

  // Check if a plan is eligible for upgrade
  const canUpgradeTo = (targetPlanId: string): boolean => {
    const currentPlanObj = plans.find(p => p.id === currentPlan);
    if (!currentPlanObj) return true;
    
    const targetPlan = plans.find(p => p.id === targetPlanId);
    if (!targetPlan) return false;
    
    // Can upgrade to any plan with a higher index
    const currentIndex = plans.findIndex(p => p.id === currentPlan);
    const targetIndex = plans.findIndex(p => p.id === targetPlanId);
    
    return targetIndex > currentIndex;
  };

  // Get upgrade message for a plan
  const getUpgradeMessage = (targetPlanId: string): string | null => {
    if (targetPlanId === currentPlan) return null;
    
    const targetPlan = plans.find(p => p.id === targetPlanId);
    if (!targetPlan) return null;
    
    // Check if this is a downgrade
    const currentIndex = plans.findIndex(p => p.id === currentPlan);
    const targetIndex = plans.findIndex(p => p.id === targetPlanId);
    
    if (targetIndex < currentIndex) {
      const minimumPlan = getMinimumPlan(totalRooms);
      if (minimumPlan && targetIndex < plans.findIndex(p => p.id === minimumPlan.id)) {
        return `⚠️ Your property has ${totalRooms} rooms. The minimum plan for this number of rooms is ${minimumPlan.name}.`;
      }
      return `⬇️ Downgrading to ${targetPlan.name}`;
    }
    
    return `⬆️ Upgrading to ${targetPlan.name}`;
  };

  // ============================================================
  // HANDLERS
  // ============================================================

  const handlePlanChange = async (planId: string) => {
    setLoading(true);
    
    if (!businessId) {
      alert('Please log in again');
      setLoading(false);
      return;
    }

    const targetPlan = plans.find(p => p.id === planId);
    if (!targetPlan) {
      alert('Plan not found');
      setLoading(false);
      return;
    }

    // Check if downgrade is allowed
    const currentIndex = plans.findIndex(p => p.id === currentPlan);
    const targetIndex = plans.findIndex(p => p.id === planId);
    
    if (targetIndex < currentIndex) {
      // This is a downgrade - check if allowed
      if (!canDowngradeTo(planId)) {
        const minimumPlan = getMinimumPlan(totalRooms);
        alert(`⚠️ Cannot downgrade to ${targetPlan.name}. Your property has ${totalRooms} rooms. The minimum plan you can downgrade to is ${minimumPlan?.name || 'Starter'}.`);
        setLoading(false);
        return;
      }
    }

    try {
      const response = await fetch('/.netlify/functions/update-business-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          current_plan: planId,
          subscription_tier: planId,
          billing_cycle: billingCycle,
          max_rooms: targetPlan.maxRooms,
          total_rooms: totalRooms
        })
      });

      if (response.ok) {
        const isComplimentary = subscriptionStatus?.status === 'complimentary';
        
        if (isComplimentary) {
          alert(`✅ Plan updated to ${targetPlan.name}. Your complimentary access continues!`);
        } else if (targetIndex < currentIndex) {
          alert(`✅ Successfully downgraded to ${targetPlan.name}!`);
        } else {
          // Redirect to payment gateway for upgrades
          const paymentResponse = await fetch('/.netlify/functions/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              businessId,
              planId,
              billingCycle,
              email: business?.email,
              amount: billingCycle === 'monthly' ? targetPlan.priceMonthly : targetPlan.priceYearly
            })
          });

          if (paymentResponse.ok) {
            const paymentData = await paymentResponse.json();
            if (paymentData.redirectUrl) {
              window.location.href = paymentData.redirectUrl;
              return;
            }
          }
          
          alert(`✅ Successfully upgraded to ${targetPlan.name} plan!`);
        }
        
        setCurrentPlan(planId);
        loadSubscriptionStatus();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update plan. Please try again.');
      }
    } catch (error) {
      console.error('Plan change error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getAnnualSavings = (monthly: number, yearly: number) => {
    const monthlyTotal = monthly * 12;
    const savings = monthlyTotal - yearly;
    return savings > 0 ? `Save R${savings}/year` : null;
  };

  const getEffectivePrice = (plan: Plan): { monthly: number; yearly: number } => {
    if (subscriptionStatus?.status === 'complimentary') {
      return { monthly: 0, yearly: 0 };
    }
    if (subscriptionStatus?.status === 'trial') {
      return { monthly: 0, yearly: 0 };
    }
    return {
      monthly: plan.priceMonthly,
      yearly: plan.priceYearly
    };
  };

  const getPriceDisplay = (plan: Plan) => {
    const prices = getEffectivePrice(plan);
    const isFree = prices.monthly === 0 && prices.yearly === 0;
    
    if (isFree && subscriptionStatus?.status === 'complimentary') {
      return { amount: 'R0.00', note: 'Complimentary Access' };
    }
    if (isFree && subscriptionStatus?.status === 'trial') {
      return { amount: 'R0.00', note: 'Free Trial' };
    }
    return {
      amount: billingCycle === 'monthly' ? `R${prices.monthly}` : `R${prices.yearly}`,
      note: null
    };
  };

  const minimumPlan = getMinimumPlan(totalRooms);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-amber-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-stone-900">Billing & Subscription</h1>
          <p className="text-stone-600 mt-2">Manage your plan and payment method</p>
        </div>

        {/* Subscription Status Card */}
        {businessId && (
          <div className="max-w-2xl mx-auto mb-8">
            <SubscriptionStatus businessId={businessId} />
          </div>
        )}

        {/* Room Count & Minimum Plan Info */}
        {totalRooms > 0 && (
          <div className="max-w-md mx-auto mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <p className="text-sm text-blue-800">
              🏠 Your property has <strong>{totalRooms}</strong> room{totalRooms > 1 ? 's' : ''}
              {minimumPlan && (
                <span className="ml-2">
                  • Minimum plan: <strong className="capitalize">{minimumPlan.name}</strong>
                </span>
              )}
            </p>
          </div>
        )}

        {/* Current Plan Status */}
        {currentPlan && (
          <div className="max-w-md mx-auto mb-8 bg-white rounded-lg shadow p-4 text-center border border-stone-200">
            <p className="text-stone-600">Current Plan:</p>
            <p className="text-2xl font-bold text-amber-600 capitalize">{currentPlan}</p>
            {business?.subscription_status === 'trial' && (
              <p className="text-sm text-green-600 mt-1">✨ Free Trial Active</p>
            )}
            {subscriptionStatus?.status === 'complimentary' && (
              <p className="text-sm text-green-600 mt-1">✨ Complimentary Access</p>
            )}
          </div>
        )}

        {/* Billing Toggle */}
        {subscriptionStatus?.status !== 'complimentary' && (
          <div className="flex justify-center mb-8">
            <div className="bg-stone-100 rounded-full p-1 inline-flex">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  billingCycle === 'yearly'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Yearly <span className="text-xs ml-1 text-green-600">Save 17%</span>
              </button>
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const styles = colorStyles[plan.color];
            const isCurrentPlan = currentPlan === plan.id;
            const isComplimentary = subscriptionStatus?.status === 'complimentary';
            const prices = getEffectivePrice(plan);
            const priceDisplay = getPriceDisplay(plan);
            const savings = getAnnualSavings(plan.priceMonthly, plan.priceYearly);
            
            const currentIndex = plans.findIndex(p => p.id === currentPlan);
            const targetIndex = plans.findIndex(p => p.id === plan.id);
            const isDowngrade = targetIndex < currentIndex;
            const isUpgrade = targetIndex > currentIndex;
            const canDowngrade = canDowngradeTo(plan.id);
            const canUpgrade = canUpgradeTo(plan.id);
            const isActionDisabled = isCurrentPlan || 
              (isDowngrade && !canDowngrade) ||
              (isComplimentary && !isCurrentPlan);
            
            let actionLabel = 'Current Plan';
            let actionTooltip = '';
            
            if (isCurrentPlan) {
              actionLabel = '✓ Current Plan';
            } else if (isComplimentary && !isCurrentPlan) {
              actionLabel = 'Complimentary Access Active';
            } else if (isDowngrade && !canDowngrade) {
              actionLabel = '⛔ Cannot Downgrade';
              actionTooltip = `Minimum plan for ${totalRooms} rooms is ${minimumPlan?.name}`;
            } else if (isDowngrade && canDowngrade) {
              actionLabel = '⬇️ Downgrade';
            } else if (isUpgrade) {
              actionLabel = '⬆️ Upgrade Now';
            } else {
              actionLabel = 'Select Plan';
            }
            
            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl shadow-lg overflow-hidden transition-all hover:shadow-xl ${
                  plan.popular ? 'ring-2 ring-amber-500' : 'border border-stone-200'
                } ${isCurrentPlan ? 'ring-2 ring-amber-300' : ''} ${
                  isDowngrade && !canDowngrade ? 'opacity-60' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                      Most Popular
                    </div>
                  </div>
                )}
                
                {isCurrentPlan && (
                  <div className="absolute top-0 left-0">
                    <div className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-br-lg">
                      Current Plan
                    </div>
                  </div>
                )}
                
                {isDowngrade && !canDowngrade && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2">
                    <div className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-b-lg">
                      ⛔ Not Available
                    </div>
                  </div>
                )}
                
                <div className="p-6">
                  <h3 className={`text-2xl font-bold ${styles.text}`}>{plan.name}</h3>
                  <p className="text-stone-500 text-sm mt-1">{plan.description}</p>
                  
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-stone-900">
                      {priceDisplay.amount}
                    </span>
                    {!isComplimentary && !isCurrentPlan && (
                      <span className="text-stone-500">
                        /{billingCycle === 'monthly' ? 'month' : 'year'}
                      </span>
                    )}
                    {priceDisplay.note && (
                      <p className="text-xs text-green-600 font-semibold mt-1">{priceDisplay.note}</p>
                    )}
                    {savings && billingCycle === 'yearly' && !isComplimentary && (
                      <p className="text-xs text-green-600 font-semibold mt-1">{savings}</p>
                    )}
                  </div>
                  
                  <p className="text-sm text-stone-500 mt-2">
                    {plan.minRooms}–{plan.maxRooms} rooms
                    {plan.id === 'starter' && ' (1-5)'}
                    {plan.id === 'growth' && ' (6-10)'}
                    {plan.id === 'pro' && ' (11-15)'}
                    {plan.id === 'business' && ' (16-20)'}
                  </p>
                  
                  <ul className="mt-6 space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-stone-600">
                        <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <button
                    onClick={() => handlePlanChange(plan.id)}
                    disabled={isActionDisabled || loading}
                    className={`w-full mt-8 py-3 rounded-lg font-semibold transition-all ${
                      isCurrentPlan
                        ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                        : isDowngrade && !canDowngrade
                        ? 'bg-red-100 text-red-500 cursor-not-allowed'
                        : isComplimentary && !isCurrentPlan
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : `${styles.button} text-white`
                    }`}
                    title={actionTooltip}
                  >
                    {loading ? 'Processing...' : actionLabel}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Enterprise Tier */}
        <div className="mt-12 bg-white rounded-2xl shadow-lg p-8 text-center border border-stone-200">
          <h3 className="text-2xl font-bold text-stone-900 mb-2">Enterprise</h3>
          <p className="text-amber-600 font-semibold mb-4">Custom Pricing</p>
          <p className="text-stone-600 mb-6">For properties with 20+ rooms or multi-property groups</p>
          <ul className="flex flex-wrap justify-center gap-6 mb-6 text-stone-600 text-sm">
            <li>✓ 20+ rooms</li>
            <li>✓ Multi-property support</li>
            <li>✓ Dedicated onboarding</li>
            <li>✓ API access (coming soon)</li>
            <li>✓ Custom integrations</li>
          </ul>
          <button
            onClick={() => window.location.href = 'mailto:sales@fastcheckin.co.za'}
            className="px-8 py-3 bg-stone-900 text-white rounded-lg font-semibold hover:bg-stone-800 transition-colors"
          >
            Contact Sales
          </button>
        </div>

        {/* Room-Based Rules Info */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6 border border-stone-200">
          <h4 className="text-sm font-semibold text-stone-900 mb-3">📋 Plan Rules Based on Room Count</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <p className="font-semibold text-green-800">⬆️ Upgrade</p>
              <p className="text-green-700">You can upgrade to any higher plan at any time.</p>
              <p className="text-xs text-green-600 mt-1">Even if it's above your room count.</p>
            </div>
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
              <p className="font-semibold text-amber-800">⬇️ Downgrade</p>
              <p className="text-amber-700">You can only downgrade to the plan that matches your room count.</p>
              <p className="text-xs text-amber-600 mt-1">Example: 6 rooms → minimum Growth plan.</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="font-semibold text-blue-800">🏠 Room-Based Minimum</p>
              <p className="text-blue-700">Your minimum plan is determined by your number of rooms.</p>
              <p className="text-xs text-blue-600 mt-1">1-5 rooms: Starter • 6-10 rooms: Growth • etc.</p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-xl font-bold text-stone-900 mb-6 text-center">Frequently Asked Questions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-stone-900 mb-2">Can I change plans later?</h4>
              <p className="text-sm text-stone-600">Yes, you can upgrade or downgrade your plan at any time. Upgrades are immediate, downgrades take effect at the next billing cycle.</p>
            </div>
            <div>
              <h4 className="font-semibold text-stone-900 mb-2">What happens when my trial ends?</h4>
              <p className="text-sm text-stone-600">Your account will automatically be assigned to the minimum plan for your room count. Upgrade to continue enjoying full features.</p>
            </div>
            <div>
              <h4 className="font-semibold text-stone-900 mb-2">Do you offer discounts for annual billing?</h4>
              <p className="text-sm text-stone-600">Yes, annual billing saves you 17% compared to monthly.</p>
            </div>
            <div>
              <h4 className="font-semibold text-stone-900 mb-2">Is there a setup fee?</h4>
              <p className="text-sm text-stone-600">No, there are no hidden fees or setup costs.</p>
            </div>
            <div>
              <h4 className="font-semibold text-stone-900 mb-2">Can I downgrade below my room count?</h4>
              <p className="text-sm text-stone-600">No. The minimum plan is based on your number of rooms. For example, a 6-room property cannot downgrade to Starter.</p>
            </div>
            <div>
              <h4 className="font-semibold text-stone-900 mb-2">Can I upgrade above my room count?</h4>
              <p className="text-sm text-stone-600">Yes! You can upgrade to any higher plan regardless of your room count to access advanced features.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
