import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import TurnstileWidget from './TurnstileWidget';

type Props = { open: boolean; onClose: () => void };

export default function EnterpriseComingSoonModal({ open, onClose }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (!open) {
      setBusy(false);
      setMessage('');
      setSuccess(false);
      setTurnstileToken('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, busy, onClose]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!turnstileToken) {
      setMessage('Please complete the security verification.');
      return;
    }
    setBusy(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
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
            address: 'Not provided',
          },
          topic: 'Enterprise pricing availability notification',
          comments: 'Please inform me when FastCheckIn Enterprise pricing and portfolio quotation tools become available.',
          turnstileToken,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to register your interest. Please try again.');
      setSuccess(true);
      setTurnstileToken('');
      setResetKey((value) => value + 1);
      setMessage('Thank you. We will let you know when Enterprise quotations become available.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to register your interest. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="enterprise-coming-soon-title" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div className="relative w-full max-w-xl overflow-y-auto rounded-2xl border border-stone-200 bg-white text-stone-900 shadow-2xl max-h-[90vh]">
        <div className="flex items-start justify-between border-b border-stone-200 px-6 py-5">
          <div className="pr-5">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-600">FastCheckIn Enterprise</p>
            <h2 id="enterprise-coming-soon-title" className="mt-2 text-2xl font-bold">Coming soon</h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-600">Our Enterprise pricing and portfolio quotation tool is in preparation. Leave your details and we’ll inform you when it becomes available.</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="rounded-full p-2 text-stone-500 hover:bg-stone-100"><X className="h-5 w-5" /></button>
        </div>
        {success ? (
          <div className="px-6 py-8">
            <p role="status" className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">{message}</p>
            <button type="button" onClick={onClose} className="mt-5 rounded-xl bg-stone-900 px-6 py-3 font-bold text-white hover:bg-stone-800">Close</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 px-6 py-6">
            <label className="block"><span className="mb-1.5 block text-sm font-semibold">Full name</span><input name="fullName" autoComplete="name" required maxLength={160} className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 focus:border-amber-500 focus:outline-none" /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-semibold">Hotel / group name</span><input name="companyName" autoComplete="organization" required maxLength={160} className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 focus:border-amber-500 focus:outline-none" /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block"><span className="mb-1.5 block text-sm font-semibold">Email address</span><input name="email" type="email" autoComplete="email" required maxLength={320} className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 focus:border-amber-500 focus:outline-none" /></label>
              <label className="block"><span className="mb-1.5 block text-sm font-semibold">Telephone</span><input name="telephone" type="tel" autoComplete="tel" required maxLength={80} className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 focus:border-amber-500 focus:outline-none" /></label>
            </div>
            <TurnstileWidget action="homepage-enquiry" onToken={setTurnstileToken} resetKey={resetKey} />
            {message && <p role="status" className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">{message}</p>}
            <div className="flex flex-col-reverse gap-3 border-t border-stone-200 pt-5 sm:flex-row sm:justify-end">
              <button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-stone-300 px-6 py-3 font-semibold text-stone-700 hover:bg-stone-50">Cancel</button>
              <button type="submit" disabled={busy} className="rounded-xl bg-amber-500 px-6 py-3 font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-60">{busy ? 'Sending…' : 'Notify me when available'}</button>
            </div>
            <p className="text-xs text-stone-500">Your details will only be used to respond to this enquiry, in accordance with our Privacy Policy.</p>
          </form>
        )}
      </div>
    </div>
  );
}
