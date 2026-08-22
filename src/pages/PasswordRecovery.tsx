import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { getCurrentLanguage, useTranslation } from '../i18n';

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

  const fr = getCurrentLanguage() === 'fr';
  const copy = fr ? {
    title: 'Réinitialiser votre mot de passe',
    help: 'Entrez votre adresse e-mail professionnelle ou votre numéro de téléphone.',
    identifier: 'E-mail / numéro de téléphone',
    send: 'Continuer',
    codeTitle: 'Code de vérification',
    codeHelp: 'Saisissez le code à 6 chiffres envoyé par SMS.',
    newPassword: 'Nouveau mot de passe',
    confirm: 'Confirmer le mot de passe',
    reset: 'Réinitialiser le mot de passe',
    sent: 'Si un compte employé actif correspond à ce numéro, un code de vérification a été envoyé.',
    emailSent: 'Si cette adresse e-mail correspond à un compte, un lien de réinitialisation a été envoyé.',
    success: 'Mot de passe mis à jour. Vous pouvez maintenant vous connecter.',
    invalid: 'Veuillez saisir un numéro de téléphone ou une adresse e-mail valide.',
    mismatch: 'Les mots de passe ne correspondent pas.',
    short: 'Le mot de passe doit contenir au moins 8 caractères.',
  } : {
    title: 'Reset your password',
    help: 'Enter your work email address or phone number.',
    identifier: 'Email / phone number',
    send: 'Continue',
    codeTitle: 'Verification code',
    codeHelp: 'Enter the 6-digit code sent by SMS.',
    newPassword: 'New password',
    confirm: 'Confirm password',
    reset: 'Reset password',
    sent: 'If an active employee account matches that phone number, a verification code has been sent.',
    emailSent: 'If that email belongs to an account, a reset link has been sent.',
    success: 'Password updated. You can now sign in.',
    invalid: 'Please enter a valid phone number or email address.',
    mismatch: 'Passwords do not match.',
    short: 'Password must be at least 8 characters.',
  };

  const handleIdentify = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    const value = identifier.trim();
    if (!value) return setError(copy.invalid);
    setLoading(true);

    try {
      if (value.includes('@')) {
        const response = await fetch('/.netlify/functions/request-password-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: value }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to start recovery');
        setMessage(copy.emailSent);
      } else {
        const response = await fetch('/.netlify/functions/employee-password-reset-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: value }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to start recovery');
        setMessage(data.message || copy.sent);
        if (data.success) setStep('code');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start recovery');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(code)) return setError(copy.codeHelp);
    if (password.length < 8) return setError(copy.short);
    if (password !== confirmPassword) return setError(copy.mismatch);
    setLoading(true);

    try {
      const response = await fetch('/.netlify/functions/employee-password-reset-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: identifier, code, password }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to reset password');
      setMessage(copy.success);
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center"><Logo size="lg" /></div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">{copy.title}</h2>
        <p className="mt-2 text-center text-sm text-gray-600">{copy.help}</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10">
          {error && <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
          {message && <div className="mb-5 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{message}</div>}

          {step === 'identify' ? (
            <form className="space-y-6" onSubmit={handleIdentify}>
              <div>
                <label htmlFor="recovery-identifier" className="block text-sm font-medium text-gray-700">{copy.identifier}</label>
                <input id="recovery-identifier" type="text" autoComplete="username" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500" />
              </div>
              <button type="submit" disabled={loading} className="w-full py-3 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50">
                {loading ? t('common_processing') : copy.send}
              </button>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleConfirm}>
              <div>
                <label htmlFor="recovery-code" className="block text-sm font-medium text-gray-700">{copy.codeTitle}</label>
                <input id="recovery-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm tracking-[0.4em] text-center text-xl focus:outline-none focus:ring-orange-500 focus:border-orange-500" />
                <p className="mt-1 text-xs text-gray-500">{copy.codeHelp}</p>
              </div>
              <div>
                <label htmlFor="recovery-password" className="block text-sm font-medium text-gray-700">{copy.newPassword}</label>
                <input id="recovery-password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500" />
              </div>
              <div>
                <label htmlFor="recovery-confirm" className="block text-sm font-medium text-gray-700">{copy.confirm}</label>
                <input id="recovery-confirm" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500" />
              </div>
              <button type="submit" disabled={loading} className="w-full py-3 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50">
                {loading ? t('common_processing') : copy.reset}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <button type="button" onClick={() => navigate('/login')} className="text-sm font-medium text-orange-600 hover:text-orange-500">{t('common_back')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
