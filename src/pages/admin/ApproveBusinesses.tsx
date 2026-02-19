// In src/pages/Admin/ApproveBusinesses.tsx

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface Director {
  name: string;
  idNumber: string;
  idPhoto?: string; // base64 string
}

interface Business {
  id: string;
  registered_name: string;
  business_number: string;
  trading_name: string;
  phone: string;
  email: string;
  physical_address: any;
  postal_address: any;
  directors: Director[];
  subscription_tier: string;
  payment_method: string;
  status: string;
  total_rooms?: number;
  avg_price?: number;
  seasons?: any;
  setup_complete?: boolean;
  created_at: string;
}

export default function ApproveBusinesses() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [showIdModal, setShowIdModal] = useState(false);
  const [selectedIdPhoto, setSelectedIdPhoto] = useState('');

  useEffect(() => {
    fetchPendingBusinesses();
  }, []);

  const fetchPendingBusinesses = async () => {
    try {
      const response = await fetch('/.netlify/functions/get-pending-businesses');
      const data = await response.json();
      setBusinesses(data);
    } catch (error) {
      console.error('Error fetching businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (businessId: string) => {
    try {
      const response = await fetch('/.netlify/functions/approve-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId })
      });

      if (response.ok) {
        // Remove from list
        setBusinesses(businesses.filter(b => b.id !== businessId));
      }
    } catch (error) {
      console.error('Error approving business:', error);
    }
  };

  const viewIdPhoto = (photoBase64: string) => {
    setSelectedIdPhoto(photoBase64);
    setShowIdModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600">Loading pending businesses...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Pending Business Approvals ({businesses.length})
          </h1>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Back to Dashboard
          </button>
        </div>

        {businesses.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 text-lg">No pending businesses to approve</p>
            <p className="text-gray-400 mt-2">Check back later for new registrations</p>
          </div>
        ) : (
          <div className="space-y-6">
            {businesses.map((business) => (
              <div key={business.id} className="bg-white rounded-lg shadow overflow-hidden">
                {/* Business Header */}
                <div className="bg-orange-50 px-6 py-4 border-b border-orange-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {business.trading_name}
                      </h2>
                      <p className="text-sm text-gray-600">
                        Registered as: {business.registered_name}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                      Pending
                    </span>
                  </div>
                </div>

                {/* Business Details */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column - Business Info */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Business Information</h3>
                      <dl className="space-y-3">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Business Number</dt>
                          <dd className="text-sm text-gray-900">{business.business_number}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Contact</dt>
                          <dd className="text-sm text-gray-900">{business.phone}</dd>
                          <dd className="text-sm text-gray-900">{business.email}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Subscription</dt>
                          <dd className="text-sm text-gray-900 capitalize">{business.subscription_tier}</dd>
                          <dd className="text-sm text-gray-900">Payment: {business.payment_method}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Physical Address</dt>
                          <dd className="text-sm text-gray-900 whitespace-pre-line">
                            {business.physical_address?.street}<br />
                            {business.physical_address?.city}, {business.physical_address?.province}<br />
                            {business.physical_address?.postalCode}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    {/* Right Column - Directors with ID Photos */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Directors / Owners</h3>
                      <div className="space-y-4">
                        {business.directors.map((director, index) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-gray-900">{director.name}</p>
                                <p className="text-sm text-gray-600">ID: {director.idNumber}</p>
                              </div>
                              {director.idPhoto && (
                                <button
                                  onClick={() => viewIdPhoto(director.idPhoto!)}
                                  className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100"
                                >
                                  View ID Photo
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Approve Button */}
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => handleApprove(business.id)}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                    >
                      Approve Business
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ID Photo Modal */}
        {showIdModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">ID Document</h3>
                  <button
                    onClick={() => setShowIdModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                <div className="bg-gray-100 rounded-lg p-4 flex justify-center">
                  <img 
                    src={selectedIdPhoto} 
                    alt="ID Document" 
                    className="max-w-full max-h-[70vh] object-contain"
                  />
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => {
                      // Download the image
                      const link = document.createElement('a');
                      link.href = selectedIdPhoto;
                      link.download = 'id-document.png';
                      link.click();
                    }}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                  >
                    Download Image
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
