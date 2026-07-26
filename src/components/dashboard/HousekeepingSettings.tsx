// src/components/dashboard/HousekeepingSettings.tsx
// ✅ COMPLETE: Housekeeping settings with full customization

import React, { useState } from 'react';
import { HousekeepingPolicy, HousekeepingConfig, DEFAULT_HOUSEKEEPING_CONFIG } from '../../services/housekeepingService';

interface HousekeepingSettingsProps {
  businessId: string;
  initialConfig?: Partial<HousekeepingConfig>;
  onSave: (config: HousekeepingConfig) => Promise<void>;
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
    description: 'Balanced service with customizable Full Service schedule'
  },
  {
    value: 'daily_full_service',
    label: 'Daily Full Service',
    description: 'Full Service every occupied night'
  },
  {
    value: 'eco',
    label: 'Eco Mode',
    description: 'Refresh daily, Full Service on custom interval'
  },
  {
    value: 'custom',
    label: 'Custom',
    description: 'Define your own Full Service interval'
  }
];

const FREQUENCY_OPTIONS = [
  { value: 2, label: 'Every 2 days (Luxury)' },
  { value: 3, label: 'Every 3 days (Recommended)' },
  { value: 4, label: 'Every 4 days' },
  { value: 5, label: 'Every 5 days (Economy)' }
];

const FIRST_SERVICE_OPTIONS = [
  { value: 2, label: 'Day 2 (Luxury)' },
  { value: 3, label: 'Day 3 (Recommended)' },
  { value: 4, label: 'Day 4' },
  { value: 5, label: 'Day 5' }
];

const MIN_NIGHTS_OPTIONS = [
  { value: 2, label: '2 nights (Luxury)' },
  { value: 3, label: '3 nights (Recommended)' },
  { value: 4, label: '4 nights' },
  { value: 5, label: '5 nights (Economy)' }
];

const CHECKIN_SERVICE_OPTIONS = [
  { value: 'none', label: 'No Service (Recommended)' },
  { value: 'refresh', label: '✨ Refresh' },
  { value: 'full_service', label: '🧺 Full Service' }
];

const INTERVAL_OPTIONS = [
  { value: 2, label: 'Every 2 nights' },
  { value: 3, label: 'Every 3 nights' },
  { value: 4, label: 'Every 4 nights' },
  { value: 5, label: 'Every 5 nights' }
];

