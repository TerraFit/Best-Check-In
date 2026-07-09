// src/pages/tabs/StaffPortalTab.tsx
import React, { useState, useEffect } from 'react';
import { StaffPortalWrapper } from '../../components/staff/StaffPortalWrapper';
import { useBusinessData } from '../../hooks/useBusinessData';
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
  const [loadingAudit, setLoadingAudit] = useState(false);
  
  // Get bookings using existing hook
  const { bookings, loading: loadingBookings, refreshData } = useBusinessData('staff', 1, 1000, {});
  
  // Get business data from context/state
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
  
  // Fetch audit logs
  const fetchAuditLogs = async () => {
    if (!businessId) return;
    
    setLoadingAudit(true);
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`/.netlify/functions/get-audit-logs?businessId=${businessId}&limit=100`, {
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoadingAudit(false);
    }
  };
  
  // Load employees and audit logs on mount
  useEffect(() => {
    fetchEmployees();
    fetchAuditLogs();
  }, [businessId]);
  
  // Handle updating bookings (for food restrictions)
  const handleUpdateBookings = (updatedBookings: any[]) => {
    // Refresh bookings data
    refreshData();
  };
  
  // Handle updating employees
  const handleUpdateEmployees = async (updatedEmployees: any[]) => {
    setEmployees(updatedEmployees);
    // Optionally refresh from server
    await fetchEmployees();
  };
  
  // Handle adding audit log
  const handleAddAuditLog = (log: any) => {
    setAuditLogs(prev => [log, ...prev]);
  };
  
  // Handle updating business
  const handleUpdateBusiness = (updatedBusiness: any) => {
    setBusiness(updatedBusiness);
  };
  
  // Handle showing QR modal
  const handleShowQrModal = () => {
    // You can integrate with your existing QR modal here
    console.log('Show QR modal for:', businessId);
  };
  
  // Check if all data is loading
  const isLoading = loadingBookings || loadingEmployees || loadingAudit || !business;
  
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
      id: 'user_1', // Replace with actual user ID from auth
      full_name: 'Admin User', // Replace with actual user name
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
      bookings={bookings || []}
      employees={employees}
      auditLogs={auditLogs}
      onUpdateBookings={handleUpdateBookings}
      onUpdateEmployees={handleUpdateEmployees}
      onAddAuditLog={handleAddAuditLog}
      onUpdateBusiness={handleUpdateBusiness}
      onShowQrModal={handleShowQrModal}
    />
  );
}

export default StaffPortalTab;
