import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { useTranslation } from '../i18n';

export default function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const value = identifier.trim();
    const isBusiness = value.includes('@');

    try {
      const response = await fetch(
        isBusiness ? '/.netlify/functions/business-login' : '/.netlify/functions/employee-login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: isBusiness
            ? JSON.stringify({ email: value, password, rememberMe: true })
            : JSON.stringify({ phone: value.replace(/\D/g, ''), password })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success || !data.token) {
        setError(data.error || t('login_error_invalid_credentials'));
        return;
      }

      if (isBusiness) {
        const authData = {
          type: 'business',
          token: data.token,
          token_expiry: data.token_expiry || '7d',
          user: {
            id: data.business.id,
            email: data.business.email,
            name: data.business.trading_name,
            businessId: data.business.id,
            role: 'business'
          }
        };
        localStorage.setItem('fastcheckin_auth', JSON.stringify(authData));
        localStorage.setItem('fastcheckin_business_auth', JSON.stringify(authData));
        localStorage.setItem('business', JSON.stringify({
          id: data.business.id,
          trading_name: data.business.trading_name,
          email: data.business.email,
          status: data.business.status,
          token: data.token
        }));
        window.location.href = data.business.status === 'pending' ? '/business/pending' : '/business/dashboard';
      } else {
        const phone = value.replace(/\D/g, '');
        if (phone.length < 9) {
          setError(t('login_error_invalid_phone'));
          return;
        }
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
        window.location.href = '/employee/dashboard';
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(t('login_error_generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center"><Logo size="lg" /></div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">{t('login_sign_in')}</h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {t('login_email_label')} / {t('login_phone_label')}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10">
          {error && <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="login-identifier" className="block text-sm font-medium text-gray-700">
                {t('login_email_label')} / {t('login_phone_label')}
              </label>
              <input
                id="login-identifier"
                type="text"
                autoComplete="username"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                placeholder={`${t('login_email_placeholder')} / ${t('login_phone_placeholder')}`}
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-700">{t('login_password_label')}</label>
              <div className="mt-1 relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700" aria-label="Toggle password visibility">
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50">
              {loading ? t('login_signing_in') : t('login_sign_in')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button type="button" onClick={() => navigate('/register')} className="text-sm font-medium text-orange-600 hover:text-orange-500">
              {t('login_new_business')} {t('login_register_here')}
            </button>
          </div>

          <div className="mt-4 text-center">
            <button type="button" onClick={() => navigate('/super-admin-login')} className="text-xs text-gray-400 hover:text-gray-500">
              {t('login_super_admin_login')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