export function HousekeepingSettings({
  businessId,
  initialConfig = {},
  onSave,
  saving = false
}: HousekeepingSettingsProps) {
  const [config, setConfig] = useState<HousekeepingConfig>({
    ...DEFAULT_HOUSEKEEPING_CONFIG,
    ...initialConfig
  });

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewNights, setPreviewNights] = useState<number>(7);

  const calculateFullServiceNightsPreview = (totalNights: number, cfg: HousekeepingConfig): number[] => {
    if (totalNights < cfg.minNightsBeforeFullService) {
      return [];
    }

    const nights: number[] = [];
    const { fullServiceFrequency, firstFullServiceDay } = cfg;

    if (firstFullServiceDay <= totalNights) {
      nights.push(firstFullServiceDay);
    }

    let next = firstFullServiceDay + fullServiceFrequency;
    while (next < totalNights) {
      nights.push(next);
      next += fullServiceFrequency;
    }

    return nights;
  };

  const generatePreview = () => {
    const preview: { night: number; task: string; icon: string }[] = [];

    preview.push({
      night: 1,
      task: config.checkinDayService === 'none' ? 'No Service' :
            config.checkinDayService === 'refresh' ? 'Refresh' : 'Full Service',
      icon: config.checkinDayService === 'none' ? '—' :
            config.checkinDayService === 'refresh' ? '✨' : '🧺'
    });

    for (let night = 2; night <= previewNights; night++) {
      const isLastNight = night === previewNights;
      let task = 'Refresh';
      let icon = '✨';

      if (config.policy === 'daily_full_service') {
        task = 'Full Service';
        icon = '🧺';
      } else if (config.policy === 'eco') {
        if (night % config.customInterval === 0) {
          task = 'Full Service';
          icon = '🧺';
        } else {
          task = 'Refresh';
          icon = '✨';
        }
      } else if (config.policy === 'custom') {
        if (night % config.customInterval === 0) {
          task = 'Full Service';
          icon = '🧺';
        } else {
          task = 'Refresh';
          icon = '✨';
        }
      } else {
        if (isLastNight && !config.refreshOnLastNight) {
          task = 'No Service';
          icon = '—';
        } else {
          const fullServiceNights = calculateFullServiceNightsPreview(previewNights, config);
          if (fullServiceNights.includes(night)) {
            task = 'Full Service';
            icon = '🧺';
          } else {
            task = 'Refresh';
            icon = '✨';
          }
        }
      }

      preview.push({ night, task, icon });
    }

    preview.push({
      night: previewNights,
      task: 'Full Service (Checkout)',
      icon: '🧺'
    });

    return preview;
  };

  const previewSchedule = generatePreview();

  const handleSave = async () => {
    setError(null);
    setSuccess(false);

    try {
      await onSave(config);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    }
  };

  const updateConfig = <K extends keyof HousekeepingConfig>(key: K, value: HousekeepingConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
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

      <div className="space-y-3">
        <label className="text-sm font-medium text-stone-700">Housekeeping Policy</label>
        <div className="space-y-3">
          {POLICY_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${
                config.policy === option.value
                  ? 'border-orange-500 bg-orange-50 shadow-sm'
                  : 'border-stone-200 hover:border-orange-200 hover:bg-stone-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="policy"
                  value={option.value}
                  checked={config.policy === option.value}
                  onChange={() => updateConfig('policy', option.value)}
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

      {(config.policy === 'eco' || config.policy === 'custom') && (
        <div className="space-y-2 animate-fade-in">
          <label className="text-sm font-medium text-stone-700">
            Full Service Interval
          </label>
          <select
            value={config.customInterval}
            onChange={(e) => updateConfig('customInterval', parseInt(e.target.value))}
            className="w-full px-4 py-3 border border-stone-200 rounded-xl bg-white text-stone-800 focus:ring-2 focus:ring-orange-500 outline-none"
          >
            {INTERVAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-stone-400">
            Full Service will be performed every {config.customInterval} nights of a stay
          </p>
        </div>
      )}

      {config.policy === 'standard' && (
        <div className="space-y-4 animate-fade-in border-t border-stone-200 pt-4">
          <p className="text-sm font-semibold text-stone-800">Full Service Schedule</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                First Full Service Day
              </label>
              <select
                value={config.firstFullServiceDay}
                onChange={(e) => updateConfig('firstFullServiceDay', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
              >
                {FIRST_SERVICE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Full Service Frequency
              </label>
              <select
                value={config.fullServiceFrequency}
                onChange={(e) => updateConfig('fullServiceFrequency', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
              >
                {FREQUENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Minimum Nights Before Full Service
              </label>
              <select
                value={config.minNightsBeforeFullService}
                onChange={(e) => updateConfig('minNightsBeforeFullService', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
              >
                {MIN_NIGHTS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Last Night Service
              </label>
              <select
                value={config.refreshOnLastNight ? 'refresh' : 'none'}
                onChange={(e) => updateConfig('refreshOnLastNight', e.target.value === 'refresh')}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
              >
                <option value="refresh">✨ Refresh</option>
                <option value="none">No Service</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">
              Check-in Day Service
            </label>
            <select
              value={config.checkinDayService}
              onChange={(e) => updateConfig('checkinDayService', e.target.value as any)}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
            >
              {CHECKIN_SERVICE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Schedule Preview</p>
          <div className="flex items-center gap-2">
            <label className="text-xs text-stone-500">Stay Length:</label>
            <select
              value={previewNights}
              onChange={(e) => setPreviewNights(parseInt(e.target.value))}
              className="px-2 py-1 border border-stone-200 rounded text-xs bg-white"
            >
              {[3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <option key={n} value={n}>{n} nights</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {previewSchedule.map((item, index) => (
            <div
              key={index}
              className={`px-2.5 py-1 rounded-md text-[10px] font-medium ${
                item.icon === '🧺' ? 'bg-amber-100 text-amber-800' :
                item.icon === '✨' ? 'bg-blue-100 text-blue-800' :
                'bg-stone-100 text-stone-400'
              }`}
              title={`Night ${item.night}: ${item.task}`}
            >
              {item.icon} {item.night}
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-stone-500">
          <span className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">✨ Refresh</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">🧺 Full Service</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 bg-stone-100 text-stone-400 rounded">— No Service</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded">🧺 Checkout</span>
          </span>
        </div>
      </div>

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
