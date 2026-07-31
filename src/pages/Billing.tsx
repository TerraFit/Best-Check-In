// src/pages/Billing.tsx — Programme 1 finalisation: commercial SSOT only
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBusinessId } from '../utils/auth';
import SubscriptionStatus from '../components/Billing/SubscriptionStatus';
import {
  PACKAGES,
  PLAN_ORDER,
  getPackage,
  normalizePlanId,
  type PlanType,
  type PackageDefinition,
} from '../config/packages';
import { featuresForPackageDisplay } from '../config/featureRegistry';

const colorStyles: Record<
  string,
  { bg: string; border: string; text: string; button: string; ring: string }
> = {
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-600',
    button: 'bg-green-600 hover:bg-green-700',
    ring: 'ring-green-500',
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-600',
    button: 'bg-amber-500 hover:bg-amber-600',
    ring: 'ring-amber-500',
  },
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-600',
    button: 'bg-blue-600 hover:bg-blue-700',
    ring: 'ring-blue-500',
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-600',
    button: 'bg-purple-600 hover:bg-purple-700',
    ring: 'ring-purple-500',
  },
  stone: {
    bg: 'bg-stone-50',
    border: 'border-stone-200',
    text: 'text-stone-700',
    button: 'bg-stone-900 hover:bg-stone-800',
    ring: 'ring-stone-500',
  },
};

/** Sellable cards only (enterprise is contact-sales). */
const sellablePlans: PackageDefinition[] = PLAN_ORDER.map((id) => PACKAGES[id]).filter(
  (p) => !p.contactSales
);

