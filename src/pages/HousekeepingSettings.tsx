// Housekeeping policy + service performance settings

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { fetchHousekeepingSettings, saveHousekeepingSettings, generateHousekeepingTasks, fetchHousekeepingServiceSettings, saveHousekeepingServiceSettings, fetchHousekeepingServiceTargets, saveHousekeepingServiceTarget } from '../services/housekeepingApi';
import { POLICY_OPTIONS, DEFAULT_HOUSEKEEPING_SETTINGS, type HousekeepingPolicy, type HousekeepingSettings } from '../types/housekeeping';
import type { HousekeepingServiceSettings, HousekeepingServiceTarget, HousekeepingServiceType } from '../types/housekeepingServicePerformance';
import { t } from '../i18n';

const SERVICE_LABELS: Record<HousekeepingServiceType, string> = { refresh: 'Refresh', full_service: 'Full Service', deep_cleaning: 'Deep Cleaning', mattress_flip_air: 'Mattress Flip & Air', checkout_inspection: 'Guest Check-Out Inspection' };
const SERVICE_DEFAULTS: Record<HousekeepingServiceType, number> = { refresh: 45, full_service: 60, deep_cleaning: 120, mattress_flip_air: 30, checkout_inspection: 10 };
const SERVICE_TYPES = Object.keys(SERVICE_LABELS) as HousekeepingServiceType[];

const POLICY_PLANIFICATION: Record<HousekeepingPolicy, string> = {
  eco: 'Rafraîchissement privilégié · Service complet uniquement lorsque nécessaire · Service complet au maximum tous les 5 jours.',
  standard: 'Rafraîchissement entre les services complets · Service complet aux points médians significatifs · Service complet au maximum tous les 3 jours.',
  premium: 'Service complet chaque jour d’occupation · Service complet obligatoire au départ.',
  custom: 'Vos intervalles de rafraîchissement et de service complet déterminent la planification.',
};

function findTarget(targets: HousekeepingServiceTarget[], serviceType: HousekeepingServiceType, roomType?: string | null) {
  const normalized = roomType?.trim().toLowerCase() || null;
  return targets.find((row) => row.service_type === serviceType && (row.room_type?.trim().toLowerCase() || null) === normalized);
}

