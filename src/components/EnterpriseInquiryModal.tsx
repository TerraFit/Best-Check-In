import { createPortal } from 'react-dom';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import TurnstileWidget from './TurnstileWidget';
import ComparePackagesModal from './ComparePackagesModal';
import { calculateEnterpriseMonthlyPrice } from '../config/packages';

const COUNTRIES = ['Angola','Botswana','Eswatini','Kenya','Lesotho','Malawi','Mauritius','Mozambique','Namibia','Nigeria','Tanzania','Uganda','Zambia','Zimbabwe','Other'];

type Establishment = { id: number; country: string; rooms: number };
type Props = { open: boolean; onClose: () => void };

function ComparePackagesLauncher() {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const pricingSection = document.getElementById('pricing-section');
    if (!pricingSection) return;
    const brochureButton = Array.from(pricingSection.querySelectorAll('button')).find((button) =>
      button.textContent?.toLowerCase().includes('download brochure')
    );
    if (!brochureButton?.parentElement) return;

    const parent = brochureButton.parentElement;
    const container = document.createElement('span');
    container.className = 'inline-flex ml-3 mt-3 sm:mt-0';
    parent.appendChild(container);
    setTarget(container);

    return () => {
      container.remove();
      setTarget(null);
    };
  }, []);

  if (!target) return null;

  return createPortal(
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-bold text-stone-900 hover:border-amber-500 hover:text-amber-700 transition"
      >
        Compare packages
      </button>
      <ComparePackagesModal open={open} onClose={() => setOpen(false)} />
    </>,
    target,
  );
}

