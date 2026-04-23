import { useState } from 'react';

interface TrialOverrideModalProps {
  businessId: string;
  businessName: string;
  currentTrialDays?: number;
  onClose: () => void;
  onSaved: () => void;
}

export default function TrialOverrideModal({ 
  businessId, 
  businessName, 
  currentTrialDays, 
  onClose, 
  onSaved 
}: TrialOverrideModalProps) {
  const [trialDays, setTrialDays] = useState(currentTrialDays || 14);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const trialOptions = [
    { label: 'Standard (14 days)', value: 14 },
    { label: 'Extended (30 days)', value: 30 },
    { label: 'Strategic (60 days)', value: 60 },
    { label: 'VIP (90 days)', value: 90 },
    { label: 'Custom', value: 'custom' }
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/.netlify/functions/set-trial-override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          trialDays,
          reason
        })
      });

      if (response.ok) {
        alert(`✅ Trial set to ${trialDays} days for ${businessName}`);
        onSaved();
        onClose();
      } else {
        alert('Failed to set trial override');
      }
    } catch (error) {
      console.error('Error setting trial:', error);
      alert('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Trial Override - {businessName}
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Set a custom trial period for this business
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trial Duration
              </label>
              <select
                value={trialDays}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'custom') {
                    setTrialDays(14);
                  } else {
                    setTrialDays(parseInt(val));
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              >
                {trialOptions.map(opt => (
                  <option key={opt.label} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {trialDays === 14 && (
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">✓ Standard trial - 14 days</p>
              </div>
            )}
            {trialDays === 30 && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">⭐ Extended trial - 30 days</p>
              </div>
            )}
            {trialDays === 60 && (
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-700">🔥 Strategic trial - 60 days</p>
              </div>
            )}
            {trialDays === 90 && (
              <div className="p-3 bg-amber-50 rounded-lg">
                <p className="text-sm text-amber-700">👑 VIP trial - 90 days</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Override (optional)
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Strategic partner, Pilot program, Volume discount..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Apply Override'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
