import React, { useState } from 'react';
import { useAccess } from '../context/AccessContext';
import { Navigate } from 'react-router-dom';

export default function SuperAdminPortal() {
  const { isSuperAdmin, loginAs } = useAccess();
  const [hotelName, setHotelName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [hotels, setHotels] = useState(() => {
    // Load existing hotels from localStorage (replace with Netlify Blobs later)
    return JSON.parse(localStorage.getItem('jbay_hotels') || '[]');
  });

  // Redirect non-super-admins
  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  const createHotel = (e) => {
    e.preventDefault();
    
    // Generate unique tenant ID from hotel name
    const tenantId = hotelName.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const newHotel = {
      id: tenantId,
      name: hotelName,
      managerEmail: managerEmail,
      createdAt: new Date().toISOString(),
      createdBy: 'super_admin',
      status: 'active'
    };

    // Save hotel
    const updatedHotels = [...hotels, newHotel];
    setHotels(updatedHotels);
    localStorage.setItem('jbay_hotels', JSON.stringify(updatedHotels));

    // Create manager account with one-time credential
    const tempPassword = Math.random().toString(36).slice(-8);
    const managerAccount = {
      email: managerEmail,
      role: 'tenant_admin',
      tenantId: tenantId,
      hotelName: hotelName,
      tempPassword: tempPassword,
      created: new Date().toISOString()
    };
    
    // Save manager account
    const managers = JSON.parse(localStorage.getItem('jbay_managers') || '[]');
    localStorage.setItem('jbay_managers', JSON.stringify([...managers, managerAccount]));

    // Show credentials
    alert(`
      ✅ HOTEL CREATED SUCCESSFULLY
      
      Hotel: ${hotelName}
      Manager: ${managerEmail}
      Temporary Password: ${tempPassword}
      Tenant ID: ${tenantId}
      
      Save these credentials! They won't be shown again.
    `);

    // Clear form
    setHotelName('');
    setManagerEmail('');
  };

  const loginAsHotel = (email, role, tenantId) => {
    loginAs(email, role, tenantId);
    alert(`Now logged in as ${email} (${role})`);
    window.location.href = '/admin';
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Super Admin Header */}
      <div className="bg-stone-900 text-white py-6 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-amber-600 text-xs uppercase tracking-wider px-3 py-1 rounded-full font-bold">
              Super Admin
            </span>
            <span className="text-stone-400">Root Access · All Tenants</span>
          </div>
          <h1 className="text-3xl font-serif font-bold">Hotel Management Portal</h1>
          <p className="text-stone-400 mt-2">Create hotels, grant admin access, and monitor all properties</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Create Hotel Form */}
        <div className="bg-white rounded-2xl shadow-lg border border-stone-200 p-8 mb-12">
          <h2 className="text-2xl font-serif font-bold text-stone-900 mb-6">Grant Admin Access to New Hotel</h2>
          
          <form onSubmit={createHotel} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">
                  Hotel / Lodge Name
                </label>
                <input
                  type="text"
                  required
                  value={hotelName}
                  onChange={(e) => setHotelName(e.target.value)}
                  className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="e.g. J-Bay Zebra Lodge"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">
                  Manager Email
                </label>
                <input
                  type="email"
                  required
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="manager@hotel.com"
                />
              </div>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <h3 className="font-bold text-amber-900 text-sm uppercase tracking-wider mb-2">
                ⚡ One-Click Provisioning
              </h3>
              <p className="text-amber-800 text-sm">
                This will create a tenant ID, generate a temporary password, and grant full admin rights 
                to the manager. They can log in immediately and start managing their hotel's check-in system.
              </p>
            </div>

            <button
              type="submit"
              className="bg-stone-900 text-white font-bold py-4 px-8 rounded-xl hover:bg-stone-800 transition-colors shadow-lg"
            >
              Create Hotel & Grant Admin Access
            </button>
          </form>
        </div>

        {/* Active Hotels List */}
        <div className="bg-white rounded-2xl shadow-lg border border-stone-200 p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-serif font-bold text-stone-900">Active Hotels</h2>
            <span className="bg-stone-100 text-stone-700 px-4 py-2 rounded-full text-sm font-bold">
              {hotels.length} Properties
            </span>
          </div>

          {hotels.length === 0 ? (
            <div className="text-center py-16 bg-stone-50 rounded-xl border-2 border-dashed border-stone-300">
              <p className="text-stone-500 text-lg">No hotels created yet</p>
              <p className="text-stone-400 text-sm mt-2">Use the form above to grant your first hotel admin access</p>
            </div>
          ) : (
            <div className="space-y-4">
              {hotels.map((hotel) => (
                <div key={hotel.id} className="border border-stone-200 rounded-xl p-5 hover:border-amber-300 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-stone-900 text-lg">{hotel.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-stone-600">Manager: {hotel.managerEmail}</span>
                        <span className="text-xs bg-stone-100 px-2 py-1 rounded-full text-stone-600">
                          ID: {hotel.id}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => loginAsHotel(hotel.managerEmail, 'tenant_admin', hotel.id)}
                        className="bg-amber-100 text-amber-800 px-4 py-2 rounded-lg text-sm font-bold hover:bg-amber-200 transition-colors"
                      >
                        🔑 Login as Manager
                      </button>
                      <button className="border border-stone-300 text-stone-700 px-4 py-2 rounded-lg text-sm hover:bg-stone-50 transition-colors">
                        View Stats
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Access Panel */}
        <div className="mt-8 bg-gradient-to-r from-stone-900 to-stone-800 rounded-2xl p-8 text-white">
          <h3 className="font-serif text-xl font-bold mb-4">Super Admin Quick Actions</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <button className="bg-white/10 hover:bg-white/20 p-4 rounded-xl text-left transition-colors">
              <div className="font-bold">Export All Data</div>
              <div className="text-sm text-stone-400">CSV of every hotel's check-ins</div>
            </button>
            <button className="bg-white/10 hover:bg-white/20 p-4 rounded-xl text-left transition-colors">
              <div className="font-bold">System Health</div>
              <div className="text-sm text-stone-400">View all tenants and usage</div>
            </button>
            <button className="bg-white/10 hover:bg-white/20 p-4 rounded-xl text-left transition-colors">
              <div className="font-bold">Create Staff Account</div>
              <div className="text-sm text-stone-400">Add viewer access for hotel staff</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
