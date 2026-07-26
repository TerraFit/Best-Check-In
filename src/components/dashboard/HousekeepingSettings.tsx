// src/components/dashboard/HousekeepingSettings.tsx
// ✅ Complete Housekeeping Settings component

import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { HousekeepingPolicy } from '../../services/housekeepingService';

interface HousekeepingSettingsProps {
  businessId: string;
  initialPolicy?: HousekeepingPolicy;
  initialInterval?: number;
  initialAutoGenerate?: boolean;
  onSave: (settings: {
    policy: HousekeepingPolicy;
    interval: number;
    autoGenerate: boolean;
  }) => Promise<void>;
  saving?: boolean;
}

const POLICY_OPTIONS: {
  value: HousekeepingPolicy;
  label: string;
  description: string;
}[] = [
  {
    value: 'standard',
    label: 'Standard (Recommended)',
    description: 'Refresh on occupied stay-over nights. Full Service every 3rd night. Full Service after check-out.'
  },
  {
    value: 'daily_full_service',
    label: 'Daily Full Service',
    description: 'Full Service every occupied night. Full Service after check-out.'
  },
  {
    value: 'eco',
    label: 'Eco Mode',
    description: 'Refresh every occupied night. Full Service every 3rd night. Full Service after check-out.'
  },
  {
    value: 'custom',
    label: 'Custom',
    description: 'Choose your own Full Service interval. Refresh on other nights.'
  }
];

const INTERVAL_OPTIONS = [
  { value: 2, label: 'Every 2 nights' },
  { value: 3, label: 'Every 3 nights' },
  { value: 4, label: 'Every 4 nights' },
  { value: 5, label: 'Every 5 nights' }
];

export function HousekeepingSettings({
  businessId,
  initialPolicy = 'standard',
  initialInterval = 3,
  initialAutoGenerate = true,
  onSave,
  saving = false
}: HousekeepingSettingsProps) {
  const { t } = useTranslation();
  const [policy, setPolicy] = useState<HousekeepingPolicy>(initialPolicy);
  const [interval, setInterval] = useState<number>(initialInterval);
  const [autoGenerate, setAutoGenerate] = useState<boolean>(initialAutoGenerate);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    setSuccess(false);

    try {
      await onSave({
        policy,
        interval,
        autoGenerate
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 md:p-8 space-y-6">
      <div>
        <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
          🧹 Housekeeping Settings
        </h3>
        <p className="text-sm text-stone-500 mt-1">
          Configure how rooms should be serviced during a guest's stay
        </p>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
          <span className="text-emerald-500 text-xl">✅</span>
          <span className="text-sm text-emerald-700 font-medium">Settings saved successfully!</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
          <span className="text-red-500 text-xl">⚠️</span>
          <span className="text-sm text-red-700 font-medium">{error}</span>
        </div>
      )}

      {/* Auto-generate toggle */}
      <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-200">
        <div>
          <p className="font-medium text-stone-800">Auto-generate housekeeping tasks</p>
          <p className="text-xs text-stone-500">Automatically create tasks from active reservations</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={autoGenerate}
            onChange={(e) => setAutoGenerate(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
        </label>
      </div>

      {/* Policy selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-stone-700">Housekeeping Policy</label>
        <div className="space-y-3">
          {POLICY_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${
                policy === option.value
                  ? 'border-orange-500 bg-orange-50 shadow-sm'
                  : 'border-stone-200 hover:border-orange-200 hover:bg-stone-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="policy"
                  value={option.value}
                  checked={policy === option.value}
                  onChange={() => setPolicy(option.value)}
                  className="mt-1 w-4 h-4 text-orange-500 focus:ring-orange-400"
                />
                <div className="flex-1">
                  <p className="font-medium text-stone-800">{option.label}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{option.description}</p>
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Custom interval selector */}
      {policy === 'custom' && (
        <div className="space-y-2 animate-fade-in">
          <label className="text-sm font-medium text-stone-700">
            Full Service Interval
          </label>
          <select
            value={interval}
            onChange={(e) => setInterval(parseInt(e.target.value))}
            className="w-full px-4 py-3 border border-stone-200 rounded-xl bg-white text-stone-800 focus:ring-2 focus:ring-orange-500 outline-none"
          >
            {INTERVAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-stone-400">
            Full Service will be performed every {interval} nights of a stay
          </p>
        </div>
      )}

      {/* Schedule preview */}
      <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Preview Schedule</p>
        <div className="flex gap-2 flex-wrap">
          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">✨ Refresh</span>
          <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">🧺 Full Service</span>
          <span className="text-xs text-stone-400 flex items-center">—</span>
          <span className="px-3 py-1 bg-stone-200 text-stone-500 text-xs font-medium rounded-full">No Service (checkout day)</span>
        </div>
        <div className="mt-3 text-xs text-stone-500">
          {policy === 'standard' && '✨ Night 1-2, 🧺 Night 3, ✨ Night 4-5, 🧺 Night 6, ✨...'}
          {policy === 'daily_full_service' && '🧺 Every occupied night'}
          {policy === 'eco' && '✨ Night 1-2, 🧺 Night 3, ✨ Night 4-5, 🧺 Night 6, ✨...'}
          {policy === 'custom' && `✨ Nights ${interval-1}*, 🧺 Every ${interval} nights`}
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
      >
        {saving ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            Saving...
          </>
        ) : (
          '💾 Save Housekeeping Settings'
        )}
      </button>
    </div>
  );
}

export default HousekeepingSettings;