export default function EnterpriseInquiryModal({ open, onClose }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [establishments, setEstablishments] = useState<Establishment[]>([{ id: 1, country: 'South Africa', rooms: 25 }]);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  useEffect(() => {
    if (!open) {
      setBusy(false); setMessage(''); setSuccess(false);
      setEstablishments([{ id: 1, country: 'South Africa', rooms: 25 }]);
      setTurnstileToken('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) onClose(); };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', handleKeyDown); };
  }, [open, busy, onClose]);

  const totals = useMemo(() => {
    const southAfrica = establishments.filter((item) => item.country === 'South Africa').length;
    const international = establishments.length - southAfrica;
    const rooms = establishments.reduce((sum, item) => sum + Math.max(25, item.rooms || 25), 0);
    const monthly = establishments.reduce((sum, item) => sum + calculateEnterpriseMonthlyPrice(item.rooms), 0);
    return { southAfrica, international, rooms, monthly };
  }, [establishments]);

  const addEstablishment = () => setEstablishments((items) => [...items, { id: Date.now(), country: 'South Africa', rooms: 25 }]);
  const removeEstablishment = (id: number) => setEstablishments((items) => items.length > 1 ? items.filter((item) => item.id !== id) : items);
  const updateEstablishment = (id: number, field: keyof Establishment, value: string | number) => {
    setEstablishments((items) => items.map((item) => item.id === id ? { ...item, [field]: value } : item));
  };

  const submitEnterpriseInquiry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!turnstileToken) { setMessage('Please complete the security verification.'); return; }
    setBusy(true); setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/.netlify/functions/homepage-lead', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'enterprise-inquiry',
          lead: { fullName: form.get('fullName'), companyName: form.get('companyName'), email: form.get('email'), telephone: form.get('telephone') },
          portfolio: { establishments, totalRooms: totals.rooms, totalEstablishments: establishments.length, saEstablishments: totals.southAfrica, internationalEstablishments: totals.international, estimatedMonthlyPrice: totals.monthly },
          topic: 'Enterprise pricing application',
          comments: `Enterprise pricing application\nEstablishments: ${establishments.length}\nSouth Africa: ${totals.southAfrica}\nInternational: ${totals.international}\nTotal rooms: ${totals.rooms}\nEstimated monthly price: R${totals.monthly.toLocaleString('en-ZA')}`,
          turnstileToken,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to send your application.');
      setSuccess(true); setTurnstileToken(''); setTurnstileResetKey((value) => value + 1);
      setMessage('Thank you. Your Enterprise application has been received.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to send your application.'); }
    finally { setBusy(false); }
  };

  return (
    <>
      <ComparePackagesLauncher />
      {!open ? null : (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="enterprise-title" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
          <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white text-stone-900 shadow-2xl">
            <div className="flex items-start justify-between border-b border-stone-200 px-6 py-5 md:px-8">
              <div className="pr-8"><p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-600">Enterprise</p><h2 id="enterprise-title" className="mt-2 text-2xl font-bold md:text-3xl">Build your Enterprise plan</h2><p className="mt-2 text-sm leading-relaxed text-stone-600">Tell us where your establishments are and how many rooms each has. Your estimated price updates automatically before you submit.</p></div>
              <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="rounded-full p-2 text-stone-500 hover:bg-stone-100"><X className="h-6 w-6" /></button>
            </div>

            {success ? <div className="overflow-y-auto px-6 py-12 md:px-8"><div className="mx-auto max-w-xl rounded-2xl border border-stone-200 bg-stone-50 p-8 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 text-xl font-black text-stone-950">✓</div><h3 className="mt-5 text-2xl font-bold">Application received</h3><p className="mt-3 text-stone-600">{message}</p><button type="button" onClick={onClose} className="mt-7 rounded-xl bg-stone-950 px-7 py-3 font-bold text-amber-400">Close</button></div></div> :
              <form onSubmit={submitEnterpriseInquiry} className="overflow-y-auto px-6 py-6 md:px-8">
                <section><h3 className="text-lg font-bold">1. Your establishments</h3><p className="mt-1 text-sm text-stone-500">Each establishment is priced separately. International establishments are not pooled with your South African portfolio.</p>
                  <div className="mt-5 space-y-3">
                    {establishments.map((item, index) => <div key={item.id} className="grid gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 md:grid-cols-[auto_1fr_180px_auto] md:items-end">
                      <div className="pb-3 text-sm font-bold text-stone-500">{index + 1}</div>
                      <label><span className="mb-1.5 block text-sm font-semibold">Location</span><select value={item.country} onChange={(event) => updateEstablishment(item.id, 'country', event.target.value)} className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3"><option>South Africa</option>{COUNTRIES.map((country) => <option key={country}>{country}</option>)}</select></label>
                      <label><span className="mb-1.5 block text-sm font-semibold">Rooms</span><input type="number" min="25" step="1" value={item.rooms} onChange={(event) => updateEstablishment(item.id, 'rooms', Math.max(25, Number(event.target.value) || 25))} className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
                      <button type="button" onClick={() => removeEstablishment(item.id)} disabled={establishments.length === 1} className="rounded-xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-600 hover:bg-white disabled:opacity-30">Remove</button>
                    </div>)}
                  </div>
                  <button type="button" onClick={addEstablishment} className="mt-4 rounded-xl border border-stone-300 px-5 py-3 font-bold text-stone-800 hover:bg-stone-50">+ Add establishment</button>
                </section>

                <section className="mt-8 border-t border-stone-200 pt-7"><h3 className="text-lg font-bold">2. Your live Enterprise estimate</h3><div className="mt-4 grid gap-4 md:grid-cols-4"><div className="rounded-2xl bg-stone-50 p-4"><p className="text-xs uppercase tracking-wide text-stone-500">Establishments</p><p className="mt-1 text-2xl font-bold">{establishments.length}</p></div><div className="rounded-2xl bg-stone-50 p-4"><p className="text-xs uppercase tracking-wide text-stone-500">South Africa</p><p className="mt-1 text-2xl font-bold">{totals.southAfrica}</p></div><div className="rounded-2xl bg-stone-50 p-4"><p className="text-xs uppercase tracking-wide text-stone-500">International</p><p className="mt-1 text-2xl font-bold">{totals.international}</p></div><div className="rounded-2xl bg-amber-50 p-4"><p className="text-xs uppercase tracking-wide text-stone-500">Total rooms</p><p className="mt-1 text-2xl font-bold">{totals.rooms}</p></div></div>
                  <div className="mt-5 rounded-2xl border border-stone-200 bg-white p-5"><div className="flex items-end justify-between gap-4"><div><p className="text-sm font-semibold text-stone-600">Estimated monthly subscription</p><p className="mt-1 text-xs text-stone-500">Per-establishment pricing, including 5-room block thresholds and applicable volume discounts.</p></div><p className="whitespace-nowrap text-3xl font-black">R{totals.monthly.toLocaleString('en-ZA')}<span className="text-sm font-medium text-stone-500"> / month</span></p></div><div className="mt-4 space-y-2 border-t border-stone-200 pt-4">{establishments.map((item, index) => <div key={item.id} className="flex justify-between gap-4 text-sm"><span>Establishment {index + 1} · {item.country} · {item.rooms} rooms</span><strong>R{calculateEnterpriseMonthlyPrice(item.rooms).toLocaleString('en-ZA')}</strong></div>)}</div></div>
                </section>

                <section className="mt-8 border-t border-stone-200 pt-7"><h3 className="text-lg font-bold">3. Contact details</h3><div className="mt-4 grid gap-4 md:grid-cols-2"><label><span className="mb-1.5 block text-sm font-semibold">Full name</span><input name="fullName" required className="w-full rounded-xl border border-stone-300 px-4 py-3" /></label><label><span className="mb-1.5 block text-sm font-semibold">Company / group name</span><input name="companyName" required className="w-full rounded-xl border border-stone-300 px-4 py-3" /></label><label><span className="mb-1.5 block text-sm font-semibold">Email address</span><input name="email" type="email" required className="w-full rounded-xl border border-stone-300 px-4 py-3" /></label><label><span className="mb-1.5 block text-sm font-semibold">Telephone</span><input name="telephone" type="tel" required className="w-full rounded-xl border border-stone-300 px-4 py-3" /></label></div></section>

                <TurnstileWidget action="enterprise-enquiry" onToken={setTurnstileToken} resetKey={turnstileResetKey} />
                {message && <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{message}</p>}
                <div className="mt-7 flex flex-col-reverse gap-3 border-t border-stone-200 pt-6 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-stone-300 px-7 py-3 font-semibold">Cancel</button><button type="submit" disabled={busy} className="rounded-xl bg-stone-950 px-7 py-3 font-bold text-amber-400">{busy ? 'Sending…' : 'Submit Enterprise Application'}</button></div>
                <p className="mt-4 text-xs text-stone-500">Your information is handled in accordance with our Privacy Policy.</p>
              </form>}
          </div>
        </div>
      )}
    </>
  );
}
