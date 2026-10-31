import { useNavigate } from 'react-router-dom';

interface TrialBannerProps {
  subscriptionStatus: string | null;
  trialDaysLeft: number | null;
  trialEnd?: string | null;
}

export function TrialBanner({ subscriptionStatus, trialDaysLeft, trialEnd }: TrialBannerProps) {
  const navigate = useNavigate();

  if (!['trial', 'trialing'].includes(subscriptionStatus || '') || trialDaysLeft === null) {
    return null;
  }

  const isUrgent = trialDaysLeft <= 3;
  const expiryDate = trialEnd
    ? new Date(trialEnd)
    : new Date(Date.now() + Math.max(0, trialDaysLeft) * 24 * 60 * 60 * 1000);
  const expiry = expiryDate.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
      <div className={`rounded-lg p-4 ${isUrgent ? 'bg-red-50 border-l-4 border-red-500' : 'bg-amber-50 border-l-4 border-amber-500'}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className={`font-semibold ${isUrgent ? 'text-red-800' : 'text-amber-800'}`}>
              {trialDaysLeft <= 0
                ? 'Your free trial ends today.'
                : trialDaysLeft === 1
                  ? 'Your free trial ends tomorrow.'
                  : `Your free trial ends in ${trialDaysLeft} days.`}
            </p>
            <p className={`text-sm mt-1 ${isUrgent ? 'text-red-700' : 'text-amber-700'}`}>
              Trial ends: <strong>{expiry}</strong>. Add your card details to avoid any interruption.
            </p>
          </div>
          <button
            onClick={() => navigate('/business/billing')}
            className={`px-4 py-2 text-white rounded-lg text-sm font-medium ${isUrgent ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}
          >
            Choose a plan →
          </button>
        </div>
      </div>
    </div>
  );
}
