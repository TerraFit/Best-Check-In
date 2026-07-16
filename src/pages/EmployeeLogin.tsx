// src/pages/EmployeeLogin.tsx
// ✅ Employee Login Page - Phone number + password

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { Phone, Lock, Eye, EyeOff, AlertCircle, LogIn } from 'lucide-react';

function EmployeeLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Clean phone number - remove spaces
      const cleanPhone = phone.replace(/\s+/g, '').trim();
      
      console.log('📱 Login attempt for phone:', cleanPhone);
      
      const response = await fetch('/.netlify/functions/employee-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone_number: cleanPhone,  // ✅ Correct field name
          password 
        })
      });

      const data = await response.json();
      console.log('📡 Login response:', data);

      if (response.ok && data.success && data.token) {
        // Store employee session
        const authData = {
          type: 'employee',
          token: data.token,
          token_expiry: data.token_expiry || '7d',
          user: {
            id: data.employee.id,
            phone: data.employee.phone_number,
            name: data.employee.full_name,
            businessId: data.employee.business_id,
            role: data.employee.role || 'EmployeeOverview'
          }
        };
        
        localStorage.setItem('fastcheckin_auth', JSON.stringify(authData));
        localStorage.setItem('fastcheckin_business_auth', JSON.stringify(authData));
        localStorage.setItem('fastcheckin_employee_auth', JSON.stringify(authData));
        
        // Redirect to dashboard with employee flag
        window.location.href = '/business/dashboard?employee=true';
      } else {
        setError(data.error || 'Invalid phone number or password');
      }
    } catch (err) {
      console.error('❌ Login error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-4">
        <Logo size="lg" className="justify-center" />
        <h2 className="text-3xl font-serif font-black tracking-tight text-white leading-none">
          Employee Portal
        </h2>
        <p className="text-stone-400 text-sm">
          Sign in with your phone number and password
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white rounded-[2rem] shadow-2xl p-8 border border-stone-200">

          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
              <p className="text-xs text-red-800 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 py-3 pl-10 pr-4 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none font-mono"
                  placeholder="083 778 9487 or +27 83 778 9487"
                />
              </div>
              <p className="text-[10px] text-stone-400 mt-1">
                Enter your phone number (local or international format)
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 py-3 pl-10 pr-10 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 text-stone-950 font-extrabold py-4 rounded-xl transition-all shadow-lg text-xs uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-stone-950 border-t-transparent" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn size={16} /> Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-stone-100 space-y-3 text-center">
            <Link 
              to="/business/login" 
              className="text-xs text-stone-500 hover:text-amber-600 transition-colors block"
            >
              ← Back to Business Login
            </Link>
            
            <Link 
              to="/" 
              className="text-xs text-stone-400 hover:text-stone-500 transition-colors block"
            >
              Return to Home
            </Link>
          </div>

          <div className="mt-4 pt-4 border-t border-stone-100">
            <p className="text-[10px] text-stone-400 text-center">
              <span className="block">💡 Demo Employee: 083 778 9487</span>
              <span className="block text-[9px] text-stone-400 mt-0.5">
                Password: the one you set during onboarding
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmployeeLogin;
