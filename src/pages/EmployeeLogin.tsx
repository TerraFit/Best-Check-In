// src/pages/EmployeeLogin.tsx
// ✅ FIXED: Handles phone number input properly

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { Phone, Lock, Eye, EyeOff, AlertCircle, LogIn } from 'lucide-react';
import { useTranslation } from '../i18n';

function EmployeeLogin() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ✅ Format phone number as user types - remove spaces and special characters
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits
    const digitsOnly = e.target.value.replace(/\D/g, '');
    setPhone(digitsOnly);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // ✅ Phone is already digits only from the input
    const cleanPhone = phone.trim();
    
    // Validate phone length
    if (cleanPhone.length < 9) {
      setError(t('login_error_invalid_phone'));
      setLoading(false);
      return;
    }

    console.log('📱 Login attempt for phone:', cleanPhone);
    
    try {
      const response = await fetch('/.netlify/functions/employee-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone: cleanPhone,  // ✅ Send as 'phone' (the function handles both)
          password 
        })
      });

      const data = await response.json();
      console.log('📡 Login response:', data);

      if (response.ok && data.success && data.token) {
        const authData = {
          type: 'employee' as const,
          token: data.token,
          token_expiry: data.token_expiry || '7d',
          user: {
            id: data.employee.id,
            email: data.employee.phone_number,
            name: data.employee.full_name,
            businessId: data.employee.business_id,
            role: data.employee.role || 'EmployeeOverview'
          }
        };
        
        localStorage.setItem('fastcheckin_employee_auth', JSON.stringify(authData));
        localStorage.setItem('fastcheckin_auth', JSON.stringify(authData));
        
        console.log('✅ Employee login successful, redirecting to dashboard');
        window.location.href = '/employee/dashboard';
      } else {
        setError(data.error || t('login_error_invalid_phone_password'));
      }
    } catch (err) {
      console.error('❌ Login error:', err);
      setError(t('login_error_generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-4">
        <Logo size="lg" className="justify-center" />
        <h2 className="text-3xl font-serif font-black tracking-tight text-white leading-none">
          {t('login_employee_title')}
        </h2>
        <p className="text-stone-400 text-sm">
          {t('login_employee_subtitle')}
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
                {t('login_phone_label')}
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  value={phone}
                  onChange={handlePhoneChange}
                  className="w-full bg-stone-50 border border-stone-200 py-3 pl-10 pr-4 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none font-mono tracking-widest"
                  placeholder={t('login_phone_placeholder')}
                  maxLength={10}
                />
              </div>
              <p className="text-[10px] text-stone-400 mt-1">
                {t('login_phone_hint')}
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                {t('login_password_label')}
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
                  {t('login_signing_in')}
                </>
              ) : (
                <>
                  <LogIn size={16} /> {t('login_sign_in')}
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-stone-100 space-y-3 text-center">
            <Link 
              to="/business/login" 
              className="text-xs text-stone-500 hover:text-amber-600 transition-colors block"
            >
              {t('login_back_to_business')}
            </Link>
            
            <Link 
              to="/" 
              className="text-xs text-stone-400 hover:text-stone-500 transition-colors block"
            >
              {t('common_return_home')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmployeeLogin;
