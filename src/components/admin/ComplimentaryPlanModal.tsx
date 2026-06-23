// src/components/admin/ComplimentaryPlanModal.tsx
import { useState } from 'react';
import { PlanType } from '../../types/entitlements';

interface ComplimentaryPlanModalProps {
  businessId: string;
  businessName: string;
  onClose: () => void;
  onSaved: () => void;
}

const PLANS: { value: PlanType; label: string }[] = [
  { value: 'starter', label: 'Starter' },
  { value: 'growth', label: 'Growth' },
  { value: 'pro', label: 'Pro' },
  { value: 'business', label: 'Business' },
  { value: 'enterprise', label: 'Enterprise' }
];

const DURATIONS = [
  { value: '1month', label: '1 Month' },
  { value: '3months', label: '3 Months' },
  { value: '6months', label: '6 Months' },
  { value: '12months', label: '12 Months' },
  { value: '24months', label: '24 Months' },
  { value: 'lifetime', label: 'Lifetime (No Expiry)' },
  { value: 'custom', label: 'Custom Date' }
];

export default function ComplimentaryPlanModal({
  businessId,
  businessName,
  onClose,
  onSaved
}: ComplimentaryPlanModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('growth');
  const [duration, setDuration] = useState('12months');
  const [customDate, setCustomDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const calculateEndDate = (): Date | undefined => {
    const now = new Date();
    switch (duration) {
      case '1month':
        now.setMonth(now.getMonth() + 1);
        return now;
      case '3months':
        now.setMonth(now.getMonth() + 3);
        return now;
      case '6months':
        now.setMonth(now.getMonth() + 6);
        return now;
      case '12months':
        now.setMonth(now.getMonth() + 12);
        return now;
      case '24months':
        now.setMonth(now.getMonth() + 24);
        return now;
      case 'lifetime':
        return undefined;
      case 'custom':
        return customDate ? new Date(customDate) : undefined;
      default:
        return undefined;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const endDate = calculateEndDate();
      
      const response = await fetch('/.netlify/functions/grant-complimentary-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          plan: selectedPlan,
          endsAt: endDate,
          lifetime: duration === 'lifetime',
          notes
        })
      });

      if (response.ok) {
        alert(`✅ ${businessName} now has complimentary ${selectedPlan} plan access!`);
        onSaved();
        onClose();
      } else {
        alert('Failed to grant complimentary plan');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getDurationDisplay = () => {
    const option = DURATIONS.find(d => d.value === duration);
    return option?.label || duration;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-900">
              Grant Complimentary Plan
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            Grant <strong>{businessName}</strong> complimentary access to a subscription plan.
          </p>

          {/* Plan Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Plan
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PLANS.map(plan => (
                <button
                  key={plan.value}
                  onClick={() => setSelectedPlan(plan.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedPlan === plan.value
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {plan.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
            >
              {DURATIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Date Picker */}
          {duration === 'custom' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          )}

          {/* Summary */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-amber-800">
              <strong>Summary:</strong> {businessName} will receive the <strong>{selectedPlan}</strong> plan
              {duration === 'lifetime' ? ' permanently' : ` for ${getDurationDisplay()}`} at <strong>R0.00</strong>.
            </p>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Internal Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Strategic partner, Beta tester, Tourism association..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || (duration === 'custom' && !customDate)}
              className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
            >
              {loading ? 'Granting...' : 'Grant Complimentary Plan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
