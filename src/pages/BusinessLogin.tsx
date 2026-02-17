import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAccess } from '../context/AccessContext';

export default function BusinessLogin() {
  const navigate = useNavigate();
  const { loginAs } = useAccess();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/.netlify/functions/business-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store business data
        localStorage.setItem('business_data', JSON.stringify(data.business));
        
        // Login with proper role and tenant ID
        loginAs(data.business.email, 'tenant_admin', data.business.id);
        
        // Check if business is approved - THIS IS THE ONLY NEW LOGIC
        if (data.business.status === 'approved') {
          navigate('/business/dashboard');
        } else {
          // Show pending approval message
          navigate('/business/pending');
        }
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Branding */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tighter">
            FAST<span className="text-amber-600">CHECKIN</span>
          </h1>
          <p className="text-stone-500 mt-2">Business Admin Portal</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-serif font-bold text-stone-900 mb-6">
            Sign in to your business
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                placeholder="admin@yourhotel.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-600 text-white py-4 rounded-xl font-bold hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/register"
              className="text-sm text-amber-600 hover:text-amber-700 font-medium"
            >
              New business? Register here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
