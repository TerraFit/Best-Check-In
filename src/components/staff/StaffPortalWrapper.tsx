import React, { useState, useEffect } from 'react';
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
  auditLogs: any[];
  onUpdateEmployees: (employees: any[]) => void;
  onAddAuditLog: (log: any) => void;
}

export function StaffPortalWrapper({
  session,
  business,
  employees,
  auditLogs,
  onUpdateEmployees,
  onAddAuditLog,
}: StaffPortalWrapperProps) {
  const [activeTab, setActiveTab] = useState<'employees' | 'audit'>('employees');
  
  const isEmployee = session.user.role === 'EmployeeOverview';

  // Employees should not see this tab at all (they use EmployeeDashboard)
  // If an employee somehow gets here, redirect them away
  useEffect(() => {
    if (isEmployee) {
      // Employees shouldn't be here - they have their own dashboard
      console.warn('Employee attempting to access Staff Portal tab - redirecting');
    }
  }, [isEmployee]);

  // If employee, show nothing (they should use EmployeeDashboard)
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
      {/* Brand Profile Hero Widget - Simplified */}
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
          TABS - Only Employee Management + Audit Trail
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
        <AuditTrailTab 
          auditLogs={auditLogs}
          businessId={business.id}
        />
      )}
    </div>
  );
}

export default StaffPortalWrapper;
