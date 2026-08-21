// Housekeeping policy + service performance settings

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  fetchHousekeepingSettings,
  saveHousekeepingSettings,
  generateHousekeepingTasks,
  fetchHousekeepingServiceSettings,
  saveHousekeepingServiceSettings,
  fetchHousekeepingServiceTargets,
  saveHousekeepingServiceTarget,
} from '../services/housekeepingApi';
import {
  POLICY_OPTIONS,
  type HousekeepingPolicy,
  type HousekeepingSettings,
} from '../types/housekeeping';
import type { HousekeepingServiceSettings, HousekeepingServiceTarget, HousekeepingServiceType } from '../types/housekeepingServicePerformance';
import { t } from '../i18n';

const SERVICE_LABELS: Record<HousekeepingServiceType, string> = {
  refresh: 'Refresh',
  full_service: 'Full Service',
  deep_cleaning: 'Deep Cleaning',
  mattress_flip_air: 'Mattress Flip & Air',
  checkout_inspection: 'Guest Check-Out Inspection',
};

export default function HousekeepingSettings() {
  const { getBusinessId } = useAuth();
  const navigate = useNavigate();
  const businessId = getBusinessId() || '';
  const [settings, setSettings] = useState<HousekeepingSettings | null>(null);
  const [serviceSettings, setServiceSettings] = useState<HousekeepingServiceSettings | null>(null);
  const [targets, setTargets] = useState<HousekeepingServiceTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    setError(null);
    try {
      const [policy, service, targetRows] = await Promise.all([
        fetchHousekeepingSettings(businessId),
        fetchHousekeepingServiceSettings(businessId),
        fetchHousekeepingServiceTargets(businessId),
      ]);
      setSettings(policy);
      setServiceSettings(service);
      setTargets(targetRows);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('housekeeping_settings_load_failed'));
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (!settings || !serviceSettings || !businessId) return;
    setSaving(true);
    setError(null);
    try {
      await saveHousekeepingSettings(businessId, settings);
      await saveHousekeepingServiceSettings(businessId, serviceSettings);
      await Promise.all(
        targets.filter((target) => !target.room_type).map((target) =>
          saveHousekeepingServiceTarget(businessId, {
            service_type: target.service_type,
            room_type: null,
            target_minutes: target.target_minutes,
            active: target.active,
          })
        )
      );
      await generateHousekeepingTasks({ businessId, regenerate: true });
      setMessage('Housekeeping settings saved and future tasks regenerated.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('housekeeping_settings_save_failed'));
    } finally {
      setSaving(false);
    }
  };

  const updateTarget = (serviceType: HousekeepingServiceType, value: string) => {
    const minutes = Math.max(1, Number(value) || 1);
    setTargets((current) => {
      const existing = current.find((target) => target.service_type === serviceType && !target.room_type);
      if (existing) return current.map((target) => target.id === existing.id ? { ...target, target_minutes: minutes } : target);
      return [...current, { business_id: businessId, service_type: serviceType, room_type: null, target_minutes: minutes, active: true }];
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <button type="button" onClick={() => navigate('/business/dashboard')} className="text-sm text-orange-600 hover:text-orange-700 mb-1">← Back to dashboard</button>
          <h1 className="text-xl font-bold text-gray-900">{t('housekeeping_settings_title')}</h1>
          <p className="text-sm text-gray-500">{t('housekeeping_settings_subtitle')}</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {loading || !settings || !serviceSettings ? (
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
                    <div><p className="font-medium text-gray-900">{opt.icon} {t(`housekeeping_policy_${opt.id}` as any)}</p><p className="text-xs text-gray-500 mt-0.5">{t(`housekeeping_policy_${opt.id}_desc` as any)}</p></div>
                  </label>
                ))}
              </div>
            </section>

            {settings.policy === 'custom' && (
              <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
                <h2 className="text-sm font-semibold text-gray-900">{t('housekeeping_settings_custom')}</h2>
                <div className="grid grid-cols-2 gap-4">
                  <label><span className="block text-xs text-gray-500 mb-1">{t('housekeeping_settings_refresh_interval')}</span><input type="number" min={1} max={14} value={settings.custom_refresh_interval} onChange={(e) => setSettings((s) => s ? { ...s, custom_refresh_interval: Math.max(1, parseInt(e.target.value, 10) || 1) } : s)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" /></label>
                  <label><span className="block text-xs text-gray-500 mb-1">{t('housekeeping_settings_full_interval')}</span><input type="number" min={1} max={14} value={settings.custom_full_interval} onChange={(e) => setSettings((s) => s ? { ...s, custom_full_interval: Math.max(1, parseInt(e.target.value, 10) || 1) } : s)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" /></label>
                </div>
              </section>
            )}

            <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
              <div><h2 className="text-sm font-semibold text-gray-900">Service Performance</h2><p className="text-xs text-gray-500 mt-1">Targets are snapshotted when a service starts. Historical timings are never rewritten by later changes.</p></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(Object.keys(SERVICE_LABELS) as HousekeepingServiceType[]).map((serviceType) => {
                  const target = targets.find((row) => row.service_type === serviceType && !row.room_type);
                  return <label key={serviceType}><span className="block text-xs text-gray-500 mb-1">{SERVICE_LABELS[serviceType]} target (minutes)</span><input type="number" min={1} max={1440} value={target?.target_minutes ?? 1} onChange={(e) => updateTarget(serviceType, e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" /></label>;
                })}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <label><span className="block text-xs text-gray-500 mb-1">Warning threshold (minutes)</span><input type="number" min={0} max={240} value={serviceSettings.warning_minutes} onChange={(e) => setServiceSettings((s) => s ? { ...s, warning_minutes: Math.max(0, Number(e.target.value) || 0) } : s)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" /></label>
                <label><span className="block text-xs text-gray-500 mb-1">Final countdown (seconds)</span><input type="number" min={1} max={60} value={serviceSettings.final_countdown_seconds} onChange={(e) => setServiceSettings((s) => s ? { ...s, final_countdown_seconds: Math.max(1, Number(e.target.value) || 1) } : s)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" /></label>
                <div className="space-y-2 pt-5"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={serviceSettings.sound_enabled} onChange={(e) => setServiceSettings((s) => s ? { ...s, sound_enabled: e.target.checked } : s)} /> Warning sound</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={serviceSettings.voice_enabled} onChange={(e) => setServiceSettings((s) => s ? { ...s, voice_enabled: e.target.checked } : s)} /> Voice warning</label></div>
              </div>
              <p className="text-[11px] text-gray-400">Room-type overrides are supported by the service target model and can be added without changing the timer engine.</p>
            </section>

            <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={settings.allow_skip_refresh} onChange={(e) => setSettings((s) => s ? { ...s, allow_skip_refresh: e.target.checked } : s)} className="rounded border-gray-300 text-orange-500" /><span className="text-sm text-gray-800">{t('housekeeping_settings_allow_skip')}</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={settings.mandatory_checkout_fs} onChange={(e) => setSettings((s) => s ? { ...s, mandatory_checkout_fs: e.target.checked } : s)} className="rounded border-gray-300 text-orange-500" /><span className="text-sm text-gray-800">{t('housekeeping_settings_mandatory_fs')}</span></label>
              <p className="text-[11px] text-gray-400">{t('housekeeping_settings_skip_note')}</p>
            </section>

            <div className="flex justify-end"><button type="button" onClick={() => void save()} disabled={saving} className="px-5 py-2.5 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50">{saving ? t('common_saving') : t('housekeeping_settings_save')}</button></div>
          </>
        )}
      </main>
    </div>
  );
}
