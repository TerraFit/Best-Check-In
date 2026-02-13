import React, { useState, useEffect } from 'react';
import { useAccess } from '../../context/AccessContext';
import { Navigate } from 'react-router-dom';

export default function ApproveBusinesses() {
  const { isSuperAdmin } = useAccess();
  const [pendingBusinesses, setPendingBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingBusinesses();
  }, []);

  const fetchPendingBusinesses = async () => {
    try {
      const response = await fetch('/.netlify/functions/get-pending-businesses');
      const data = await response.json();
      setPendingBusinesses(data);
    } catch (error) {
      console.error('Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveBusiness = async (businessId: string) => {
    try {
      await fetch('/.netlify/functions/approve-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId })
      });
      
      // Refresh list
      fetchPendingBusinesses();
      
      // Generate and send credentials
      await fetch('/.netlify/functions/send-business-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId })
      });
    } catch (error) {
      console.error('Approval failed:', error);
    }
  };

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-serif font-bold text-stone-900 mb-8">
        Pending Business Approvals
      </h1>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : pendingBusinesses.length === 0 ? (
        <div className="text-center py-12 bg-stone-50 rounded-2xl">
          <p className="text-stone-500">No pending approvals</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingBusinesses.map((business: any) => (
            <div key={business.id} className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-stone-900">{business.tradingName}</h3>
                  <p className="text-stone-500 text-sm mt-1">{business.registeredName}</p>
                  <div className="flex gap-4 mt-3 text-xs">
                    <span className="bg-stone-100 px-3 py-1 rounded-full">Reg: {business.businessNumber}</span>
                    <span className="bg-stone-100 px-3 py-1 rounded-full">{business.phone}</span>
                    <span className="bg-stone-100 px-3 py-1 rounded-full">{business.email}</span>
                  </div>
                  
                  <div className="mt-4">
                    <h4 className="font-bold text-xs uppercase tracking-widest text-stone-400 mb-2">Directors</h4>
                    {business.directors.map((d: any, i: number) => (
                      <div key={i} className="text-sm">
                        {d.name} - ID: {d.idNumber}
                      </div>
                    ))}
                  </div>
                </div>
                
                <button
                  onClick={() => approveBusiness(business.id)}
                  className="bg-amber-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-amber-700"
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
