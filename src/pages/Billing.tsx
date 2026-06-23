// src/pages/Billing.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBusinessId } from '../utils/auth';
import SubscriptionStatus from '../components/Billing/SubscriptionStatus';
import { PlanType } from '../types/entitlements';

// ============================================================
// TYPES
// ============================================================

interface Plan {
  id: PlanType;
  name: string;
  priceMonthly: number;
  priceYearly: number;
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
  // HANDLERS
  // ============================================================

  const handleUpgrade = async (planId: string) => {
    setLoading(true);
    
    if (!businessId) {
      alert('Please log in again');
      setLoading(false);
      return;
    }

    try {
      // Get the selected plan
      const selectedPlan = plans.find(p => p.id === planId);
      if (!selectedPlan) {
        throw new Error('Plan not found');
      }

      // Check if this is a complimentary upgrade
      const isComplimentary = subscriptionStatus?.status === 'complimentary';

      // Update the plan in the database
      const response = await fetch('/.netlify/functions/update-business-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          current_plan: planId,
          subscription_tier: planId,
          billing_cycle: billingCycle,
          max_rooms: selectedPlan.maxRooms,
          // Don't override complimentary status if active
          skip_pricing_update: isComplimentary
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        if (isComplimentary) {
          alert(`✅ Plan updated to ${selectedPlan.name}. Your complimentary access continues!`);
        } else {
          // Redirect to payment gateway
          const paymentResponse = await fetch('/.netlify/functions/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              businessId,
              planId,
              billingCycle,
              email: business?.email,
              amount: billingCycle === 'monthly' ? selectedPlan.priceMonthly : selectedPlan.priceYearly
            })
          });

          if (paymentResponse.ok) {
            const paymentData = await paymentResponse.json();
            if (paymentData.redirectUrl) {
              window.location.href = paymentData.redirectUrl;
              return;
            }
          }
          
          // Fallback if payment not integrated yet
          alert(`✅ Successfully upgraded to ${selectedPlan.name} plan!`);
        }
        
        setCurrentPlan(planId);
        loadSubscriptionStatus();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to upgrade. Please try again.');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
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
    // If subscription is complimentary, show R0.00
    if (subscriptionStatus?.status === 'complimentary') {
      return { monthly: 0, yearly: 0 };
    }
    // If on trial, show R0.00 with note
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
      return {
        amount: 'R0.00',
        note: 'Complimentary Access'
      };
    }
    if (isFree && subscriptionStatus?.status === 'trial') {
      return {
        amount: 'R0.00',
        note: 'Free Trial'
      };
    }
    return {
      amount: billingCycle === 'monthly' ? `R${prices.monthly}` : `R${prices.yearly}`,
      note: null
    };
  };

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

        {/* Billing Toggle - Hide if complimentary */}
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
            
            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl shadow-lg overflow-hidden transition-all hover:shadow-xl ${
                  plan.popular ? 'ring-2 ring-amber-500' : 'border border-stone-200'
                } ${isCurrentPlan ? 'ring-2 ring-amber-300' : ''} ${
                  isComplimentary && !isCurrentPlan ? 'opacity-75' : ''
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
                  
                  <p className="text-sm text-stone-500 mt-2">Up to {plan.maxRooms} rooms</p>
                  
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
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={loading || isCurrentPlan || (isComplimentary && !isCurrentPlan)}
                    className={`w-full mt-8 py-3 rounded-lg font-semibold transition-all ${
                      isCurrentPlan
                        ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                        : isComplimentary && !isCurrentPlan
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : `${styles.button} text-white`
                    }`}
                  >
                    {loading ? 'Processing...' : 
                     isCurrentPlan ? '✓ Current Plan' : 
                     isComplimentary ? 'Complimentary Access Active' : 
                     'Upgrade Now'}
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

        {/* FAQ Section */}
        <div className="mt-12 bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-xl font-bold text-stone-900 mb-6 text-center">Frequently Asked Questions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-stone-900 mb-2">Can I change plans later?</h4>
              <p className="text-sm text-stone-600">Yes, you can upgrade or downgrade your plan at any time.</p>
            </div>
            <div>
              <h4 className="font-semibold text-stone-900 mb-2">What happens when my trial ends?</h4>
              <p className="text-sm text-stone-600">Your account will automatically be downgraded to Starter plan. Upgrade to continue enjoying full features.</p>
            </div>
            <div>
              <h4 className="font-semibold text-stone-900 mb-2">Do you offer discounts for annual billing?</h4>
              <p className="text-sm text-stone-600">Yes, annual billing saves you 17% compared to monthly.</p>
            </div>
            <div>
              <h4 className="font-semibold text-stone-900 mb-2">What is complimentary access?</h4>
              <p className="text-sm text-stone-600">Complimentary access grants you full features of a plan at no charge for a specified period. Your account will automatically revert to standard pricing when it expires.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
