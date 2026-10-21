import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Download, X } from 'lucide-react';
import TurnstileWidget from './TurnstileWidget';
import FastCheckInBrochure from './FastCheckInBrochure';
import { useTranslation } from '../i18n';
import { getHomepageLeadCopy } from '../i18n/homepageLeadTranslations';

export type HomepageDocument = 'brochure' | 'visitor-origin' | 'business-snapshot';
interface HomepageLeadModalProps { document: HomepageDocument | null; onClose: () => void; onDownloaded: () => void; onOpenLegal: (document: 'privacy' | 'terms') => void; }
interface Lead { fullName: string; companyName: string; email: string; telephone: string; address: string; }
const STORAGE_KEY = 'fastcheckin-homepage-lead';
export function getStoredHomepageLead(): Lead | null { try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } }

export default function HomepageLeadModal({ document, onClose, onDownloaded, onOpenLegal }: HomepageLeadModalProps) {
  const { language } = useTranslation();
  const copy = getHomepageLeadCopy(language);
  const [lead, setLead] = useState<Lead>({ fullName: '', companyName: '', email: '', telephone: '', address: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [emailConfirmation, setEmailConfirmation] = useState(false);
  const [emailRejected, setEmailRejected] = useState(false);
  const [editEmail, setEditEmail] = useState(false);
  const [brochureOpen, setBrochureOpen] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (document) {
      const stored = getStoredHomepageLead();
      if (stored) setLead(stored);
      setEmailConfirmation(false);
      setEmailRejected(false);
      setEditEmail(false);
      setBrochureOpen(false);
    }
  }, [document]);

  useEffect(() => { if (editEmail) emailInputRef.current?.focus(); }, [editEmail]);

  if (!document) return null;

  const labels: Record<HomepageDocument, { title: string; body: string }> = {
    brochure: { title: copy.brochureTitle, body: copy.brochureBody },
    'visitor-origin': { title: copy.visitorTitle, body: copy.visitorBody },
    'business-snapshot': { title: copy.businessTitle, body: copy.businessBody }
  };

  async function requestDownload(currentLead: Lead, requestedDocument: HomepageDocument) {
    if (!turnstileToken) { setError(copy.security); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch('/.netlify/functions/homepage-lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'download', document: requestedDocument, lead: currentLead, turnstileToken }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (requestedDocument === 'brochure' && data.emailRejected === true) { setTurnstileToken(''); setTurnstileResetKey(value => value + 1); setEmailRejected(true); setError(''); return; }
        throw new Error(data.error || copy.error);
      }
      setTurnstileToken('');
      setTurnstileResetKey(value => value + 1);
      setEmailRejected(false);
      setEditEmail(false);
      if (requestedDocument === 'brochure') {
        setEmailConfirmation(true);
      } else {
        if (!data.downloadUrl || typeof data.downloadUrl !== 'string') throw new Error(copy.error);
        const downloadUrl = new URL(data.downloadUrl);
        const names: Record<HomepageDocument, string> = { brochure: 'FastCheckIn_Brochure.html', 'visitor-origin': 'fastcheckin_presentation.pdf', 'business-snapshot': 'fastcheckin.pdf' };
        downloadUrl.searchParams.set('download', names[requestedDocument]);
        window.location.assign(downloadUrl.toString());
        onDownloaded();
      }
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : copy.error);
    } finally { setBusy(false); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!lead.fullName || !lead.companyName || !lead.email || !lead.telephone || !lead.address) { setError(copy.allFields); return; }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lead));
    await requestDownload(lead, document);
  }

  const field = (name: keyof Lead, label: string, type = 'text') => (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-stone-700">{label}</span>
      <input ref={name === 'email' ? emailInputRef : undefined} required type={type} value={lead[name]} onChange={event => setLead(current => ({ ...current, [name]: event.target.value }))} onBlur={name === 'email' ? () => { if (editEmail) localStorage.setItem(STORAGE_KEY, JSON.stringify(lead)); } : undefined} className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20" />
    </label>
  );

  if (emailRejected && document === 'brochure') return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-950/75 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-labelledby="brochure-email-rejected-title" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-3xl bg-white p-7 text-center text-stone-900 shadow-2xl md:p-9">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-800"><X className="h-7 w-7" /></div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.22em] text-amber-600">FastCheckIn</p>
        <h2 id="brochure-email-rejected-title" className="mt-2 text-2xl font-bold">{copy.rejectedTitle}</h2>
        <p className="mt-4 text-sm leading-6 text-stone-600">{copy.rejectedBody}</p>
        <p className="mt-4 break-all rounded-xl bg-stone-100 px-4 py-3 text-sm font-semibold text-stone-900">{lead.email}</p>
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
          <button type="button" onClick={onClose} className="rounded-xl border border-stone-300 px-5 py-3 font-semibold text-stone-700 transition hover:bg-stone-50">{copy.cancel}</button>
          <button type="button" onClick={() => { setEmailRejected(false); setEditEmail(true); }} className="rounded-xl bg-stone-950 px-6 py-3 font-bold text-amber-400 transition hover:bg-stone-800">{copy.editEmail}</button>
        </div>
      </div>
    </div>
  );

  if (emailConfirmation && document === 'brochure') return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-950/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="brochure-email-confirmation-title" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-3xl bg-white p-7 text-center text-stone-900 shadow-2xl md:p-9">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lime-100 text-lime-800"><Download className="h-7 w-7" /></div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.22em] text-amber-600">FastCheckIn</p>
        <h2 id="brochure-email-confirmation-title" className="mt-2 text-2xl font-bold">{copy.thankYou}</h2>
        <p className="mt-4 text-sm leading-6 text-stone-600">{copy.emailSent.split('{email}')[0]}<strong className="break-all text-stone-900">{lead.email}</strong>{copy.emailSent.split('{email}')[1]}</p>
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
          <button type="button" onClick={onClose} className="rounded-xl border border-stone-300 px-5 py-3 font-semibold text-stone-700 transition hover:bg-stone-50">{copy.close}</button>
          <button type="button" onClick={() => { setEmailConfirmation(false); setBrochureOpen(true); }} className="rounded-xl bg-stone-950 px-6 py-3 font-bold text-amber-400 transition hover:bg-stone-800">{copy.openBrochure}</button>
        </div>
      </div>
    </div>
  );

  if (brochureOpen && document === 'brochure') return <FastCheckInBrochure onClose={onClose} />;

  return (
    <div className="fixed inset-0 z-[190] flex items-center justify-center bg-stone-950/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white text-stone-900 shadow-2xl">
        <div className="flex items-start justify-between border-b border-stone-200 px-6 py-5 md:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-600">FastCheckIn</p>
            <h2 className="mt-1 text-2xl font-bold">{labels[document].title}</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">{labels[document].body}</p>
          </div>
          <button onClick={onClose} aria-label={copy.close} className="rounded-full p-2 text-stone-500 hover:bg-stone-100"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-6 md:px-8">
            {editEmail && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900">{copy.correctEmail}</p>}
            {field('fullName', copy.fullName)}
            {field('companyName', copy.company)}
            <div className="grid gap-4 sm:grid-cols-2">{field('email', copy.email, 'email')}{field('telephone', copy.telephone, 'tel')}</div>
            {field('address', copy.address)}
            <p className="text-xs leading-5 text-stone-500">{copy.privacyBody} <button type="button" onClick={() => onOpenLegal('privacy')} className="font-semibold text-amber-700 hover:underline">{copy.privacy}</button> {copy.terms.toLowerCase()} <button type="button" onClick={() => onOpenLegal('terms')} className="font-semibold text-amber-700 hover:underline">{copy.terms}</button> apply.</p>
            <TurnstileWidget action="homepage-download" onToken={setTurnstileToken} resetKey={turnstileResetKey} />
            {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          </div>
          <div className="flex shrink-0 gap-3 border-t border-stone-200 bg-white px-6 py-4 md:px-8">
            <button type="button" onClick={onClose} disabled={busy} className="flex-1 rounded-xl border border-stone-300 bg-white px-5 py-3.5 font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-60">{copy.cancel}</button>
            <button disabled={busy} type="submit" className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-stone-950 px-5 py-3.5 font-bold text-amber-400 transition hover:bg-stone-800 disabled:cursor-wait disabled:opacity-60"><Download className="h-5 w-5" />{busy ? copy.preparing : document === 'brochure' ? copy.openBrochure : copy.download}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
