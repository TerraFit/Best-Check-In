import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccess } from '../context/AccessContext';

interface BusinessProfile {
  id: string;
  trading_name: string;
  registered_name: string;
  email: string;
  phone: string;
  total_rooms?: number;
  avg_price?: number;
  status?: string; // Add status field
  seasons?: {
    low: { enabled: boolean; multiplier: number; start?: string; end?: string };
    medium: { enabled: boolean; multiplier: number; start?: string; end?: string };
    high: { enabled: boolean; multiplier: number; start?: string; end?: string };
  };
  setup_complete: boolean;
}

export default function BusinessDashboard() {
  const navigate = useNavigate();
  const { user } = useAccess();
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    loadBusinessData();
  }, []);

  const loadBusinessData = async () => {
    try {
      const response = await fetch(`/.netlify/functions/get-business/${user?.tenantId}`);
      const data = await response.json();
      
      // Double-check approval status - THIS IS THE ONLY NEW LOGIC
      if (data.status !== 'approved') {
        navigate('/business/pending');
        return;
      }
      
      setBusiness(data);
      setShowSetup(!data.setup_complete);
    } catch (error) {
      console.error('Failed to load business:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jbay_user');
    localStorage.removeItem('business_data');
    navigate('/business/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-stone-900 text-white py-6 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tighter">
              FAST<span className="text-amber-500">CHECKIN</span>
            </h1>
            <p className="text-stone-400 text-sm mt-1">{business?.trading_name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-stone-400 hover:text-white text-sm"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {showSetup ? (
          <BusinessSetup business={business} onComplete={loadBusinessData} />
        ) : (
          <BusinessOverview business={business} />
        )}
      </div>
    </div>
  );
}

function BusinessSetup({ business, onComplete }: { business: any; onComplete: () => void }) {
  const [formData, setFormData] = useState({
    total_rooms: business?.total_rooms || '',
    avg_price: business?.avg_price || '',
    seasons: business?.seasons || {
      low: { enabled: false, multiplier: 0.7, start: '01 May', end: '31 Aug' },
      medium: { enabled: true, multiplier: 1.0, start: '01 Sep', end: '30 Nov' },
      high: { enabled: false, multiplier: 1.5, start: '01 Dec', end: '30 Apr' }
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/.netlify/functions/update-business-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          ...formData,
          setup_complete: true
        })
      });

      if (response.ok) {
        onComplete();
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <h2 className="text-3xl font-serif font-bold text-stone-900 mb-2">
        Complete Your Business Profile
      </h2>
      <p className="text-stone-500 mb-8">
        Set up your property details to start accepting check-ins
      </p>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
              Total Number of Rooms *
            </label>
            <input
              type="number"
              required
              min="1"
              value={formData.total_rooms}
              onChange={(e) => setFormData({...formData, total_rooms: e.target.value})}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
              Average Room Price (ZAR) *
            </label>
            <input
              type="number"
              required
              min="0"
              value={formData.avg_price}
              onChange={(e) => setFormData({...formData, avg_price: e.target.value})}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl"
            />
          </div>
        </div>

        {/* Seasonal Pricing */}
        <div className="border-t border-stone-100 pt-8">
          <h3 className="text-xl font-serif font-bold text-stone-900 mb-6">
            Seasonal Pricing
          </h3>

          {['low', 'medium', 'high'].map((season) => (
            <div key={season} className="mb-6 p-6 bg-stone-50 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.seasons[season].enabled}
                    onChange={(e) => setFormData({
                      ...formData,
                      seasons: {
                        ...formData.seasons,
                        [season]: {
                          ...formData.seasons[season],
                          enabled: e.target.checked
                        }
                      }
                    })}
                    className="w-5 h-5 rounded border-stone-300 text-amber-600"
                  />
                  <span className="font-bold capitalize">{season} Season</span>
                </label>
              </div>

              {formData.seasons[season].enabled && (
                <div className="grid md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="text-xs text-stone-500">Start Date</label>
                    <input
                      type="text"
                      value={formData.seasons[season].start || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        seasons: {
                          ...formData.seasons,
                          [season]: {
                            ...formData.seasons[season],
                            start: e.target.value
                          }
                        }
                      })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg mt-1"
                      placeholder="01 May"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500">End Date</label>
                    <input
                      type="text"
                      value={formData.seasons[season].end || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        seasons: {
                          ...formData.seasons[season],
                          end: e.target.value
                        }
                      })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg mt-1"
                      placeholder="31 Aug"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500">Multiplier</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="3"
                      value={formData.seasons[season].multiplier}
                      onChange={(e) => setFormData({
                        ...formData,
                        seasons: {
                          ...formData.seasons[season],
                          multiplier: parseFloat(e.target.value)
                        }
                      })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg mt-1"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* QR Code Preview */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h4 className="font-bold text-amber-900 mb-3">Your Check-in QR Code</h4>
          <p className="text-amber-800 text-sm mb-4">
            After setup, you'll get a unique QR code for your business. Guests scan it to check in.
          </p>
          <div className="bg-white p-4 rounded-xl inline-block">
            <div className="w-32 h-32 bg-stone-200 animate-pulse rounded-lg flex items-center justify-center text-stone-400 text-xs">
              QR Code
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-amber-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-amber-700 transition-colors"
        >
          Complete Setup & Generate QR Code
        </button>
      </form>
    </div>
  );
}

function BusinessOverview({ business }: { business: any }) {
  return (
    <div className="space-y-8">
      {/* Welcome Card */}
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <h2 className="text-3xl font-serif font-bold text-stone-900 mb-2">
          Welcome back, {business?.trading_name}!
        </h2>
        <p className="text-stone-500 mb-6">
          Your business is ready to accept check-ins.
        </p>

        {/* QR Code */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 inline-block">
          <h3 className="font-bold text-amber-900 mb-3">Your Check-in QR Code</h3>
          <div className="bg-white p-4 rounded-xl">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${window.location.origin}/checkin/${business.id}`}
              alt="Check-in QR Code"
              className="w-32 h-32"
            />
          </div>
          <p className="text-xs text-amber-700 mt-3">
            Guests scan this code to check in
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h4 className="text-xs uppercase tracking-widest text-stone-400">Total Rooms</h4>
          <p className="text-3xl font-serif font-bold text-stone-900 mt-2">{business?.total_rooms || '—'}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <h4 className="text-xs uppercase tracking-widest text-stone-400">Avg. Price</h4>
          <p className="text-3xl font-serif font-bold text-stone-900 mt-2">
            {business?.avg_price ? `R${business.avg_price}` : '—'}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <h4 className="text-xs uppercase tracking-widest text-stone-400">Check-ins Today</h4>
          <p className="text-3xl font-serif font-bold text-stone-900 mt-2">0</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <button
          onClick={() => window.open(`/checkin/${business.id}`, '_blank')}
          className="bg-amber-600 text-white p-6 rounded-xl text-left hover:bg-amber-700 transition-colors"
        >
          <h3 className="text-xl font-bold mb-2">Guest Check-in Page</h3>
          <p className="text-amber-100 text-sm">Direct link for your guests</p>
        </button>
        <button
          onClick={() => window.location.href = '/admin'}
          className="bg-stone-900 text-white p-6 rounded-xl text-left hover:bg-stone-800 transition-colors"
        >
          <h3 className="text-xl font-bold mb-2">Management Portal</h3>
          <p className="text-stone-400 text-sm">View analytics and guest registry</p>
        </button>
      </div>
    </div>
  );
}
