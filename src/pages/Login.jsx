import React, { useState } from 'react';
import { useAccess } from '../context/AccessContext';

export default function Login() {
  const { loginAs } = useAccess();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    
    // SUPER ADMIN LOGIN
    if (email === 'superadmin@jbay.app' && password === 'admin123') {
      loginAs('superadmin@jbay.app', 'super_admin');
      window.location.href = '/super-admin';
      return;
    }

    // Check if this is a hotel manager
    const managers = JSON.parse(localStorage.getItem('jbay_managers') || '[]');
    const manager = managers.find(m => m.email === email);
    
    if (manager && password === manager.tempPassword) {
      loginAs(manager.email, manager.role, manager.tenantId);
      window.location.href = '/admin';
      return;
    }

    alert('Invalid credentials');
  };

  // Quick test buttons
  const testLogins = [
    { email: 'superadmin@jbay.app', role: 'super_admin', label: 'Login as Super Admin' },
  ];

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-serif font-bold text-stone-900 mb-2">J-Bay Zebra Lodge</h1>
        <p className="text-stone-600 mb-8">Check-In System · Admin Login</p>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500"
              placeholder="admin@hotel.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500"
              placeholder="••••••••"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-stone-900 text-white font-bold py-4 rounded-xl hover:bg-stone-800 transition-colors"
          >
            Sign In
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-stone-200">
          <p className="text-xs text-stone-500 text-center mb-4">TEST CREDENTIALS (Remove in production)</p>
          <div className="space-y-2">
            {testLogins.map((test) => (
              <button
                key={test.email}
                onClick={() => {
                  setEmail(test.email);
                  setPassword('admin123');
                }}
                className="w-full text-left px-4 py-2 bg-stone-100 rounded-lg text-sm hover:bg-stone-200 transition-colors"
              >
                {test.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
