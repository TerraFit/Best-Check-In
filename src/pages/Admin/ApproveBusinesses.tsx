import React, { useState, useEffect } from 'react';
import { useAccess } from '../../context/AccessContext';
import { Navigate } from 'react-router-dom';

interface Business {
  id: string;
  registered_name: string;
  business_number: string;
  trading_name: string;
  phone: string;
  email: string;
  directors: any[];
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export default function ApproveBusinesses() {
  const { isSuperAdmin } = useAccess();
  const [pendingBusinesses, setPendingBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingBusinesses();
  }, []);

  const fetchPendingBusinesses = async () => {
    setError(null);
    try {
      const response = await fetch('/.netlify/functions/get-pending-businesses');
      const data = await response.json();
      
      console.log('📦 API Response:', data); // Debug log
      
      // Handle different response formats
      if (Array.isArray(data)) {
        setPendingBusinesses(data);
      } else if (data && Array.isArray(data.data)) {
        setPendingBusinesses(data.data);
      } else {
        console.error('Unexpected API response format:', data);
        setPendingBusinesses([]);
        setError('Received invalid data format from server');
      }
    } catch (error) {
      console.error('Failed to fetch:', error);
      setError('Failed to load pending businesses');
      setPendingBusinesses([]);
    } finally {
      setLoading(false);
    }
  };

  const approveBusiness = async (businessId: string) => {
    try {
      // Update status to approved
      const approveResponse = await fetch('/.netlify/functions/approve-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId })
      });
      
      const approveData = await approveResponse.json();
      
      if (approveResponse.ok) {
        // Send credentials email
        const emailResponse = await fetch('/.netlify/functions/send-business-credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId })
        });
        
        const emailData = await emailResponse.json();
        console.log('📧 Email response:', emailData);
        
        // Refresh list
        fetchPendingBusinesses();
        
        // Optional: Show success message
        alert('Business approved and credentials sent!');
      } else {
        alert(`Approval failed: ${approveData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Approval failed:', error);
      alert('Failed to approve business. Check console for details.');
    }
  };

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header with Back Button - THIS IS THE ONLY CHANGE */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.location.href = '/super-admin'}
            className="text-stone-600 hover:text-stone-900 flex items-center gap-2 text-sm font-medium bg-stone-100 hover:bg-stone-200 px-4 py-2 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Super Admin
          </button>
          <h1 className="text-3xl font-serif font-bold text-stone-900">
            Pending Business Approvals
          </h1>
        </div>
        <button
          onClick={fetchPendingBusinesses}
          className="text-sm text-stone-600 hover:text-stone-900 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-stone-200 border-t-amber-600"></div>
          <p className="mt-4 text-stone-500">Loading pending approvals...</p>
        </div>
      ) : pendingBusinesses.length === 0 ? (
        <div className="text-center py-16 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-300">
          <svg className="w-16 h-16 text-stone-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-stone-500 text-lg">No pending approvals</p>
          <p className="text-stone-400 text-sm mt-2">New business registrations will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingBusinesses.map((business) => (
            <div key={business.id} className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-stone-900">{business.trading_name}</h3>
                      <p className="text-stone-500 text-sm mt-1">{business.registered_name}</p>
                    </div>
                    <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase">
                      Pending
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 mt-4 text-xs">
                    <span className="bg-stone-100 px-3 py-1.5 rounded-full font-medium">
                      Reg: {business.business_number}
                    </span>
                    <span className="bg-stone-100 px-3 py-1.5 rounded-full font-medium">
                      {business.phone}
                    </span>
                    <span className="bg-stone-100 px-3 py-1.5 rounded-full font-medium">
                      {business.email}
                    </span>
                  </div>
                  
                  {business.directors && business.directors.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-bold text-xs uppercase tracking-widest text-stone-400 mb-2">
                        Directors ({business.directors.length})
                      </h4>
                      <div className="space-y-1">
                        {business.directors.map((d: any, i: number) => (
                          <div key={i} className="text-sm text-stone-600">
                            • {d.name} - <span className="font-mono">{d.idNumber}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-stone-400 mt-4">
                    Registered: {new Date(business.created_at).toLocaleDateString()} at{' '}
                    {new Date(business.created_at).toLocaleTimeString()}
                  </p>
                </div>
                
                <button
                  onClick={() => approveBusiness(business.id)}
                  className="w-full md:w-auto bg-amber-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-amber-700 transition-colors shadow-lg text-sm uppercase tracking-widest"
                >
                  Approve & Send Credentials
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
