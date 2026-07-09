// src/components/staff/StaffPortalWrapper.tsx
// Extracted from AI Studio prototype - PortalDashboardView function

import React, { useState, useEffect } from 'react';
import { BusinessOverviewTab } from './BusinessOverviewTab';
import { GuestDietariesTab } from './GuestDietariesTab';
import { EmployeeManagementTab } from './EmployeeManagementTab';
import { AuditTrailTab } from './AuditTrailTab';
import { ResortSettingsTab } from './ResortSettingsTab';
import { QrCode } from 'lucide-react';

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
  bookings: any[];
  employees: any[];
  auditLogs: any[];
  onUpdateBookings: (bookings: any[]) => void;
  onUpdateEmployees: (employees: any[]) => void;
  onAddAuditLog: (log: any) => void;
  onUpdateBusiness: (business: any) => void;
  onShowQrModal: () => void;
}

export function StaffPortalWrapper({
  session,
  business,
  bookings,
  employees,
  auditLogs,
  onUpdateBookings,
  onUpdateEmployees,
  onAddAuditLog,
  onUpdateBusiness,
  onShowQrModal,
}: StaffPortalWrapperProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'guests' | 'employees' | 'audit' | 'settings'>('overview');
  
  // Check if user is Employee (restricted access)
  const isEmployee = session.user.role === 'EmployeeOverview';
  
  // Force reset to permitted tab if Employee attempts to access blocked tabs
  useEffect(() => {
    if (isEmployee && !['overview', 'guests'].includes(activeTab)) {
      setActiveTab('overview');
      alert('Access Denied. Your role restricts access to Business Overview & Guest Food Restrictions only.');
    }
  }, [activeTab, isEmployee]);

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

        <div className="flex gap-2">
          <button
            onClick={onShowQrModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-stone-900 hover:bg-stone-950 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
          >
            <QrCode size={14} /> Display Guest QR Code
          </button>
        </div>
      </div>

      {/* Tabs Menu Indicator Bar */}
      <div className="flex border-b border-stone-200 overflow-x-auto gap-6 text-sm">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-4 px-1 font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-amber-500 text-stone-950'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          📈 Business Overview
        </button>

        <button
          onClick={() => setActiveTab('guests')}
          className={`pb-4 px-1 font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'guests'
              ? 'border-amber-500 text-stone-950'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          🥑 Guest Dietaries / Restrictions
        </button>

        {/* RESTRICTED MENU BUTTONS - Hidden from Employees */}
        {!isEmployee && (
          <>
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

            <button
              onClick={() => setActiveTab('settings')}
              className={`pb-4 px-1 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'border-amber-500 text-stone-950'
                  : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              ⚙️ Resort Settings
            </button>
          </>
        )}
      </div>

      {/* Render active module */}
      {activeTab === 'overview' && (
        <BusinessOverviewTab bookings={bookings} totalRooms={business.total_rooms} />
      )}

      {activeTab === 'guests' && (
        <GuestDietariesTab
          bookings={bookings}
          session={session}
          onSaveDietary={(guestId, updatedDietaries, log) => {
            const updated = bookings.map(b => b.id === guestId ? { ...b, food_restrictions: updatedDietaries, updated_at: new Date().toISOString() } : b);
            onUpdateBookings(updated);
            if (log) {
              onAddAuditLog(log);
            }
          }}
        />
      )}

      {activeTab === 'employees' && !isEmployee && (
        <EmployeeManagementTab
          employees={employees}
          businessName={business.trading_name}
          onUpdateEmployees={onUpdateEmployees}
        />
      )}

      {activeTab === 'audit' && !isEmployee && (
        <AuditTrailTab auditLogs={auditLogs} />
      )}

      {activeTab === 'settings' && !isEmployee && (
        <ResortSettingsTab business={business} onUpdateBusiness={onUpdateBusiness} />
      )}
    </div>
  );
}

export default StaffPortalWrapper;
