// src/pages/tabs/StaffPortalTab.tsx
// ✅ SIMPLIFIED: Passes businessId to StaffPortalWrapper

import React, { useState, useEffect } from 'react';
import { StaffPortalWrapper } from '../../components/staff/StaffPortalWrapper';
import { useAuth } from '../../hooks/useAuth';

interface StaffPortalTabProps {
  businessId: string;
}

export function StaffPortalTab({ businessId }: StaffPortalTabProps) {
  const { getAuthHeaders } = useAuth();
  
  // State for employees and audit logs
  const [employees, setEmployees] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [business, setBusiness] = useState<any>(null);
  
  // Fetch business data
  useEffect(() => {
    const fetchBusiness = async () => {
      try {
        const response = await fetch(`/.netlify/functions/get-business-branding?id=${businessId}`);
        if (response.ok) {
          const data = await response.json();
          setBusiness(data);
        }
      } catch (error) {
        console.error('Error fetching business:', error);
      }
    };
    
    if (businessId) {
      fetchBusiness();
    }
  }, [businessId]);
  
  // Fetch employees
  const fetchEmployees = async () => {
    if (!businessId) return;
    
    setLoadingEmployees(true);
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`/.netlify/functions/manage-employees?businessId=${businessId}`, {
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoadingEmployees(false);
    }
  };
  
  // Load employees on mount
  useEffect(() => {
    fetchEmployees();
  }, [businessId]);
  
  // Handle updating employees
  const handleUpdateEmployees = async (updatedEmployees: any[]) => {
    setEmployees(updatedEmployees);
    await fetchEmployees();
  };
  
  // Handle adding audit log
  const handleAddAuditLog = (log: any) => {
    setAuditLogs(prev => [log, ...prev]);
  };
  
  // Check if data is loading
  const isLoading = loadingEmployees || !business;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4" />
          <p className="text-sm text-stone-500">Loading Staff Portal...</p>
        </div>
      </div>
    );
  }
  
  // Get current user session
  const session = {
    user: {
      id: 'user_1',
      full_name: 'Admin User',
      role: 'owner' as 'owner' | 'EmployeeOverview',
      business_id: businessId,
    }
  };
  
  // Default business data if not loaded
  const businessData = business || {
    id: businessId,
    trading_name: 'Business',
    slogan: '',
    total_rooms: 0,
    logo_url: '',
  };
  
  return (
    <StaffPortalWrapper
      session={session}
      business={businessData}
      employees={employees}
      auditLogs={auditLogs}
      onUpdateEmployees={handleUpdateEmployees}
      onAddAuditLog={handleAddAuditLog}
    />
  );
}

export default StaffPortalTab;
