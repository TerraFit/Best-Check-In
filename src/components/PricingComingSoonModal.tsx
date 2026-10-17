import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import TurnstileWidget from './TurnstileWidget';
import { useTranslation } from '../i18n';

type Props = { open: boolean; onClose: () => void };

export default function PricingComingSoonModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  useEffect(() => {
    if (!open) {
      setBusy(false);
      setMessage('');
      setTurnstileToken('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, busy, onClose]);

  const submitLead = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!turnstileToken) {
      setMessage(t('landing_form_security'));
      return;
    }
    setBusy(true);
    setMessage('');
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch('/.netlify/functions/homepage-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'inquiry',
          lead: {
            fullName: form.get('fullName'),
            companyName: form.get('companyName'),
            email: form.get('email'),
            telephone: form.get('telephone'),
            address: form.get('address'),
          },
          topic: 'Pricing availability notification',
          comments: 'Please notify me when the revised FastCheckIn pricing and quotation calculator become available.',
          turnstileToken,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || t('landing_form_error'));
      formElement.reset();
      setTurnstileToken('');
      setTurnstileResetKey((value) => value + 1);
      setMessage('Thank you. We will notify you when revised pricing is available.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('landing_form_error'));
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="pricing-coming-soon-title" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white text-stone-900 shadow-2xl">
        <div className="flex items-start justify-between border-b border-stone-200 px-6 py-5 md:px-8">
          <div className="pr-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-600">FastCheckIn pricing</p>
            <h2 id="pricing-coming-soon-title" className="mt-2 text-2xl font-bold md:text-3xl">Coming soon</h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">We are preparing our revised room-based pricing and quotation calculator. Leave your details and we will let you know when it is available.</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="rounded-full p-2 text-stone-500 hover:bg-stone-100 disabled:opacity-40"><X className="h-6 w-6" /></button>
        </div>
        <form onSubmit={submitLead} className="px-6 py-6 md:px-8">
          <div className="grid gap-4 md:grid-cols-2">
            <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_full_name')}</span><input name="fullName" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
            <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_company')}</span><input name="companyName" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
            <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_email')}</span><input name="email" type="email" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
            <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_telephone')}</span><input name="telephone" type="tel" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
            <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_address')}</span><input name="address" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
          </div>
          <TurnstileWidget action="pricing-availability" onToken={setTurnstileToken} resetKey={turnstileResetKey} />
          {message && <p role="status" className="mt-5 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">{message}</p>}
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button type="button" onClick={onClose} disabled={busy} className="rounded-full border border-stone-300 px-6 py-3 text-sm font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-40">{t('common_close')}</button>
            <button type="submit" disabled={busy} className="rounded-full bg-amber-500 px-6 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-60">{busy ? t('landing_form_sending') : 'Notify me when available'}</button>
          </div>
          <p className="mt-4 text-xs text-stone-500">{t('landing_form_privacy_note')}</p>
        </form>
      </div>
    </div>
  );
}
