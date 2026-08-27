import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { useTranslation } from '../i18n';

export default function PasswordRecovery() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'identify' | 'code'>('identify');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleIdentify = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    const value = identifier.trim();
    if (!value) return setError(t('auth_recovery_invalid'));
    setLoading(true);

    try {
      if (value.includes('@')) {
        const response = await fetch('/.netlify/functions/request-password-reset', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: value }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || t('auth_recovery_start_failed'));
        setMessage(t('auth_recovery_email_sent'));
      } else {
        const response = await fetch('/.netlify/functions/employee-password-reset-request', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: value }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || t('auth_recovery_start_failed'));
        setMessage(data.message || t('auth_recovery_sms_sent'));
        if (data.success) setStep('code');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth_recovery_start_failed'));
    } finally { setLoading(false); }
  };

  const handleConfirm = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(code)) return setError(t('auth_recovery_code_invalid'));
    if (password.length < 8) return setError(t('auth_recovery_password_short'));
    if (password !== confirmPassword) return setError(t('auth_recovery_password_mismatch'));
    setLoading(true);

    try {
      const response = await fetch('/.netlify/functions/employee-password-reset-confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: identifier, code, password }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || t('auth_recovery_reset_failed'));
      setMessage(t('auth_recovery_success'));
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth_recovery_reset_failed'));
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md"><div className="flex justify-center"><Logo size="lg" /></div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">{t('auth_recovery_title')}</h2>
        <p className="mt-2 text-center text-sm text-gray-600">{t('auth_recovery_help')}</p>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"><div className="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10">
        {error && <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
        {message && <div className="mb-5 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{message}</div>}
        {step === 'identify' ? (
          <form className="space-y-6" onSubmit={handleIdentify}>
            <div><label htmlFor="recovery-identifier" className="block text-sm font-medium text-gray-700">{t('auth_recovery_identifier')}</label>
              <input id="recovery-identifier" type="text" autoComplete="username" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50">{loading ? t('common_processing') : t('auth_recovery_continue')}</button>
          </form>
        ) : (
          <form className="space-y-6" onSubmit={handleConfirm}>
            <div><label htmlFor="recovery-code" className="block text-sm font-medium text-gray-700">{t('auth_recovery_code_title')}</label>
              <input id="recovery-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm tracking-[0.4em] text-center text-xl focus:outline-none focus:ring-orange-500 focus:border-orange-500" />
              <p className="mt-1 text-xs text-gray-500">{t('auth_recovery_code_help')}</p>
            </div>
            <div><label htmlFor="recovery-password" className="block text-sm font-medium text-gray-700">{t('auth_recovery_new_password')}</label>
              <input id="recovery-password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500" />
            </div>
            <div><label htmlFor="recovery-confirm" className="block text-sm font-medium text-gray-700">{t('auth_recovery_confirm_password')}</label>
              <input id="recovery-confirm" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50">{loading ? t('common_processing') : t('auth_recovery_reset')}</button>
          </form>
        )}
        <div className="mt-6 text-center"><button type="button" onClick={() => navigate('/login')} className="text-sm font-medium text-orange-600 hover:text-orange-500">{t('common_back')}</button></div>
      </div></div>
    </div>
  );
}
