import React, { useState, useEffect, useCallback } from 'react';
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
  
  const isEmployee = session.user.role === 'EmployeeOverview';

  // ✅ Fetch audit logs from the API
  const fetchAuditLogs = useCallback(async () => {
    if (!business.id) {
      console.warn('⚠️ No business ID available for audit logs');
      return;
    }

    setLoadingAudit(true);
    setFetchError(null);
    console.log('🔍 Fetching audit logs for business:', business.id);

    try {
      // Get auth token from localStorage
      let token = null;
      try {
        const authStr = localStorage.getItem('fastcheckin_auth');
        if (authStr) {
          const auth = JSON.parse(authStr);
          token = auth.token;
        }
      } catch (e) {
        console.warn('Could not get auth token:', e);
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const url = `/.netlify/functions/get-audit-logs?businessId=${encodeURIComponent(business.id)}&limit=100`;
      console.log('📡 Fetching from:', url);

      const response = await fetch(url, { headers });

      console.log('📡 Audit logs response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to fetch audit logs:', errorText);
        setFetchError(`Failed to fetch: ${response.status} ${response.statusText}`);
        setAuditLogs([]);
        return;
      }

      const data = await response.json();
      console.log('✅ Audit logs fetched:', data);
      
      if (data.success && data.data) {
        setAuditLogs(data.data);
        console.log(`✅ Loaded ${data.data.length} audit logs`);
      } else if (Array.isArray(data)) {
        setAuditLogs(data);
        console.log(`✅ Loaded ${data.length} audit logs (array format)`);
      } else {
        console.warn('⚠️ Unexpected data format:', data);
        setAuditLogs([]);
      }
    } catch (error) {
      console.error('❌ Error fetching audit logs:', error);
      setFetchError(error instanceof Error ? error.message : 'Unknown error');
      setAuditLogs([]);
    } finally {
      setLoadingAudit(false);
    }
  }, [business.id]);

  // ✅ Fetch audit logs when switching to audit tab
  useEffect(() => {
    if (activeTab === 'audit') {
      console.log('🔍 Switching to audit tab, fetching logs...');
      fetchAuditLogs();
    }
  }, [activeTab, fetchAuditLogs]);

  // ✅ Update local state if prop changes
  useEffect(() => {
    if (initialAuditLogs && initialAuditLogs.length > 0) {
      setAuditLogs(initialAuditLogs);
    }
  }, [initialAuditLogs]);

  // If employee, show restricted message
  if (isEmployee) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔒</div>
        <h3 className="text-lg font-semibold text-stone-700 mb-2">Access Restricted</h3>
        <p className="text-stone-500 text-sm">
          Employees should use the <strong>Employee Dashboard</strong> for guest management.
        </p>
        <button
          onClick={() => window.location.href = '/employee/dashboard'}
          className="mt-4 px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
        >
          Go to Employee Dashboard →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Brand Profile Hero Widget */}
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
        </div>
      </div>

      {/* ============================================================
          TABS - ONLY Employee Management + Audit Trail
          ============================================================ */}
      <div className="flex border-b border-stone-200 overflow-x-auto gap-6 text-sm">
        <button
          onClick={() => setActiveTab('employees')}
          className={`pb-4 px-1 font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'employees'
              ? 'border-amber-500 text-stone-950'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          🧑‍🍳 Employee Management
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-4 px-1 font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'audit'
              ? 'border-amber-500 text-stone-950'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          📋 Platform Audit Trail
          {loadingAudit && (
            <span className="ml-2 inline-block animate-spin rounded-full h-3 w-3 border-2 border-amber-500 border-t-transparent" />
          )}
        </button>
      </div>

      {/* ============================================================
          RENDER ACTIVE TAB
          ============================================================ */}
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
            <AuditTrailTab 
              auditLogs={auditLogs}
              businessId={business.id}
            />
          )}
        </>
      )}
    </div>
  );
}

export default StaffPortalWrapper;
