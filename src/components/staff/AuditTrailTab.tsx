// src/components/staff/AuditTrailTab.tsx

import React, { useMemo, useState } from 'react';
import { Calendar, User, FileText, Search, Clock, Utensils, Edit2, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { t } from '../../i18n';

interface AuditLog {
  id: string; business_id: string; user_id: string; user_name: string; action: string; details: any;
  description: string; booking_id?: string; guest_name?: string; ip_address: string; user_agent: string; created_at: string;
}
interface AuditTrailTabProps { auditLogs: AuditLog[]; businessId?: string; }

function isChangeValue(value: unknown): value is { from?: unknown; to?: unknown } {
  return !!value && typeof value === 'object' && !Array.isArray(value) && ('from' in value || 'to' in value);
}
function safeString(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  try { return JSON.stringify(value); } catch { return String(value); }
}

export function AuditTrailTab({ auditLogs }: AuditTrailTabProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const actionTypes = useMemo(() => Array.from(new Set(auditLogs.map(log => log.action))), [auditLogs]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'UPDATE_FOOD_RESTRICTIONS': return <Utensils size={14} className="text-amber-500" />;
      case 'UPDATE_STAY_DETAILS': return <Calendar size={14} className="text-blue-500" />;
      case 'CHECK_IN': return <CheckCircle size={14} className="text-green-500" />;
      case 'CHECK_OUT': return <XCircle size={14} className="text-orange-500" />;
      case 'UPDATE_PROFILE': return <Edit2 size={14} className="text-purple-500" />;
      default: return <FileText size={14} className="text-stone-400" />;
    }
  };
  const getActionColor = (action: string) => {
    switch (action) {
      case 'UPDATE_FOOD_RESTRICTIONS': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'UPDATE_STAY_DETAILS': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CHECK_IN': return 'bg-green-100 text-green-800 border-green-200';
      case 'CHECK_OUT': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'UPDATE_PROFILE': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  const getActionLabel = (action: string) => {
    switch (action) {
      case 'UPDATE_FOOD_RESTRICTIONS': return 'Food Restrictions Updated';
      case 'UPDATE_STAY_DETAILS': return 'Stay Details Updated';
      case 'CHECK_IN': return 'Guest Checked In';
      case 'CHECK_OUT': return 'Guest Checked Out';
      case 'UPDATE_PROFILE': return 'Profile Updated';
      default: return action.replaceAll('_', ' ').toUpperCase();
    }
  };
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const timeAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diffMs / 60000), h = Math.floor(diffMs / 3600000), d = Math.floor(diffMs / 86400000);
    if (m < 1) return 'Just now'; if (m < 60) return `${m}m ago`; if (h < 24) return `${h}h ago`; if (d < 7) return `${d}d ago`; return formatDate(dateStr);
  };

  const filteredLogs = useMemo(() => {
    const term = search.trim().toLowerCase();
    const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const result = auditLogs.filter(log => {
      if (filter !== 'all' && log.action !== filter) return false;
      if (term && ![log.user_name, log.guest_name || '', log.description || '', log.action].some(v => String(v).toLowerCase().includes(term))) return false;
      if (dateRange !== 'all') {
        const start = new Date(today); if (dateRange === 'week') start.setDate(start.getDate() - 7); if (dateRange === 'month') start.setMonth(start.getMonth() - 1);
        if (new Date(log.created_at) < start) return false;
      }
      return true;
    });
    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [auditLogs, search, filter, dateRange]);

  const renderDetailsPreview = (log: AuditLog) => {
    const details = log.details;
    if (!details || typeof details !== 'object' || Array.isArray(details) || Object.keys(details).length === 0) return <span className="text-stone-400">{t('staff_audit_no_details')}</span>;
    const entries = Object.entries(details);
    return <div className="text-[10px] space-y-0.5">{entries.slice(0, 3).map(([key, value]) => isChangeValue(value) ? (
      <div key={key} className="flex items-center gap-1 text-stone-600"><span className="font-medium capitalize">{key.replaceAll('_', ' ')}:</span><span className="text-red-500 line-through text-[9px]">{safeString(value.from)}</span><ArrowRight size={10} className="text-stone-400" /><span className="text-green-600 font-medium text-[9px]">{safeString(value.to)}</span></div>
    ) : (
      <div key={key} className="flex items-center gap-1 text-stone-600"><span className="font-medium capitalize">{key.replaceAll('_', ' ')}:</span><span className="text-[9px]">{safeString(value)}</span></div>
    ))}{entries.length > 3 && <span className="text-stone-400 text-[9px]">+{entries.length - 3} more</span>}</div>;
  };

  return <div className="space-y-6 animate-fade-in">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4"><div><h2 className="text-xl font-bold font-serif text-stone-900 leading-none flex items-center gap-2"><Clock size={20} className="text-amber-500" />Platform Audit Trail</h2><p className="text-xs text-stone-400 mt-1">Permanently logs all employee actions including food restrictions, stay details, and guest updates</p></div><div className="flex flex-wrap items-center gap-3"><select value={dateRange} onChange={e => setDateRange(e.target.value as typeof dateRange)} className="px-3 py-2 border border-stone-200 rounded-xl text-xs bg-white"><option value="all">{t('filters_all_time')}</option><option value="today">{t('staff_audit_today')}</option><option value="week">{t('filters_last_7_days')}</option><option value="month">{t('filters_last_30_days')}</option></select><select value={filter} onChange={e => setFilter(e.target.value)} className="px-3 py-2 border border-stone-200 rounded-xl text-xs bg-white"><option value="all">{t('staff_audit_all_actions')}</option>{actionTypes.map(a => <option key={a} value={a}>{getActionLabel(a)}</option>)}</select><div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('staff_audit_search')} className="pl-9 pr-3 py-2 border border-stone-200 rounded-xl text-xs w-48 bg-white" /></div></div></div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm"><p className="text-[10px] text-stone-400 uppercase">{t('staff_audit_total_logs')}</p><p className="text-2xl font-bold text-stone-900">{auditLogs.length}</p></div><div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm"><p className="text-[10px] text-stone-400 uppercase">{t('staff_audit_unique_users')}</p><p className="text-2xl font-bold text-stone-900">{new Set(auditLogs.map(l => l.user_id)).size}</p></div><div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm"><p className="text-[10px] text-stone-400 uppercase">{t('staff_audit_food_updates')}</p><p className="text-2xl font-bold text-stone-900">{auditLogs.filter(l => l.action === 'UPDATE_FOOD_RESTRICTIONS').length}</p></div><div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm"><p className="text-[10px] text-stone-400 uppercase">{t('staff_audit_stay_updates')}</p><p className="text-2xl font-bold text-stone-900">{auditLogs.filter(l => l.action === 'UPDATE_STAY_DETAILS').length}</p></div></div>
    <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-stone-50/80 border-b border-stone-100 text-stone-400 font-bold uppercase tracking-widest text-[9px]"><tr><th className="px-6 py-4">{t('staff_audit_timestamp')}</th><th className="px-6 py-4">{t('staff_audit_user')}</th><th className="px-6 py-4">{t('lost_found_guest')}</th><th className="px-6 py-4">{t('staff_audit_action')}</th><th className="px-6 py-4">{t('staff_audit_changes')}</th><th className="px-6 py-4">{t('staff_audit_ip')}</th></tr></thead><tbody className="divide-y divide-stone-100">{filteredLogs.length === 0 ? <tr><td colSpan={6} className="px-6 py-12 text-center text-stone-400"><FileText size={32} className="mx-auto mb-2 text-stone-300" />{t('staff_audit_none')}</td></tr> : filteredLogs.map(log => <tr key={log.id} className="hover:bg-stone-50/50"><td className="px-6 py-4"><div className="flex flex-col"><span className="text-stone-700 font-mono text-[10px]">{formatDate(log.created_at)}</span><span className="text-stone-400 text-[9px]">{timeAgo(log.created_at)}</span></div></td><td className="px-6 py-4"><div className="flex items-center gap-2"><User size={12} className="text-stone-400" />{log.user_name}</div></td><td className="px-6 py-4">{log.guest_name || log.booking_id ? <div><div className="text-stone-800">{log.guest_name || 'Unknown Guest'}</div>{log.booking_id && <div className="text-stone-400 text-[9px]">ID: {log.booking_id.substring(0, 8)}</div>}</div> : '—'}</td><td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-[9px] font-bold border ${getActionColor(log.action)} flex items-center gap-1.5 w-fit`}>{getActionIcon(log.action)}{getActionLabel(log.action)}</span></td><td className="px-6 py-4 max-w-xs">{renderDetailsPreview(log)}</td><td className="px-6 py-4 text-stone-400 font-mono text-[10px]">{log.ip_address || '—'}</td></tr>)}</tbody></table></div></div>
  </div>;
}
