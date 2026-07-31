// src/components/staff/StaffPortalWrapper.tsx
// Fixed: audit logs fetch once on mount + 30s poll — no unstable useEffect loop

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { EmployeeManagementTab } from './EmployeeManagementTab';
import { AuditTrailTab } from './AuditTrailTab';

interface StaffPortalWrapperProps {
  session: {
    user: {
      id: string;
      full_name: string;
      role: 'owner' | 'EmployeeOverview';
      business_id: string;
    };
  };
  business: {
    id: string;
    trading_name: string;
    slogan?: string;
    total_rooms: number;
    logo_url?: string;
  };
  employees: any[];
  auditLogs?: any[];
  onUpdateEmployees: (employees: any[]) => void;
  onAddAuditLog: (log: any) => void;
}

const LAST_VIEWED_KEY = 'fastcheckin_audit_last_viewed';

export function StaffPortalWrapper({
  session,
  business,
  employees,
  auditLogs: initialAuditLogs = [],
  onUpdateEmployees,
  onAddAuditLog,
}: StaffPortalWrapperProps) {
  const [activeTab, setActiveTab] = useState<'employees' | 'audit'>('employees');
  const [auditLogs, setAuditLogs] = useState<any[]>(initialAuditLogs);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [newLogCount, setNewLogCount] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [latestLogs, setLatestLogs] = useState<any[]>([]);
  const [showPopup, setShowPopup] = useState(false);

  const isEmployee = session.user.role === 'EmployeeOverview';
  const activeTabRef = useRef(activeTab);
  const isFirstLoadRef = useRef(true);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasNotifiedRef = useRef<Set<string>>(new Set());
  const fetchingRef = useRef(false);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const playNotificationSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch {
      /* ignore */
    }
  }, []);

  const getLastViewed = useCallback((): string | null => {
    try {
      return localStorage.getItem(`${LAST_VIEWED_KEY}_${business.id}`);
    } catch {
      return null;
    }
  }, [business.id]);

  const setLastViewed = useCallback(() => {
    try {
      const now = new Date().toISOString();
      localStorage.setItem(`${LAST_VIEWED_KEY}_${business.id}`, now);
      setNewLogCount(0);
      setShowNotification(false);
      hasNotifiedRef.current.clear();
    } catch {
      /* ignore */
    }
  }, [business.id]);

  const checkForNewLogs = useCallback(
    (logs: any[]) => {
      const lastViewed = getLastViewed();
      if (!lastViewed || logs.length === 0) {
        if (isFirstLoadRef.current && logs.length > 0) {
          setLastViewed();
          isFirstLoadRef.current = false;
        }
        return;
      }

      const newLogs = logs.filter((log) => {
        const logDate = new Date(log.created_at);
        const lastDate = new Date(lastViewed);
        return logDate > lastDate;
      });

      if (newLogs.length > 0) {
        const newLogIds = newLogs.map((log) => log.id).filter(Boolean);
        const alreadyNotified = newLogIds.every((id) => hasNotifiedRef.current.has(id));
        if (!alreadyNotified && newLogIds.length > 0) {
          playNotificationSound();
          newLogIds.forEach((id) => hasNotifiedRef.current.add(id));
        }
        setNewLogCount(newLogs.length);
        setLatestLogs(newLogs.slice(0, 5));
        setShowNotification(true);
      } else {
        setNewLogCount(0);
        setShowNotification(false);
      }
    },
    [getLastViewed, playNotificationSound, setLastViewed]
  );

  const fetchAuditLogs = useCallback(async () => {
    if (!business.id || fetchingRef.current) return;
    fetchingRef.current = true;
    setLoadingAudit(true);
    setFetchError(null);

    try {
      let token = null;
      try {
        const authStr = localStorage.getItem('fastcheckin_auth');
        if (authStr) {
          const auth = JSON.parse(authStr);
          token = auth.token;
        }
      } catch {
        /* ignore */
      }

      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const url = `/.netlify/functions/get-audit-logs?businessId=${encodeURIComponent(business.id)}&limit=100`;
      const response = await fetch(url, { headers });

      if (!response.ok) {
        setFetchError(`Failed to fetch: ${response.status} ${response.statusText}`);
        setAuditLogs([]);
        return;
      }

      const data = await response.json();
      let logs: any[] = [];
      if (data.success && data.data) {
        logs = data.data;
        setAuditLogs(logs);
      } else if (Array.isArray(data)) {
        logs = data;
        setAuditLogs(logs);
      } else {
        setAuditLogs([]);
      }

      if (activeTabRef.current !== 'audit') {
        checkForNewLogs(logs);
      } else {
        setLastViewed();
        setNewLogCount(0);
        setShowNotification(false);
        hasNotifiedRef.current.clear();
      }
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : 'Unknown error');
      setAuditLogs([]);
    } finally {
      setLoadingAudit(false);
      fetchingRef.current = false;
    }
  }, [business.id, checkForNewLogs, setLastViewed]);

  useEffect(() => {
    if (isEmployee || !business.id) return;

    fetchAuditLogs();
    pollIntervalRef.current = setInterval(() => {
      fetchAuditLogs();
    }, 30000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business.id, isEmployee]);

  const handleTabChange = useCallback(
    (tab: 'employees' | 'audit') => {
      setActiveTab(tab);
      if (tab === 'audit') {
        setLastViewed();
        setNewLogCount(0);
        setShowNotification(false);
        setShowPopup(false);
        hasNotifiedRef.current.clear();
        fetchAuditLogs();
      }
    },
    [setLastViewed, fetchAuditLogs]
  );

  const handleNotificationClick = useCallback(() => {
    setShowPopup(true);
  }, []);

  const handlePopupClose = useCallback(() => {
    setShowPopup(false);
  }, []);

  const handleViewNow = useCallback(() => {
    setShowPopup(false);
    handleTabChange('audit');
  }, [handleTabChange]);

  const openEmployeePortal = useCallback(() => {
    window.open('/employee/login', '_blank', 'noopener,noreferrer');
  }, []);

  if (isEmployee) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔒</div>
        <h3 className="text-lg font-semibold text-stone-700 mb-2">Access Restricted</h3>
        <p className="text-stone-500 text-sm">
          Employees should use the <strong>Employee Dashboard</strong> for guest management.
        </p>
        <button
          onClick={() => (window.location.href = '/employee/dashboard')}
          className="mt-4 px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
        >
          Go to Employee Dashboard →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-3xl border border-stone-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center font-bold text-amber-500 font-serif text-3xl">
            {business.trading_name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-black text-stone-950 tracking-tight leading-none">
              {business.trading_name}
            </h1>
            <p className="text-stone-400 text-xs mt-1 font-mono">
              {business.slogan || 'Luxury Hospitality'} • {business.total_rooms} Rooms
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-400 bg-stone-100 px-3 py-1 rounded-full">
            👑 Owner Access • Staff Management
          </span>
          {showNotification && (
            <button
              onClick={handleNotificationClick}
              className="relative flex items-center gap-2 px-3 py-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 animate-pulse"
            >
              <span className="text-xs font-bold">🔔 New Logs</span>
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-white text-red-500 rounded-full">
                {newLogCount}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Employee Portal entry — dedicated login for staff daily work */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-2xl flex-shrink-0">
            👷
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-950">Employee Portal</h2>
            <p className="text-sm text-stone-600 mt-1 max-w-xl">
              Employees log in here to perform their daily work — housekeeping tasks, check-ins,
              and room operations according to their role.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openEmployeePortal}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm rounded-xl shadow-md transition-colors whitespace-nowrap flex-shrink-0"
        >
          Open Employee Portal
          <span aria-hidden>→</span>
        </button>
      </div>

      <div className="flex border-b border-stone-200 overflow-x-auto gap-6 text-sm">
        <button
          onClick={() => handleTabChange('employees')}
          className={`pb-4 px-1 font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'employees'
              ? 'border-amber-500 text-stone-950'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          🧑‍🍳 Employee Management
        </button>

        <button
          onClick={() => handleTabChange('audit')}
          className={`pb-4 px-1 font-semibold transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'border-amber-500 text-stone-950'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          📋 Platform Audit Trail
          {loadingAudit && (
            <span className="inline-block animate-spin rounded-full h-3 w-3 border-2 border-amber-500 border-t-transparent" />
          )}
          {showNotification && activeTab !== 'audit' && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-red-500 text-white rounded-full animate-bounce">
              {newLogCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'employees' && (
        <EmployeeManagementTab
          employees={employees}
          businessName={business.trading_name}
          onUpdateEmployees={onUpdateEmployees}
        />
      )}

      {activeTab === 'audit' && (
        <>
          {loadingAudit ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500 mx-auto mb-4" />
                <p className="text-sm text-stone-500">Loading audit logs...</p>
              </div>
            </div>
          ) : fetchError ? (
            <div className="bg-red-50 border border-red-200 rounded-3xl p-8 text-center">
              <div className="text-red-500 text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold text-red-700 mb-2">Failed to Load Audit Logs</h3>
              <p className="text-sm text-red-600">{fetchError}</p>
              <button
                onClick={fetchAuditLogs}
                className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <AuditTrailTab auditLogs={auditLogs} businessId={business.id} />
          )}
        </>
      )}

      {showPopup && latestLogs.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden shadow-2xl animate-scale-in">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-full">
                  <span className="text-xl">🔔</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">New Audit Logs</h3>
                  <p className="text-xs text-gray-500">
                    {newLogCount} new entr{newLogCount > 1 ? 'ies' : 'y'} since your last visit
                  </p>
                </div>
              </div>
              <button
                onClick={handlePopupClose}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[50vh]">
              <div className="space-y-3">
                {latestLogs.map((log, index) => (
                  <div
                    key={log.id || index}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {log.guest_name || 'Unknown Guest'}
                        </p>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                          {new Date(log.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">{log.user_name || 'System'}</span>
                        <span className="mx-1">•</span>
                        {log.action}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-3">
              <button
                onClick={handlePopupClose}
                className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
              >
                Close
              </button>
              <button
                onClick={handleViewNow}
                className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm"
              >
                View Audit Trail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StaffPortalWrapper;
