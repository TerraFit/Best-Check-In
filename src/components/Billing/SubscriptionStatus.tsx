// src/components/billing/SubscriptionStatus.tsx
import { useState, useEffect } from 'react';

interface SubscriptionStatusProps {
  businessId: string;
}

interface StatusData {
  status: string;
  message: string;
  charge: number;
  plan: string;
  validUntil?: Date;
}

export default function SubscriptionStatus({ businessId }: SubscriptionStatusProps) {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, [businessId]);

  const fetchStatus = async () => {
    try {
      const response = await fetch(`/.netlify/functions/get-subscription-status?businessId=${businessId}`);
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error fetching subscription status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-20 bg-gray-100 rounded"></div>
      </div>
    );
  }

  if (!status) return null;

  const isComplimentary = status.status === 'complimentary';
  const isOnTrial = status.status === 'trial';
  const isExpired = status.status === 'expired';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Subscription Status</h3>
      </div>

      <div className="p-6 space-y-4">
        {/* Current Plan */}
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Current Plan</span>
          <span className="font-semibold text-gray-900 capitalize">{status.plan}</span>
        </div>

        {/* Status */}
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Status</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            isComplimentary ? 'bg-green-100 text-green-800' :
            isOnTrial ? 'bg-blue-100 text-blue-800' :
            isExpired ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {isComplimentary && '✨ Complimentary Access'}
            {isOnTrial && '⏳ Free Trial'}
            {isExpired && '⚠️ Expired'}
            {!isComplimentary && !isOnTrial && !isExpired && 'Active'}
          </span>
        </div>

        {/* Monthly Charge */}
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Monthly Charge</span>
          <span className={`font-bold ${isComplimentary || isOnTrial ? 'text-green-600' : 'text-gray-900'}`}>
            {isComplimentary || isOnTrial ? 'R0.00' : `R${status.charge.toFixed(2)}`}
          </span>
        </div>

        {/* Valid Until */}
        {status.validUntil && (
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Valid Until</span>
            <span className="text-gray-900">
              {new Date(status.validUntil).toLocaleDateString('en-ZA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
        )}

        {/* Status Message */}
        {status.message && (
          <div className={`p-3 rounded-lg text-sm ${
            isComplimentary ? 'bg-green-50 text-green-800' :
            isOnTrial ? 'bg-blue-50 text-blue-800' :
            isExpired ? 'bg-red-50 text-red-800' :
            'bg-gray-50 text-gray-700'
          }`}>
            {status.message}
          </div>
        )}

        {/* Auto-renewal notice */}
        {isComplimentary && status.validUntil && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            ⚡ Your subscription will automatically revert to the standard {status.plan} plan pricing when this complimentary period ends.
          </div>
        )}

        {isComplimentary && !status.validUntil && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
            ✨ Lifetime complimentary access - no charges will ever apply.
          </div>
        )}
      </div>
    </div>
  );
}
