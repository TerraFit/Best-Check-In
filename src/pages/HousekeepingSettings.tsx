// Housekeeping policy + service performance settings

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { fetchHousekeepingSettings, saveHousekeepingSettings, generateHousekeepingTasks, fetchHousekeepingServiceSettings, saveHousekeepingServiceSettings, fetchHousekeepingServiceTargets, saveHousekeepingServiceTarget } from '../services/housekeepingApi';
import { POLICY_OPTIONS, type HousekeepingPolicy, type HousekeepingSettings } from '../types/housekeeping';
import type { HousekeepingServiceSettings, HousekeepingServiceTarget, HousekeepingServiceType } from '../types/housekeepingServicePerformance';
import { t } from '../i18n';

const SERVICE_LABELS: Record<HousekeepingServiceType, string> = { refresh: 'Refresh', full_service: 'Full Service', deep_cleaning: 'Deep Cleaning', mattress_flip_air: 'Mattress Flip & Air', checkout_inspection: 'Guest Check-Out Inspection' };
const SERVICE_DEFAULTS: Record<HousekeepingServiceType, number> = { refresh: 45, full_service: 60, deep_cleaning: 120, mattress_flip_air: 30, checkout_inspection: 10 };
const SERVICE_TYPES = Object.keys(SERVICE_LABELS) as HousekeepingServiceType[];

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true); setError(null);
    try {
      const [policy, service, targetRows] = await Promise.all([fetchHousekeepingSettings(businessId), fetchHousekeepingServiceSettings(businessId), fetchHousekeepingServiceTargets(businessId)]);
      setSettings(policy); setServiceSettings(service); setTargets(targetRows);
    } catch (e) { setError(e instanceof Error ? e.message : t('housekeeping_settings_load_failed')); }
    finally { setLoading(false); }
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

  const save = async () => {
    if (!settings || !serviceSettings || !businessId) return;
    setSaving(true); setError(null); setMessage(null);
    try {
      await saveHousekeepingSettings(businessId, settings);
      await saveHousekeepingServiceSettings(businessId, serviceSettings);
      await Promise.all(targets.map((row) => saveHousekeepingServiceTarget(businessId, { service_type: row.service_type, room_type: row.room_type || null, target_minutes: row.target_minutes, active: row.active })));
      await generateHousekeepingTasks({ businessId, regenerate: true });
      setMessage('Housekeeping settings saved. Future tasks were regenerated using the selected policy.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : t('housekeeping_settings_save_failed')); }
    finally { setSaving(false); }
  };

  return <div className="min-h-screen bg-gray-50">
    <header className="bg-white border-b border-gray-200"><div className="max-w-5xl mx-auto px-4 py-4"><button type="button" onClick={() => navigate('/business/dashboard?tab=housekeeping')} className="text-sm text-orange-600 hover:text-orange-700 mb-1">← {t('housekeeping_title')}</button><h1 className="text-xl font-bold text-gray-900">{t('housekeeping_settings_title')}</h1><p className="text-sm text-gray-500">{t('housekeeping_settings_subtitle')}</p></div></header>
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {loading || !settings || !serviceSettings ? <p className="text-center text-gray-400 text-sm py-12">{t('common_loading')}</p> : <>
        {message && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">{message}</p>}{error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}
        <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
          <div><h2 className="text-sm font-semibold text-gray-900">1. Planning des services</h2><p className="text-xs text-gray-500 mt-1">La planification est calculée à partir de la durée réelle du séjour. Le choix détermine la fréquence du Full Service; les autres jours restent en Refresh.</p></div>
          <div className="space-y-3">{POLICY_OPTIONS.map((opt) => <label key={opt.id} className={`flex gap-3 p-4 rounded-xl border cursor-pointer ${settings.policy === opt.id ? 'border-orange-400 bg-orange-50' : 'border-gray-200'}`}><input type="radio" name="policy" className="mt-1" checked={settings.policy === opt.id} onChange={() => setSettings((s) => s ? { ...s, policy: opt.id as HousekeepingPolicy } : s)} /><div><p className="font-medium text-gray-900">{opt.icon} {t(`housekeeping_policy_${opt.id}` as any)}</p><p className="text-xs text-gray-500 mt-0.5">{t(`housekeeping_policy_${opt.id}_desc` as any)}</p></div></label>)}</div>
          {settings.policy === 'custom' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><label><span className="block text-xs text-gray-500 mb-1">{t('housekeeping_settings_refresh_interval')}</span><input type="number" min={1} max={14} value={settings.custom_refresh_interval} onChange={(e) => setSettings((s) => s ? { ...s, custom_refresh_interval: Math.max(1, parseInt(e.target.value, 10) || 1) } : s)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" /></label><label><span className="block text-xs text-gray-500 mb-1">{t('housekeeping_settings_full_interval')}</span><input type="number" min={1} max={14} value={settings.custom_full_interval} onChange={(e) => setSettings((s) => s ? { ...s, custom_full_interval: Math.max(1, parseInt(e.target.value, 10) || 1) } : s)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" /></label></div>}
          <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800"><strong>Important:</strong> enregistrer la politique régénère les tâches futures ouvertes. Les tâches historiques et terminées ne sont pas réécrites.</div>
        </section>
        <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
          <div><h2 className="text-sm font-semibold text-gray-900">2. Temps cible & performance</h2><p className="text-xs text-gray-500 mt-1">Chaque service capture son temps cible au démarrage; les performances historiques restent inchangées.</p></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{SERVICE_TYPES.map((serviceType) => { const target = findTarget(targets, serviceType, null); return <label key={serviceType}><span className="block text-xs text-gray-500 mb-1">{SERVICE_LABELS[serviceType]}</span><div className="flex items-center gap-2"><input type="number" min={1} max={1440} value={target?.target_minutes ?? SERVICE_DEFAULTS[serviceType]} onChange={(e) => updateTarget(serviceType, e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" /><span className="text-xs text-gray-400">min</span></div></label>; })}</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><label><span className="block text-xs text-gray-500 mb-1">Avertissement avant cible</span><input type="number" min={0} max={240} value={serviceSettings.warning_minutes} onChange={(e) => setServiceSettings((s) => s ? { ...s, warning_minutes: Math.max(0, Number(e.target.value) || 0) } : s)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" /></label><label><span className="block text-xs text-gray-500 mb-1">Compte à rebours final</span><input type="number" min={1} max={60} value={serviceSettings.final_countdown_seconds} onChange={(e) => setServiceSettings((s) => s ? { ...s, final_countdown_seconds: Math.max(1, Number(e.target.value) || 1) } : s)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" /></label><div className="space-y-2 pt-5"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={serviceSettings.sound_enabled} onChange={(e) => setServiceSettings((s) => s ? { ...s, sound_enabled: e.target.checked } : s)} /> Son d'avertissement</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={serviceSettings.voice_enabled} onChange={(e) => setServiceSettings((s) => s ? { ...s, voice_enabled: e.target.checked } : s)} /> Annonce vocale</label></div></div>
        </section>
        <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
          <div><h2 className="text-sm font-semibold text-gray-900">3. Temps par type de chambre</h2><p className="text-xs text-gray-500 mt-1">Les overrides sont utilisés pour les chambres dont le type correspond.</p></div>
          <div className="flex flex-wrap gap-2 items-end"><label className="flex-1 min-w-[220px]"><span className="block text-xs text-gray-500 mb-1">Type de chambre</span><input value={newRoomType} onChange={(e) => setNewRoomType(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRoomType(); } }} placeholder="ex. Suite / Luxury / Standard" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" /></label><button type="button" onClick={addRoomType} className="px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-900">Ajouter</button></div>
          {roomTypes.length === 0 ? <p className="text-sm text-gray-400 bg-gray-50 rounded-lg p-4">Aucun override. Les temps généraux s'appliquent à toutes les chambres.</p> : <div className="overflow-x-auto rounded-lg border border-gray-200"><table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="text-left px-3 py-2">Type</th>{SERVICE_TYPES.map((serviceType) => <th key={serviceType} className="text-left px-3 py-2 whitespace-nowrap">{SERVICE_LABELS[serviceType]}</th>)}<th /></tr></thead><tbody>{roomTypes.map((roomType) => <tr key={roomType} className="border-t border-gray-100"><td className="px-3 py-2 font-medium whitespace-nowrap">{roomType}</td>{SERVICE_TYPES.map((serviceType) => { const target = findTarget(targets, serviceType, roomType); return <td key={serviceType} className="px-2 py-2"><input type="number" min={1} max={1440} value={target?.target_minutes ?? findTarget(targets, serviceType, null)?.target_minutes ?? SERVICE_DEFAULTS[serviceType]} onChange={(e) => updateTarget(serviceType, e.target.value, roomType)} className="w-24 px-2 py-1.5 text-xs border border-gray-300 rounded" /></td>; })}<td className="px-3 py-2 text-right"><button type="button" onClick={() => removeRoomType(roomType)} className="text-xs text-red-600 hover:text-red-700">Supprimer</button></td></tr>)}</tbody></table></div>}
        </section>
        <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3"><h2 className="text-sm font-semibold text-gray-900">4. Règles opérationnelles</h2><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={settings.allow_skip_refresh} onChange={(e) => setSettings((s) => s ? { ...s, allow_skip_refresh: e.target.checked } : s)} className="rounded border-gray-300 text-orange-500" /><span className="text-sm text-gray-800">Autoriser le skip d'un Refresh</span></label><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={settings.mandatory_checkout_fs} onChange={(e) => setSettings((s) => s ? { ...s, mandatory_checkout_fs: e.target.checked } : s)} className="rounded border-gray-300 text-orange-500" /><span className="text-sm text-gray-800">Full Service obligatoire au checkout</span></label></section>
        <div className="sticky bottom-4 flex justify-end"><button type="button" onClick={() => void save()} disabled={saving} className="px-6 py-3 text-sm font-bold text-white bg-orange-500 rounded-lg shadow-lg hover:bg-orange-600 disabled:opacity-50">{saving ? t('common_saving') : t('housekeeping_settings_save')}</button></div>
      </>}
    </main>
  </div>;
}
