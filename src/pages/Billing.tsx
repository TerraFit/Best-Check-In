// src/pages/Billing.tsx - Simple version
import { useState, useEffect } from 'react';
import { getBusinessId } from '../utils/auth';

export default function Billing() {
  const [currentPlan, setCurrentPlan] = useState('');
  const [loading, setLoading] = useState(false);

  const plans = [
    { id: 'starter', name: 'Starter', price: 349, rooms: 5 },
    { id: 'growth', name: 'Growth', price: 649, rooms: 10, popular: true },
    { id: 'pro', name: 'Pro', price: 949, rooms: 15 },
    { id: 'business', name: 'Business', price: 1290, rooms: 20 }
  ];

  const handleUpgrade = async (planId: string) => {
    setLoading(true);
    // TODO: Integrate payment gateway (PayFast/Stripe)
    alert(`Upgrade to ${planId} - Payment integration coming soon`);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">Upgrade Your Plan</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {plans.map(plan => (
            <div key={plan.id} className={`bg-white rounded-xl shadow-lg p-6 ${plan.popular ? 'ring-2 ring-amber-500' : ''}`}>
              {plan.popular && <div className="text-amber-500 text-sm font-semibold mb-2">Most Popular</div>}
              <h2 className="text-2xl font-bold">{plan.name}</h2>
              <p className="text-3xl font-bold mt-4">R{plan.price}<span className="text-sm text-gray-500">/month</span></p>
              <p className="text-gray-500 mt-2">Up to {plan.rooms} rooms</p>
              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={loading || currentPlan === plan.id}
                className="w-full mt-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
              >
                {currentPlan === plan.id ? 'Current Plan' : 'Upgrade'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
