// Housekeeping policy + service performance settings

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  fetchHousekeepingSettings,
  saveHousekeepingSettings,
  generateHousekeepingTasks,
} from '../services/housekeepingApi';
import {
  POLICY_OPTIONS,
  type HousekeepingPolicy,
  type HousekeepingSettings,
} from '../types/housekeeping';
import { t } from '../i18n';

function minutesFromSeconds(seconds: number): number {
  return Math.max(0, Math.round(seconds / 60));
}

export default function HousekeepingSettings() {
  const { getBusinessId } = useAuth();
  const navigate = useNavigate();
  const businessId = getBusinessId() || '';

  const [settings, setSettings] = useState<HousekeepingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      setSettings(await fetchHousekeepingSettings(businessId));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('housekeeping_settings_load_failed'));
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!settings || !businessId) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await saveHousekeepingSettings(businessId, settings);
      setSettings(saved);
      setMessage('Housekeeping settings saved.');
      await generateHousekeepingTasks({ businessId, regenerate: true });
      setMessage('Housekeeping settings saved and future tasks regenerated.');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('housekeeping_settings_save_failed'));
    } finally {
      setSaving(false);
    }
  };

  const updateMinutes = (field: 'refresh_target_seconds' | 'full_service_target_seconds' | 'warning_threshold_seconds', value: string) => {
    const minutes = Math.max(0, Number(value) || 0);
    setSettings((s) => s ? { ...s, [field]: minutes * 60 } : s);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <button type="button" onClick={() => navigate('/business/dashboard')} className="text-sm text-orange-600 hover:text-orange-700 mb-1">
            ← Back to dashboard
          </button>
          <h1 className="text-xl font-bold text-gray-900">{t('housekeeping_settings_title')}</h1>
          <p className="text-sm text-gray-500">{t('housekeeping_settings_subtitle')}</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {loading || !settings ? (
          <p className="text-center text-gray-400 text-sm py-12">{t('common_loading')}</p>
        ) : (
          <>
            {message && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">{message}</p>}
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}

            <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold text-gray-900">{t('housekeeping_settings_policy')}</h2>
              <div className="space-y-3">
                {POLICY_OPTIONS.map((opt) => (
                  <label key={opt.id} className={`flex gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${settings.policy === opt.id ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="policy" className="mt-1" checked={settings.policy === opt.id} onChange={() => setSettings((s) => s ? { ...s, policy: opt.id as HousekeepingPolicy } : s)} />
                    <div>
                      <p className="font-medium text-gray-900">{opt.icon} {t(`housekeeping_policy_${opt.id}` as any)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{t(`housekeeping_policy_${opt.id}_desc` as any)}</p>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            {settings.policy === 'custom' && (
              <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
                <h2 className="text-sm font-semibold text-gray-900">{t('housekeeping_settings_custom')}</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('housekeeping_settings_refresh_interval')}</label>
                    <input type="number" min={1} max={14} value={settings.custom_refresh_interval} onChange={(e) => setSettings((s) => s ? { ...s, custom_refresh_interval: Math.max(1, parseInt(e.target.value, 10) || 1) } : s)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('housekeeping_settings_full_interval')}</label>
                    <input type="number" min={1} max={14} value={settings.custom_full_interval} onChange={(e) => setSettings((s) => s ? { ...s, custom_full_interval: Math.max(1, parseInt(e.target.value, 10) || 1) } : s)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                  </div>
                </div>
              </section>
            )}

            <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Service Performance</h2>
                <p className="text-xs text-gray-500 mt-1">Targets are captured on each service session, so changing these values never changes historical performance.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <label className="block">
                  <span className="block text-xs text-gray-500 mb-1">Refresh target (minutes)</span>
                  <input type="number" min={1} max={240} value={minutesFromSeconds(settings.refresh_target_seconds)} onChange={(e) => updateMinutes('refresh_target_seconds', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                </label>
                <label className="block">
                  <span className="block text-xs text-gray-500 mb-1">Full Service target (minutes)</span>
                  <input type="number" min={1} max={240} value={minutesFromSeconds(settings.full_service_target_seconds)} onChange={(e) => updateMinutes('full_service_target_seconds', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                </label>
                <label className="block">
                  <span className="block text-xs text-gray-500 mb-1">Warning threshold (minutes)</span>
                  <input type="number" min={0} max={240} value={minutesFromSeconds(settings.warning_threshold_seconds)} onChange={(e) => updateMinutes('warning_threshold_seconds', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                </label>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-800">
                <input type="checkbox" checked={settings.warning_sound_enabled} onChange={(e) => setSettings((s) => s ? { ...s, warning_sound_enabled: e.target.checked } : s)} className="rounded border-gray-300 text-orange-500" />
                Warning sound enabled
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-800">
                <input type="checkbox" checked={settings.voice_warning_enabled} onChange={(e) => setSettings((s) => s ? { ...s, voice_warning_enabled: e.target.checked } : s)} className="rounded border-gray-300 text-orange-500" />
                Voice warning enabled
              </label>
            </section>

            <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={settings.allow_skip_refresh} onChange={(e) => setSettings((s) => s ? { ...s, allow_skip_refresh: e.target.checked } : s)} className="rounded border-gray-300 text-orange-500" />
                <span className="text-sm text-gray-800">{t('housekeeping_settings_allow_skip')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={settings.mandatory_checkout_fs} onChange={(e) => setSettings((s) => s ? { ...s, mandatory_checkout_fs: e.target.checked } : s)} className="rounded border-gray-300 text-orange-500" />
                <span className="text-sm text-gray-800">{t('housekeeping_settings_mandatory_fs')}</span>
              </label>
              <p className="text-[11px] text-gray-400">{t('housekeeping_settings_skip_note')}</p>
            </section>

            <div className="flex justify-end">
              <button type="button" onClick={save} disabled={saving} className="px-5 py-2.5 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50">
                {saving ? t('common_saving') : t('housekeeping_settings_save')}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
