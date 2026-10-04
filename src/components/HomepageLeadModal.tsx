import { useEffect, useState, type FormEvent } from 'react';
import { Download, X } from 'lucide-react';
import TurnstileWidget from './TurnstileWidget';

export type HomepageDocument = 'brochure' | 'visitor-origin' | 'business-snapshot';

interface HomepageLeadModalProps {
  document: HomepageDocument | null;
  onClose: () => void;
  onDownloaded: () => void;
  onOpenLegal: (document: 'privacy' | 'terms') => void;
}

interface Lead {
  fullName: string;
  companyName: string;
  email: string;
  telephone: string;
  address: string;
}

const STORAGE_KEY = 'fastcheckin-homepage-lead';

export function getStoredHomepageLead(): Lead | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function HomepageLeadModal({ document, onClose, onDownloaded, onOpenLegal }: HomepageLeadModalProps) {
  const [lead, setLead] = useState<Lead>({ fullName: '', companyName: '', email: '', telephone: '', address: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  useEffect(() => {
    if (document) {
      const stored = getStoredHomepageLead();
      if (stored) setLead(stored);
    }
  }, [document]);

  if (!document) return null;

  const labels: Record<HomepageDocument, { title: string; body: string }> = {
    brochure: { title: 'Download the FastCheckIn Brochure', body: 'Get an overview of the FastCheckIn platform, guest experience, operations and analytics.' },
    'visitor-origin': { title: 'Download the Visitor Origin Explorer Snapshot', body: 'See an example of how FastCheckIn turns guest-origin information into market insight.' },
    'business-snapshot': { title: 'Download the Business Snapshot', body: 'See an example of the operational and business measures FastCheckIn can bring together.' }
  };

  async function requestDownload(currentLead: Lead, requestedDocument: HomepageDocument) {
    if (!turnstileToken) {
      setError('Please complete the security verification.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/.netlify/functions/homepage-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'download', document: requestedDocument, lead: currentLead, turnstileToken })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Unable to prepare the download.');
      }
      const data = await response.json().catch(() => ({}));
      if (!data.downloadUrl || typeof data.downloadUrl !== 'string') {
        throw new Error('Unable to prepare the download.');
      }
      const anchor = window.document.createElement('a');
      anchor.href = data.downloadUrl;
      anchor.target = '_blank';
      anchor.rel = 'noopener';
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTurnstileToken('');
      setTurnstileResetKey((value) => value + 1);
      onDownloaded();
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Unable to prepare the download.');
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!lead.fullName || !lead.companyName || !lead.email || !lead.telephone || !lead.address) {
      setError('Please complete all fields before downloading.');
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lead));
    await requestDownload(lead, document);
  }

  const field = (name: keyof Lead, label: string, type = 'text') => (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-stone-700">{label}</span>
      <input required type={type} value={lead[name]} onChange={(event) => setLead((current) => ({ ...current, [name]: event.target.value }))} className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20" />
    </label>
  );

  return (
    <div className="fixed inset-0 z-[190] flex items-center justify-center bg-stone-950/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white text-stone-900 shadow-2xl">
        <div className="flex items-start justify-between border-b border-stone-200 px-6 py-5 md:px-8">
          <div><p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-600">FastCheckIn</p><h2 className="mt-1 text-2xl font-bold">{labels[document].title}</h2><p className="mt-2 text-sm leading-6 text-stone-600">{labels[document].body}</p></div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-stone-500 hover:bg-stone-100"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-6 md:px-8">
          {field('fullName', 'Full name')}
          {field('companyName', 'Company / hotel name')}
          <div className="grid gap-4 sm:grid-cols-2">{field('email', 'Email address', 'email')}{field('telephone', 'Telephone', 'tel')}</div>
          {field('address', 'Business / property address')}
          <p className="text-xs leading-5 text-stone-500">We use these details to provide the requested resource and respond to related enquiries. <button type="button" onClick={() => onOpenLegal('privacy')} className="font-semibold text-amber-700 hover:underline">Privacy Policy</button> and <button type="button" onClick={() => onOpenLegal('terms')} className="font-semibold text-amber-700 hover:underline">Terms</button> apply.</p>
          <TurnstileWidget action="homepage-download" onToken={setTurnstileToken} resetKey={turnstileResetKey} />
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <button disabled={busy} type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-5 py-3.5 font-bold text-amber-400 transition hover:bg-stone-800 disabled:cursor-wait disabled:opacity-60"><Download className="h-5 w-5" />{busy ? 'Preparing download…' : 'Download'}</button>
        </form>
      </div>
    </div>
  );
}
