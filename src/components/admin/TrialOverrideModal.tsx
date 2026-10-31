import { useMemo, useState } from 'react';

interface TrialOverrideModalProps {
  businessId: string;
  businessName: string;
  currentTrialEnd?: string | null;
  onClose: () => void;
  onSaved: () => void;
}

const DAY = 24 * 60 * 60 * 1000;

export default function TrialOverrideModal({ businessId, businessName, currentTrialEnd, onClose, onSaved }: TrialOverrideModalProps) {
  const [extension, setExtension] = useState<number | 'custom'>(14);
  const [customDate, setCustomDate] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const currentEnd = currentTrialEnd ? new Date(currentTrialEnd) : null;
  const previewEnd = useMemo(() => {
    if (extension === 'custom') return customDate ? new Date(`${customDate}T23:59:59`) : null;
    const base = currentEnd && currentEnd.getTime() > Date.now() ? currentEnd : new Date();
    return new Date(base.getTime() + extension * DAY);
  }, [extension, customDate, currentTrialEnd]);

  const handleSave = async () => {
    if (!reason.trim()) {
      alert('Please provide a reason for the extension.');
      return;
    }
    if (extension === 'custom' && !customDate) {
      alert('Please select the new trial end date.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        businessId,
        ...(extension === 'custom' ? { newTrialEnd: previewEnd?.toISOString() } : { addDays: extension }),
        reason: reason.trim(),
      };
      const response = await fetch('/.netlify/functions/set-trial-override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to extend trial');

      alert(`Trial extended to ${new Date(data.newTrialEnd).toLocaleDateString()}.`);
      onSaved();
      onClose();
    } catch (error) {
      console.error('Error extending trial:', error);
      alert(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Extend Trial — {businessName}</h3>
          <p className="text-sm text-gray-500 mb-6">
            Extend the existing trial. Time already used is preserved; the extension is added to the current expiry when it is still active.
          </p>

          {currentEnd && (
            <div className="p-3 bg-gray-50 rounded-lg mb-4 text-sm">
              <span className="text-gray-500">Current expiry:</span>{' '}
              <strong>{currentEnd.toLocaleDateString()}</strong>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Extension</label>
              <select
                value={extension}
                onChange={(e) => setExtension(e.target.value === 'custom' ? 'custom' : Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              >
                <option value={7}>Add 7 days</option>
                <option value={14}>Add 14 days</option>
                <option value={30}>Add 30 days</option>
                <option value={60}>Add 60 days</option>
                <option value={90}>Add 90 days</option>
                <option value="custom">Set custom end date</option>
              </select>
            </div>

            {extension === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New trial end date</label>
                <input
                  type="date"
                  value={customDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            )}

            {previewEnd && (
              <div className="p-3 bg-green-50 rounded-lg text-sm text-green-700">
                New expiry: <strong>{previewEnd.toLocaleDateString()}</strong>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Pilot programme, implementation assistance, strategic partner..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50">
              {saving ? 'Saving...' : 'Extend Trial'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
