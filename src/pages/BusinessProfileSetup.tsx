import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccess } from '../context/AccessContext';

export default function BusinessProfileSetup() {
  const navigate = useNavigate();
  const { user } = useAccess();
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<any>(null);
  const [formData, setFormData] = useState({
    total_rooms: '',
    avg_price: '',
    seasons: {
      low: { enabled: false, multiplier: 0.7, start: '01 May', end: '31 Aug' },
      medium: { enabled: true, multiplier: 1.0, start: '01 Sep', end: '30 Nov' },
      high: { enabled: false, multiplier: 1.5, start: '01 Dec', end: '30 Apr' }
    }
  });

  useEffect(() => {
    loadBusinessData();
  }, []);

  const loadBusinessData = async () => {
    try {
      const response = await fetch(`/.netlify/functions/get-business/${user?.tenantId}`);
      const data = await response.json();
      setBusiness(data);
      
      // Load existing data if any
      if (data.total_rooms) setFormData(prev => ({ ...prev, total_rooms: data.total_rooms }));
      if (data.avg_price) setFormData(prev => ({ ...prev, avg_price: data.avg_price }));
      if (data.seasons) setFormData(prev => ({ ...prev, seasons: data.seasons }));
    } catch (error) {
      console.error('Failed to load business:', error);
    } finally {
      setLoading(false);
    }
  };

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
        navigate('/business/dashboard');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-serif font-bold text-stone-900 mb-2">
            Welcome to FastCheckin, {business?.trading_name}!
          </h1>
          <p className="text-xl text-stone-500">
            Let's set up your business profile
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 space-y-8">
          {/* Business Info Summary */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
            <h3 className="font-bold text-amber-900 mb-3">Business Information</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-stone-500">Trading Name:</span>
                <p className="font-medium text-stone-900">{business?.trading_name}</p>
              </div>
              <div>
                <span className="text-stone-500">Registered Name:</span>
                <p className="font-medium text-stone-900">{business?.registered_name}</p>
              </div>
              <div>
                <span className="text-stone-500">Email:</span>
                <p className="font-medium text-stone-900">{business?.email}</p>
              </div>
              <div>
                <span className="text-stone-500">Phone:</span>
                <p className="font-medium text-stone-900">{business?.phone}</p>
              </div>
            </div>
          </div>

          {/* Property Details */}
          <div>
            <h2 className="text-2xl font-serif font-bold text-stone-900 mb-6">Property Details</h2>
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
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g., 20"
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
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g., 1200"
                />
              </div>
            </div>
          </div>

          {/* Seasonal Pricing */}
          <div>
            <h2 className="text-2xl font-serif font-bold text-stone-900 mb-6">Seasonal Pricing</h2>
            <p className="text-stone-500 mb-6">
              Set your seasonal rates. Medium season is required as your baseline.
            </p>

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
                      disabled={season === 'medium'} // Medium is always enabled
                    />
                    <span className="font-bold capitalize">{season} Season</span>
                    {season === 'medium' && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                        Required
                      </span>
                    )}
                  </label>
                </div>

                {formData.seasons[season].enabled && (
                  <div className="grid md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="text-xs text-stone-500">Start Date</label>
                      <input
                        type="text"
                        value={formData.seasons[season].start}
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
                        placeholder="DD MMM"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-stone-500">End Date</label>
                      <input
                        type="text"
                        value={formData.seasons[season].end}
                        onChange={(e) => setFormData({
                          ...formData,
                          seasons: {
                            ...formData.seasons[season],
                            end: e.target.value
                          }
                        })}
                        className="w-full px-3 py-2 border border-stone-200 rounded-lg mt-1"
                        placeholder="DD MMM"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-stone-500">Price Multiplier</label>
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
                      <p className="text-[10px] text-stone-400 mt-1">
                        Base price × multiplier
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* QR Code Preview */}
          <div className="bg-amber-50 border-2 border-dashed border-amber-300 rounded-xl p-8 text-center">
            <div className="bg-white p-4 rounded-xl inline-block mb-4">
              <div className="w-32 h-32 bg-stone-200 animate-pulse rounded-lg flex items-center justify-center text-stone-400 text-xs">
                QR Code
              </div>
            </div>
            <h3 className="font-bold text-amber-900 text-lg mb-2">Your Check-in QR Code</h3>
            <p className="text-amber-700 text-sm mb-4">
              After completing setup, you can download and print this QR code
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-stone-500">
              <span>FASTCHECKIN</span>
              <span>•</span>
              <span className="font-medium">{business?.trading_name}</span>
              <span>•</span>
              <span>Scan Me</span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-amber-600 text-white py-5 rounded-xl font-bold text-lg hover:bg-amber-700 transition-colors shadow-lg"
          >
            Complete Setup & Generate QR Code
          </button>
        </form>
      </div>
    </div>
  );
}