export default function HousekeepingSettings() {
  const { getBusinessId } = useAuth();
  const navigate = useNavigate();
  const businessId = getBusinessId() || '';
  const [settings, setSettings] = useState<HousekeepingSettings | null>(null);
  const [serviceSettings, setServiceSettings] = useState<HousekeepingServiceSettings | null>(null);
  const [targets, setTargets] = useState<HousekeepingServiceTarget[]>([]);
  const [newRoomType, setNewRoomType] = useState('');
  const [customEditing, setCustomEditing] = useState(false);
  const [customDraft, setCustomDraft] = useState<Pick<HousekeepingSettings, 'custom_refresh_interval' | 'custom_full_interval'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true); setError(null);
    try {
      const results = await Promise.allSettled([
        fetchHousekeepingSettings(businessId),
        fetchHousekeepingServiceSettings(businessId),
        fetchHousekeepingServiceTargets(businessId),
      ]);
      const [policyR, serviceR, targetsR] = results;
      if (policyR.status === 'fulfilled') {
        const loaded = policyR.value;
        const validPolicy = POLICY_OPTIONS.some((opt) => opt.id === loaded.policy);
        setSettings(validPolicy ? loaded : { ...loaded, policy: DEFAULT_HOUSEKEEPING_SETTINGS.policy });
        setCustomEditing(false);
        setCustomDraft(null);
      } else {
        throw policyR.reason instanceof Error ? policyR.reason : new Error(t('housekeeping_settings_load_failed'));
      }
      if (serviceR.status === 'fulfilled') {
        setServiceSettings(serviceR.value);
      } else {
        setServiceSettings({ business_id: businessId, warning_minutes: 15, final_countdown_seconds: 5, voice_enabled: true, sound_enabled: true, allow_pause: false });
      }
      if (targetsR.status === 'fulfilled') {
        setTargets(targetsR.value);
      } else {
        setTargets([]);
      }
      const serviceErr = serviceR.status === 'rejected' ? serviceR.reason : null;
      const targetsErr = targetsR.status === 'rejected' ? targetsR.reason : null;
      if (serviceErr || targetsErr) {
        const msg = [serviceErr, targetsErr]
          .filter(Boolean)
          .map((e) => (e instanceof Error ? e.message : String(e)))
          .join(' · ');
        setError(msg || t('housekeeping_settings_load_failed'));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('housekeeping_settings_load_failed'));
    } finally {
      setLoading(false);
    }
  }, [businessId]);
  useEffect(() => { void load(); }, [load]);

  const roomTypes = useMemo(() => {
    const values = new Map<string, string>();
    targets.filter((row) => row.room_type?.trim()).forEach((row) => { const value = row.room_type!.trim(); values.set(value.toLowerCase(), value); });
    return [...values.values()].sort((a, b) => a.localeCompare(b));
  }, [targets]);

  const updateTarget = (serviceType: HousekeepingServiceType, value: string, roomType?: string | null) => {
    const minutes = Math.max(1, Number(value) || 1);
    const normalized = roomType?.trim() || null;
    setTargets((current) => {
      const existing = findTarget(current, serviceType, normalized);
      if (existing) return current.map((row) => row.id === existing.id ? { ...row, target_minutes: minutes, active: true, room_type: normalized } : row);
      return [...current, { business_id: businessId, service_type: serviceType, room_type: normalized, target_minutes: minutes, active: true }];
    });
  };

  const addRoomType = () => {
    const roomType = newRoomType.trim();
    if (!roomType || roomTypes.some((value) => value.toLowerCase() === roomType.toLowerCase())) { setNewRoomType(''); return; }
    setTargets((current) => [...current, ...SERVICE_TYPES.map((serviceType) => ({ business_id: businessId, service_type: serviceType, room_type: roomType, target_minutes: findTarget(current, serviceType, null)?.target_minutes ?? SERVICE_DEFAULTS[serviceType], active: true }))]);
    setNewRoomType('');
  };

  const removeRoomType = (roomType: string) => {
    const normalized = roomType.trim().toLowerCase();
    setTargets((current) => current.filter((row) => (row.room_type?.trim().toLowerCase() || '') !== normalized));
  };

  const selectPolicy = (policy: HousekeepingPolicy) => {
    setSettings((current) => current ? { ...current, policy } : current);
    setCustomEditing(false);
    setCustomDraft(null);
  };

  const beginCustomEdit = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!settings) return;
    if (settings.policy !== 'custom') {
      setSettings((current) => current ? { ...current, policy: 'custom' } : current);
    }
    setCustomDraft({ custom_refresh_interval: settings.custom_refresh_interval, custom_full_interval: settings.custom_full_interval });
    setCustomEditing(true);
  };

  const cancelCustomEdit = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (customDraft) {
      setSettings((current) => current ? { ...current, ...customDraft } : current);
    }
    setCustomEditing(false);
    setCustomDraft(null);
  };

  const saveCustomEdit = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setCustomEditing(false);
    setCustomDraft(null);
  };

  const save = async () => {
    if (!settings || !serviceSettings || !businessId) return;
    setSaving(true); setError(null); setMessage(null);
    try {
      await saveHousekeepingSettings(businessId, settings);
      await saveHousekeepingServiceSettings(businessId, serviceSettings);
      await Promise.all(targets.map((row) => saveHousekeepingServiceTarget(businessId, { service_type: row.service_type, room_type: row.room_type || null, target_minutes: row.target_minutes, active: row.active })));
      await generateHousekeepingTasks({ businessId, regenerate: true });
      setMessage(t('housekeeping_settings_saved_regen'));
      setCustomEditing(false);
      setCustomDraft(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('housekeeping_settings_save_failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <button type="button" onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-800">{t('common_back')}</button>
            <h1 className="text-xl font-bold text-gray-900 mt-1">{t('housekeeping_settings_title')}</h1>
            <p className="text-sm text-gray-500">{t('housekeeping_settings_subtitle')}</p>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {loading && <div className="py-12 text-center text-sm text-gray-400">{t('common_loading')}</div>}
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {message && <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{message}</div>}
        {settings && serviceSettings && !loading && <>
          <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">{t('housekeeping_settings_policy')}</h2>
              <p className="text-xs text-gray-500 mt-1">Sélectionnez la politique qui détermine automatiquement le type et la fréquence des services de ménage.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3" role="radiogroup" aria-label={t('housekeeping_settings_policy')}>
              {POLICY_OPTIONS.map((opt) => {
                const selected = settings.policy === opt.id;
                return (
                  <div
                    key={opt.id}
                    role="radio"
                    aria-checked={selected}
                    tabIndex={0}
                    onClick={() => selectPolicy(opt.id)}
                    onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectPolicy(opt.id); } }}
                    className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-orange-300 ${selected ? 'border-orange-500 bg-orange-50 shadow-sm' : 'border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50/40'}`}
                  >
                    <div className={`absolute top-3 right-3 h-6 w-6 rounded-full flex items-center justify-center text-sm font-bold ${selected ? 'bg-orange-500 text-white' : 'bg-transparent text-transparent border border-gray-300'}`} aria-hidden="true">{selected ? '✓' : ''}</div>
                    <div className="pr-8 font-semibold text-sm text-gray-900">{opt.icon} {t(`housekeeping_policy_${opt.id}` as any)}</div>
                    <div className="text-xs text-gray-600 mt-2 leading-5">{t(`housekeeping_policy_${opt.id}_desc` as any)}</div>
                    <div className="mt-3 pt-3 border-t border-gray-200/80">
                      <span className="font-semibold text-xs text-gray-800">Planification :</span>
                      <span className="text-xs text-gray-600 ml-1">
                        {opt.id === 'custom'
                          ? `Rafraîchissement tous les ${settings.custom_refresh_interval} jours · Service complet tous les ${settings.custom_full_interval} jours.`
                          : POLICY_PLANIFICATION[opt.id]}
                      </span>
                    </div>
                    {opt.id === 'custom' && (
                      <div className="mt-3 pt-3 border-t border-gray-200/80" onClick={(event) => event.stopPropagation()}>
                        {!customEditing ? (
                          <div className="flex items-center justify-between gap-3">
                            {selected && <span className="text-xs font-semibold text-orange-700">✓ Sélectionné</span>}
                            <button
                              type="button"
                              onClick={beginCustomEdit}
                              className="ml-auto px-3 py-1.5 text-xs font-semibold rounded-lg border border-orange-300 text-orange-700 bg-white hover:bg-orange-50"
                            >
                              Modifier
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div>
                              <h3 className="text-sm font-semibold text-gray-900">{t('housekeeping_settings_custom')}</h3>
                              <p className="text-xs text-gray-600 mt-1">Définissez les intervalles utilisés pour planifier les rafraîchissements et les services complets.</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <label className="block text-sm text-gray-700">
                                <span className="block text-xs font-medium text-gray-600 mb-1">{t('housekeeping_settings_refresh_interval')}</span>
                                <div className="flex items-center gap-2">
                                  <input type="number" min={1} max={14} value={settings.custom_refresh_interval} onChange={(e) => setSettings((s) => s ? { ...s, custom_refresh_interval: Math.max(1, Math.min(14, parseInt(e.target.value, 10) || 1)) } : s)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white" />
                                  <span className="text-xs text-gray-500 whitespace-nowrap">jours</span>
                                </div>
                              </label>
                              <label className="block text-sm text-gray-700">
                                <span className="block text-xs font-medium text-gray-600 mb-1">{t('housekeeping_settings_full_interval')}</span>
                                <div className="flex items-center gap-2">
                                  <input type="number" min={1} max={14} value={settings.custom_full_interval} onChange={(e) => setSettings((s) => s ? { ...s, custom_full_interval: Math.max(1, Math.min(14, parseInt(e.target.value, 10) || 1)) } : s)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white" />
                                  <span className="text-xs text-gray-500 whitespace-nowrap">jours</span>
                                </div>
                              </label>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                              <button
                                type="button"
                                onClick={cancelCustomEdit}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                              >
                                Annuler
                              </button>
                              <button
                                type="button"
                                onClick={saveCustomEdit}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-orange-500 bg-orange-500 text-white hover:bg-orange-600"
                              >
                                Enregistrer
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
          <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">2. Service timer defaults</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="text-sm text-gray-700">Warning (minutes)
                <input type="number" min={0} max={120} value={serviceSettings.warning_minutes} onChange={(e) => setServiceSettings((s) => s ? { ...s, warning_minutes: Math.max(0, Number(e.target.value) || 0) } : s)} className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </label>
              <label className="text-sm text-gray-700">Final countdown (seconds)
                <input type="number" min={1} max={60} value={serviceSettings.final_countdown_seconds} onChange={(e) => setServiceSettings((s) => s ? { ...s, final_countdown_seconds: Math.max(1, Math.min(60, Number(e.target.value) || 5)) } : s)} className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </label>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={serviceSettings.voice_enabled} onChange={(e) => setServiceSettings((s) => s ? { ...s, voice_enabled: e.target.checked } : s)} className="rounded border-gray-300 text-orange-500" /><span className="text-sm text-gray-800">Voice prompts</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={serviceSettings.sound_enabled} onChange={(e) => setServiceSettings((s) => s ? { ...s, sound_enabled: e.target.checked } : s)} className="rounded border-gray-300 text-orange-500" /><span className="text-sm text-gray-800">Sound</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={serviceSettings.allow_pause} onChange={(e) => setServiceSettings((s) => s ? { ...s, allow_pause: e.target.checked } : s)} className="rounded border-gray-300 text-orange-500" /><span className="text-sm text-gray-800">Allow pause</span></label>
            </div>
          </section>
          <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">3. Target durations (minutes)</h2>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr><th className="text-left px-3 py-2">Service</th><th className="text-left px-3 py-2">Default minutes</th></tr></thead>
                <tbody>{SERVICE_TYPES.map((serviceType) => {
                  const target = findTarget(targets, serviceType, null);
                  return <tr key={serviceType} className="border-t border-gray-100"><td className="px-3 py-2 font-medium">{SERVICE_LABELS[serviceType]}</td><td className="px-3 py-2"><input type="number" min={1} max={1440} value={target?.target_minutes ?? SERVICE_DEFAULTS[serviceType]} onChange={(e) => updateTarget(serviceType, e.target.value, null)} className="w-28 px-2 py-1.5 text-sm border border-gray-300 rounded" /></td></tr>;
                })}</tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-sm text-gray-700">Add room-type override
                <input value={newRoomType} onChange={(e) => setNewRoomType(e.target.value)} placeholder="e.g. Suite" className="mt-1 block w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </label>
              <button type="button" onClick={addRoomType} className="px-3 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-900">Add</button>
            </div>
            {roomTypes.length === 0 ? <p className="text-xs text-gray-500">No room-type overrides. Defaults apply to all rooms.</p> : <div className="overflow-x-auto rounded-lg border border-gray-200"><table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="text-left px-3 py-2">Type</th>{SERVICE_TYPES.map((serviceType) => <th key={serviceType} className="text-left px-3 py-2 whitespace-nowrap">{SERVICE_LABELS[serviceType]}</th>)}<th /></tr></thead><tbody>{roomTypes.map((roomType) => <tr key={roomType} className="border-t border-gray-100"><td className="px-3 py-2 font-medium whitespace-nowrap">{roomType}</td>{SERVICE_TYPES.map((serviceType) => { const target = findTarget(targets, serviceType, roomType); return <td key={serviceType} className="px-2 py-2"><input type="number" min={1} max={1440} value={target?.target_minutes ?? findTarget(targets, serviceType, null)?.target_minutes ?? SERVICE_DEFAULTS[serviceType]} onChange={(e) => updateTarget(serviceType, e.target.value, roomType)} className="w-24 px-2 py-1.5 text-xs border border-gray-300 rounded" /></td>; })}<td className="px-3 py-2 text-right"><button type="button" onClick={() => removeRoomType(roomType)} className="text-xs text-red-600 hover:text-red-700">Supprimer</button></td></tr>)}</tbody></table></div>}
          </section>
          <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3"><h2 className="text-sm font-semibold text-gray-900">4. Règles opérationnelles</h2><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={settings.allow_skip_refresh} onChange={(e) => setSettings((s) => s ? { ...s, allow_skip_refresh: e.target.checked } : s)} className="rounded border-gray-300 text-orange-500" /><span className="text-sm text-gray-800">Autoriser le skip d'un Refresh</span></label><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={settings.mandatory_checkout_fs} onChange={(e) => setSettings((s) => s ? { ...s, mandatory_checkout_fs: e.target.checked } : s)} className="rounded border-gray-300 text-orange-500" /><span className="text-sm text-gray-800">Full Service obligatoire au checkout</span></label></section>
          <div className="sticky bottom-4 flex justify-end"><button type="button" onClick={() => void save()} disabled={saving} className="px-6 py-3 text-sm font-bold text-white bg-orange-500 rounded-lg shadow-lg hover:bg-orange-600 disabled:opacity-50">{saving ? t('common_saving') : t('housekeeping_settings_save')}</button></div>
        </>}
      </main>
    </div>
  );
}