function featureBulletsForPlan(planId: PlanType): string[] {
  const features = featuresForPackageDisplay(planId);
  // Show features whose minimum package is exactly this plan (incremental), plus inherited headline
  const incremental = features
    .filter((f) => f.minimumPackage === planId)
    .map((f) => f.name);
  if (planId === 'starter') {
    return incremental.length
      ? incremental
      : features.filter((f) => f.minimumPackage === 'starter').map((f) => f.name);
  }
  const prev = PLAN_ORDER[PLAN_ORDER.indexOf(planId) - 1];
  const bullets = [`Everything in ${getPackage(prev).name}`, ...incremental];
  return bullets.length > 1 ? bullets : features.slice(0, 8).map((f) => f.name);
}

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
      setCurrentPlan(normalizePlanId(data.current_plan || data.subscription_tier || 'starter'));
      setTotalRooms(data.total_rooms || 0);
    } catch (error) {
      console.error('Error loading current plan:', error);
    }
  };

  const loadSubscriptionStatus = async () => {
    if (!businessId) return;
    try {
      const response = await fetch(
        `/.netlify/functions/get-subscription-status?businessId=${businessId}`
      );
      if (response.ok) {
        const data = await response.json();
        setSubscriptionStatus(data);
      }
    } catch (error) {
      console.error('Error loading subscription status:', error);
    }
  };

  const getMinimumPlan = (rooms: number): PackageDefinition => {
    const sorted = [...sellablePlans].sort((a, b) => a.minRooms - b.minRooms);
    for (const plan of sorted) {
      if (plan.maxRooms != null && rooms >= plan.minRooms && rooms <= plan.maxRooms) {
        return plan;
      }
    }
    return sellablePlans[sellablePlans.length - 1];
  };

  const planIndex = (id: string) =>
    sellablePlans.findIndex((p) => p.id === normalizePlanId(id));

  const canDowngradeTo = (targetPlanId: string): boolean => {
    const minimumPlan = getMinimumPlan(totalRooms);
    return planIndex(targetPlanId) >= planIndex(minimumPlan.id);
  };

  const handlePlanChange = async (planId: string) => {
    setLoading(true);
    if (!businessId) {
      alert('Please log in again');
      setLoading(false);
      return;
    }

    const targetPlan = getPackage(planId);
    if (targetPlan.contactSales) {
      window.location.href = 'mailto:sales@fastcheckin.co.za';
      setLoading(false);
      return;
    }

    const currentIndex = planIndex(currentPlan);
    const targetIndex = planIndex(planId);

    if (targetIndex < currentIndex && !canDowngradeTo(planId)) {
      const minimumPlan = getMinimumPlan(totalRooms);
      alert(
        `Cannot downgrade to ${targetPlan.name}. Your property has ${totalRooms} rooms. Minimum plan: ${minimumPlan.name}.`
      );
      setLoading(false);
      return;
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
          total_rooms: totalRooms,
        }),
      });

      if (response.ok) {
        const isComplimentary = subscriptionStatus?.status === 'complimentary';
        if (isComplimentary) {
          alert(`Plan updated to ${targetPlan.name}. Complimentary access continues.`);
        } else if (targetIndex < currentIndex) {
          alert(`Successfully downgraded to ${targetPlan.name}.`);
        } else {
          const amount =
            billingCycle === 'monthly' ? targetPlan.priceMonthly : targetPlan.priceYearly;
          const paymentResponse = await fetch('/.netlify/functions/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              businessId,
              planId,
              billingCycle,
              email: business?.email,
              amount,
            }),
          });
          if (paymentResponse.ok) {
            const paymentData = await paymentResponse.json();
            if (paymentData.redirectUrl) {
              window.location.href = paymentData.redirectUrl;
              return;
            }
          }
          alert(`Successfully upgraded to ${targetPlan.name} plan.`);
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
    const savings = monthly * 12 - yearly;
    return savings > 0 ? `Save R${savings}/year` : null;
  };

  const getPriceDisplay = (plan: PackageDefinition) => {
    if (subscriptionStatus?.status === 'complimentary') {
      return { amount: 'R0.00', note: 'Complimentary Access' };
    }
    if (subscriptionStatus?.status === 'trial') {
      return { amount: 'R0.00', note: 'Free Trial' };
    }
    return {
      amount:
        billingCycle === 'monthly'
          ? `R${plan.priceMonthly}`
          : `R${plan.priceYearly}`,
      note: null as string | null,
    };
  };

  const minimumPlan = getMinimumPlan(totalRooms);
  const enterprise = PACKAGES.enterprise;

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-amber-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-stone-900">Billing & Subscription</h1>
          <p className="text-stone-600 mt-2">Manage your plan and payment method</p>
        </div>

        {businessId && (
          <div className="max-w-2xl mx-auto mb-8">
            <SubscriptionStatus businessId={businessId} />
          </div>
        )}

        {totalRooms > 0 && (
          <div className="max-w-md mx-auto mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <p className="text-sm text-blue-800">
              Your property has <strong>{totalRooms}</strong> room
              {totalRooms > 1 ? 's' : ''} • Minimum plan:{' '}
              <strong>{minimumPlan.name}</strong>
            </p>
          </div>
        )}

        {currentPlan && (
          <div className="max-w-md mx-auto mb-8 bg-white rounded-lg shadow p-4 text-center border border-stone-200">
            <p className="text-stone-600">Current Plan:</p>
            <p className="text-2xl font-bold text-amber-600">{getPackage(currentPlan).name}</p>
            {subscriptionStatus?.status === 'trial' && (
              <p className="text-sm text-green-600 mt-1">Free Trial Active</p>
            )}
            {subscriptionStatus?.status === 'complimentary' && (
              <p className="text-sm text-green-600 mt-1">Complimentary Access</p>
            )}
          </div>
        )}

        {subscriptionStatus?.status !== 'complimentary' && (
          <div className="flex justify-center mb-8">
            <div className="bg-stone-100 rounded-full p-1 inline-flex">
              <button
                type="button"
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
                type="button"
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {sellablePlans.map((plan) => {
            const styles = colorStyles[plan.color] || colorStyles.green;
            const isCurrentPlan = normalizePlanId(currentPlan) === plan.id;
            const isComplimentary = subscriptionStatus?.status === 'complimentary';
            const priceDisplay = getPriceDisplay(plan);
            const savings = getAnnualSavings(plan.priceMonthly, plan.priceYearly);
            const currentIndex = planIndex(currentPlan);
            const targetIndex = planIndex(plan.id);
            const isDowngrade = targetIndex < currentIndex;
            const isUpgrade = targetIndex > currentIndex;
            const canDowngrade = canDowngradeTo(plan.id);
            const isActionDisabled =
              isCurrentPlan ||
              (isDowngrade && !canDowngrade) ||
              (isComplimentary && !isCurrentPlan);
            const bullets = featureBulletsForPlan(plan.id);

            let actionLabel = 'Select Plan';
            if (isCurrentPlan) actionLabel = 'Current Plan';
            else if (isComplimentary && !isCurrentPlan) actionLabel = 'Complimentary Access Active';
            else if (isDowngrade && !canDowngrade) actionLabel = 'Cannot Downgrade';
            else if (isDowngrade && canDowngrade) actionLabel = 'Downgrade';
            else if (isUpgrade) actionLabel = 'Upgrade Now';

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

                <div className="p-6">
                  <h3 className={`text-2xl font-bold ${styles.text}`}>{plan.name}</h3>
                  <p className="text-stone-500 text-sm mt-1">{plan.description}</p>

                  <div className="mt-4">
                    <span className="text-4xl font-bold text-stone-900">{priceDisplay.amount}</span>
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
                    {plan.minRooms}–{plan.maxRooms ?? '∞'} rooms
                  </p>

                  <ul className="mt-6 space-y-2">
                    {bullets.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-stone-600">
                        <svg
                          className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
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
                  >
                    {loading ? 'Processing...' : actionLabel}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 bg-white rounded-2xl shadow-lg p-8 text-center border border-stone-200">
          <h3 className="text-2xl font-bold text-stone-900 mb-2">{enterprise.name}</h3>
          <p className="text-amber-600 font-semibold mb-4">Custom Pricing (ZAR)</p>
          <p className="text-stone-600 mb-6">{enterprise.description}</p>
          <ul className="flex flex-wrap justify-center gap-6 mb-6 text-stone-600 text-sm">
            {featureBulletsForPlan('enterprise').slice(0, 6).map((f) => (
              <li key={f}>✓ {f}</li>
            ))}
            <li>✓ Multi-property support</li>
            <li>✓ API access (roadmap)</li>
          </ul>
          <button
            type="button"
            onClick={() => {
              window.location.href = 'mailto:sales@fastcheckin.co.za';
            }}
            className="px-8 py-3 bg-stone-900 text-white rounded-lg font-semibold hover:bg-stone-800 transition-colors"
          >
            Contact Sales
          </button>
        </div>

        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6 border border-stone-200">
          <h4 className="text-sm font-semibold text-stone-900 mb-3">Plan rules based on room count</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <p className="font-semibold text-green-800">Upgrade</p>
              <p className="text-green-700">You can upgrade to any higher plan at any time.</p>
            </div>
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
              <p className="font-semibold text-amber-800">Downgrade</p>
              <p className="text-amber-700">
                You can only downgrade to the plan that matches your room count.
              </p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="font-semibold text-blue-800">Room-based minimum</p>
              <p className="text-blue-700">
                Minimum plan is determined by room guidelines from package configuration.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
