import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HotelConfig } from '../types';

export default function HotelSetup() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<HotelConfig>({
    businessId: '',
    totalRooms: 0,
    averageRoomPrice: 0,
    seasons: {
      low: { start: '01 May', end: '31 Aug', multiplier: 0.7 },
      medium: { start: '01 Sep', end: '30 Nov', multiplier: 1.0 },
      high: { start: '01 Dec', end: '30 Apr', multiplier: 1.5 }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const [csvTemplate, setCsvTemplate] = useState(false);

  useEffect(() => {
    // Verify setup token
    fetch(`/.netlify/functions/verify-setup-token?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.valid) {
          setConfig(prev => ({ ...prev, businessId: data.businessId }));
        } else {
          navigate('/invalid-token');
        }
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await fetch('/.netlify/functions/save-hotel-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });

    // If user wants CSV template
    if (csvTemplate) {
      window.open('/csv-template.csv');
    }

    navigate('/setup-complete');
  };

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12">
          <h1 className="text-3xl font-serif font-bold text-stone-900 mb-2">
            Complete Your Setup
          </h1>
          <p className="text-stone-500 mb-8">
            Tell us about your property to get started
          </p>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
                  Total Number of Rooms *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={config.totalRooms}
                  onChange={e => setConfig({...config, totalRooms: parseInt(e.target.value)})}
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
                  value={config.averageRoomPrice}
                  onChange={e => setConfig({...config, averageRoomPrice: parseInt(e.target.value)})}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl"
                />
              </div>
            </div>

            <div className="border-t border-stone-100 pt-8">
              <h2 className="text-xl font-serif font-bold text-stone-900 mb-6">
                Seasonal Pricing
              </h2>
              
              <div className="space-y-6">
                {(['low', 'medium', 'high'] as const).map(season => (
                  <div key={season} className="bg-stone-50 p-6 rounded-xl">
                    <h3 className="font-bold capitalize text-stone-900 mb-4">
                      {season} Season
                    </h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs text-stone-500">Start Date</label>
                        <input
                          type="text"
                          value={config.seasons[season].start}
                          onChange={e => setConfig({
                            ...config,
                            seasons: {
                              ...config.seasons,
                              [season]: {
                                ...config.seasons[season],
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
                          value={config.seasons[season].end}
                          onChange={e => setConfig({
                            ...config,
                            seasons: {
                              ...config.seasons,
                              [season]: {
                                ...config.seasons[season],
                                end: e.target.value
                              }
                            }
                          })}
                          className="w-full px-3 py-2 border border-stone-200 rounded-lg mt-1"
                          placeholder="31 Aug"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-stone-500">Price Multiplier</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.5"
                          max="3"
                          value={config.seasons[season].multiplier}
                          onChange={e => setConfig({
                            ...config,
                            seasons: {
                              ...config.seasons,
                              [season]: {
                                ...config.seasons[season],
                                multiplier: parseFloat(e.target.value)
                              }
                            }
                          })}
                          className="w-full px-3 py-2 border border-stone-200 rounded-lg mt-1"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-stone-100 pt-8">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                <h3 className="font-bold text-amber-900 mb-3">Import Existing Data (Optional)</h3>
                <p className="text-sm text-amber-800 mb-4">
                  Would you like to download a CSV template for importing your existing guest data?
                </p>
                
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={csvTemplate}
                    onChange={e => setCsvTemplate(e.target.checked)}
                    className="w-5 h-5 rounded border-stone-300 text-amber-600"
                  />
                  <span className="text-sm text-stone-700">
                    Yes, send me the CSV template after setup
                  </span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-amber-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-amber-700 transition-colors"
            >
              Complete Setup & Access Dashboard
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
