// src/components/staff/AuditTrailTab.tsx
// ✅ FULL IMPLEMENTATION: Audit Trail with food restrictions, stay details, and all actions

import React, { useState, useMemo } from 'react';
import { 
import { t } from '../../i18n';
  Calendar, User, FileText, Filter, Search, Clock, 
  ChevronDown, Utensils, Edit2, CheckCircle, XCircle,
  ArrowRight, Eye
} from 'lucide-react';

interface AuditLog {
  id: string;
  business_id: string;
  user_id: string;
  user_name: string;
  action: string;
  details: any;
  description: string;
  booking_id?: string;
  guest_name?: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

interface AuditTrailTabProps {
  auditLogs: AuditLog[];
  businessId?: string;
}

export function AuditTrailTab({ auditLogs, businessId }: AuditTrailTabProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Get unique action types for filter
  const actionTypes = useMemo(() => {
    const types = new Set(auditLogs.map(log => log.action));
    return Array.from(types);
  }, [auditLogs]);

  // Get action icon
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'UPDATE_FOOD_RESTRICTIONS':
        return <Utensils size={14} className="text-amber-500" />;
      case 'UPDATE_STAY_DETAILS':
        return <Calendar size={14} className="text-blue-500" />;
      case 'CHECK_IN':
        return <CheckCircle size={14} className="text-green-500" />;
      case 'CHECK_OUT':
        return <XCircle size={14} className="text-orange-500" />;
      case 'UPDATE_PROFILE':
        return <Edit2 size={14} className="text-purple-500" />;
      default:
        return <FileText size={14} className="text-stone-400" />;
    }
  };

  // Get action color
  const getActionColor = (action: string) => {
    switch (action) {
      case 'UPDATE_FOOD_RESTRICTIONS':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'UPDATE_STAY_DETAILS':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CHECK_IN':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'CHECK_OUT':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'UPDATE_PROFILE':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get action label
  const getActionLabel = (action: string) => {
    switch (action) {
      case 'UPDATE_FOOD_RESTRICTIONS':
        return 'Food Restrictions Updated';
      case 'UPDATE_STAY_DETAILS':
        return 'Stay Details Updated';
      case 'CHECK_IN':
        return 'Guest Checked In';
      case 'CHECK_OUT':
        return 'Guest Checked Out';
      case 'UPDATE_PROFILE':
        return 'Profile Updated';
      default:
        return action.replace('_', ' ').toUpperCase();
    }
  };

  // Format timestamp
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Get time ago
  const timeAgo = (dateStr: string) => {
    const now = new Date();
    const then = new Date(dateStr);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateStr);
  };

  // Filter logs
  const filteredLogs = useMemo(() => {
    let filtered = auditLogs;

    // Search filter
    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(log => 
        log.user_name.toLowerCase().includes(term) ||
        (log.guest_name && log.guest_name.toLowerCase().includes(term)) ||
        log.description.toLowerCase().includes(term) ||
        log.action.toLowerCase().includes(term)
      );
    }

    // Action filter
    if (filter !== 'all') {
      filtered = filtered.filter(log => log.action === filter);
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(log => {
        const logDate = new Date(log.created_at);
        if (dateRange === 'today') {
          return logDate >= today;
        }
        if (dateRange === 'week') {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return logDate >= weekAgo;
        }
        if (dateRange === 'month') {
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return logDate >= monthAgo;
        }
        return true;
      });
    }

    // Sort by newest first
    return filtered.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [auditLogs, search, filter, dateRange]);

  // Render details preview
  const renderDetailsPreview = (log: AuditLog) => {
    if (!log.details || Object.keys(log.details).length === 0) {
      return <span className="text-stone-400">{t('staff_audit_no_details')}</span>;
    }

    const entries = Object.entries(log.details);
    return (
      <div className="text-[10px] space-y-0.5">
        {entries.slice(0, 3).map(([key, value]: [string, any]) => {
          if (typeof value === 'object') {
            return (
              <div key={key} className="flex items-center gap-1 text-stone-600">
                <span className="font-medium capitalize">{key.replace('_', ' ')}:</span>
                <span className="text-red-500 line-through text-[9px]">{String(value.from)}</span>
                <ArrowRight size={10} className="text-stone-400" />
                <span className="text-green-600 font-medium text-[9px]">{String(value.to)}</span>
              </div>
            );
          }
          return (
            <div key={key} className="flex items-center gap-1 text-stone-600">
              <span className="font-medium capitalize">{key.replace('_', ' ')}:</span>
              <span className="text-[9px]">{String(value)}</span>
            </div>
          );
        })}
        {entries.length > 3 && (
          <span className="text-stone-400 text-[9px]">+{entries.length - 3} more</span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-serif text-stone-900 leading-none flex items-center gap-2">
            <Clock size={20} className="text-amber-500" />
            Platform Audit Trail
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Permanently logs all employee actions including food restrictions, stay details, and guest updates
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Range Filter */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-3 py-2 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-none bg-white"
          >
            <option value="all">{t('filters_all_time')}</option>
            <option value="today">{t('staff_audit_today')}</option>
            <option value="week">{t('filters_last_7_days')}</option>
            <option value="month">{t('filters_last_30_days')}</option>
          </select>

          {/* Action Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-none bg-white"
          >
            <option value="all">{t('staff_audit_all_actions')}</option>
            {actionTypes.map(action => (
              <option key={action} value={action}>
                {getActionLabel(action)}
              </option>
            ))}
          </select>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder={t("staff_audit_search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-none w-48 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
          <p className="text-[10px] text-stone-400 uppercase tracking-wider">{t('staff_audit_total_logs')}</p>
          <p className="text-2xl font-bold text-stone-900">{auditLogs.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
          <p className="text-[10px] text-stone-400 uppercase tracking-wider">{t('staff_audit_unique_users')}</p>
          <p className="text-2xl font-bold text-stone-900">
            {new Set(auditLogs.map(log => log.user_id)).size}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
          <p className="text-[10px] text-stone-400 uppercase tracking-wider">{t('staff_audit_food_updates')}</p>
          <p className="text-2xl font-bold text-stone-900">
            {auditLogs.filter(log => log.action === 'UPDATE_FOOD_RESTRICTIONS').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
          <p className="text-[10px] text-stone-400 uppercase tracking-wider">{t('staff_audit_stay_updates')}</p>
          <p className="text-2xl font-bold text-stone-900">
            {auditLogs.filter(log => log.action === 'UPDATE_STAY_DETAILS').length}
          </p>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50/80 border-b border-stone-100 text-stone-400 font-bold uppercase tracking-widest text-[9px]">
              <tr>
                <th className="px-6 py-4">{t('staff_audit_timestamp')}</th>
                <th className="px-6 py-4">{t('staff_audit_user')}</th>
                <th className="px-6 py-4">{t('lost_found_guest')}</th>
                <th className="px-6 py-4">{t('staff_audit_action')}</th>
                <th className="px-6 py-4">{t('staff_audit_changes')}</th>
                <th className="px-6 py-4">{t('staff_audit_ip')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-stone-400">
                    <div className="flex flex-col items-center gap-2">
                      <FileText size={32} className="text-stone-300" />
                      <p>{t('staff_audit_none')}</p>
                      {search || filter !== 'all' ? (
                        <button
                          onClick={() => { setSearch(''); setFilter('all'); }}
                          className="text-amber-500 hover:text-amber-600 text-xs font-medium"
                        >
                          Clear filters
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-stone-50/50 transition-colors">
                    {/* Timestamp */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-stone-700 font-mono text-[10px]">
                          {formatDate(log.created_at)}
                        </span>
                        <span className="text-stone-400 text-[9px]">
                          {timeAgo(log.created_at)}
                        </span>
                      </div>
                    </td>

                    {/* User */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User size={12} className="text-stone-400" />
                        <span className="text-stone-900 font-medium">{log.user_name}</span>
                      </div>
                    </td>

                    {/* Guest */}
                    <td className="px-6 py-4">
                      {log.guest_name || log.booking_id ? (
                        <div className="flex flex-col">
                          <span className="text-stone-800 font-medium">
                            {log.guest_name || 'Unknown Guest'}
                          </span>
                          {log.booking_id && (
                            <span className="text-stone-400 text-[9px] font-mono">
                              ID: {log.booking_id.substring(0, 8)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold border ${getActionColor(log.action)} flex items-center gap-1.5 w-fit`}>
                        {getActionIcon(log.action)}
                        {getActionLabel(log.action)}
                      </span>
                    </td>

                    {/* Changes */}
                    <td className="px-6 py-4 max-w-xs">
                      {renderDetailsPreview(log)}
                    </td>

                    {/* {t('staff_audit_ip')} */}
                    <td className="px-6 py-4">
                      <span className="text-stone-400 font-mono text-[10px]">
                        {log.ip_address || 'unknown'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-100 bg-stone-50/50 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-400">
          <span>
            Showing {filteredLogs.length} of {auditLogs.length} entries
          </span>
          <div className="flex items-center gap-4">
            {(search || filter !== 'all' || dateRange !== 'all') && (
              <button
                onClick={() => { setSearch(''); setFilter('all'); setDateRange('all'); }}
                className="text-amber-500 hover:text-amber-600 font-medium"
              >
                Clear All Filters
              </button>
            )}
            <span className="text-[9px]">
              {auditLogs.length > 0 ? `Latest: ${timeAgo(auditLogs[0]?.created_at)}` : 'No logs'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuditTrailTab;
