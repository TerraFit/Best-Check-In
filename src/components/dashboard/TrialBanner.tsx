import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getAuthHeader } from '../../utils/auth';

interface TrialBannerProps {
  subscriptionStatus: string | null;
  trialDaysLeft: number | null;
  trialEnd?: string | null;
}

export function TrialBanner({ subscriptionStatus, trialDaysLeft, trialEnd }: TrialBannerProps) {
  const navigate = useNavigate();
  const { getBusinessId } = useAuth();
  const [remote, setRemote] = useState<{ status?: string; trialEnd?: string | null; daysLeft?: number | null }>({});

  useEffect(() => {
    if (subscriptionStatus && trialDaysLeft !== null && trialEnd) return;
    const businessId = getBusinessId();
    if (!businessId) return;
    let cancelled = false;
    fetch(`/.netlify/functions/get-subscription-status?businessId=${encodeURIComponent(businessId)}`, { headers: getAuthHeader() })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (cancelled || !data) return;
        const end = data.validUntil ? new Date(data.validUntil) : null;
        const days = end ? Math.max(0, Math.ceil((end.getTime() - Date.now()) / (24 * 60 * 60 * 1000))) : null;
        setRemote({ status: data.status, trialEnd: data.validUntil, daysLeft: days });
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [subscriptionStatus, trialDaysLeft, trialEnd, getBusinessId]);

  const status = subscriptionStatus || remote.status || '';
  const daysLeft = trialDaysLeft ?? remote.daysLeft ?? null;
  const end = trialEnd || remote.trialEnd || null;

  if (status === 'restricted') {
    return (
      <div className="fixed inset-0 z-[100] bg-stone-900/95 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-stone-900 mb-3">Your FastCheckIn account is restricted</h1>
          <p className="text-stone-600 mb-2">Your subscription payment remains outstanding.</p>
          <p className="text-sm text-stone-500 mb-6">Your data is safe. Resolve the payment issue to restore access to your account.</p>
          <button onClick={() => navigate('/business/billing')} className="px-6 py-3 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600">Restore access →</button>
        </div>
      </div>
    );
  }

  if (!['trial', 'trialing'].includes(status) || daysLeft === null) return null;

  const isUrgent = daysLeft <= 3;
  const expiryDate = end ? new Date(end) : new Date(Date.now() + Math.max(0, daysLeft) * 24 * 60 * 60 * 1000);
  const expiry = expiryDate.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
      <div className={`rounded-lg p-4 ${isUrgent ? 'bg-red-50 border-l-4 border-red-500' : 'bg-amber-50 border-l-4 border-amber-500'}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className={`font-semibold ${isUrgent ? 'text-red-800' : 'text-amber-800'}`}>
              {daysLeft <= 0 ? 'Your free trial ends today.' : daysLeft === 1 ? 'Your free trial ends tomorrow.' : `Your free trial ends in ${daysLeft} days.`}
            </p>
            <p className={`text-sm mt-1 ${isUrgent ? 'text-red-700' : 'text-amber-700'}`}>
              Trial ends: <strong>{expiry}</strong>. Add your card details to avoid any interruption.
            </p>
          </div>
          <button onClick={() => navigate('/business/billing')} className={`px-4 py-2 text-white rounded-lg text-sm font-medium ${isUrgent ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}>
            Choose a plan →
          </button>
        </div>
      </div>
    </div>
  );
}
