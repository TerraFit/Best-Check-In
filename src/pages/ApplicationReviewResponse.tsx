import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

type ReviewRequest = { id: string; type: string; documentKey: string | null; message: string; status: string; applicantResponse: string | null; requestedAt: string };
type UploadFile = { filename: string; contentType: string; base64: string };

export default function ApplicationReviewResponse() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const requestId = params.get('request') || '';
  const [request, setRequest] = useState<ReviewRequest | null>(null);
  const [responseText, setResponseText] = useState('');
  const [file, setFile] = useState<UploadFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        if (!token || !requestId) throw new Error('This secure review link is incomplete.');
        const query = new URLSearchParams({ token, request: requestId });
        const result = await fetch(`/.netlify/functions/business-application-review?${query.toString()}`);
        const data = await result.json();
        if (!result.ok || !data.success) throw new Error(data.error || 'Could not load the review request.');
        if (active) {
          setRequest(data.request);
          setSent(data.request.status === 'responded' || data.request.status === 'closed');
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Could not load the review request.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [token, requestId]);

  const handleFile = (selected: File | undefined) => {
    setFile(null);
    if (!selected) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(selected.type)) {
      setError('Please select a JPG, PNG, WebP or PDF document.');
      return;
    }
    if (selected.size > 4 * 1024 * 1024) {
      setError('The document must be 4 MB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || '');
      setFile({ filename: selected.name, contentType: selected.type, base64: value.split(',')[1] || '' });
      setError('');
    };
    reader.onerror = () => setError('Could not read the selected document.');
    reader.readAsDataURL(selected);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!responseText.trim() && !file) {
      setError('Please write a response or attach the requested document.');
      return;
    }
    if (request?.type === 'document_replacement' && !file) {
      setError('Please attach the requested replacement document.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await fetch('/.netlify/functions/business-application-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, requestId, response: responseText, file })
      });
      const data = await result.json();
      if (!result.ok || !data.success) throw new Error(data.error || 'Could not send your response.');
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your response.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 sm:p-9 shadow-2xl">
        <img src="/fastcheckin-logo.png" alt="FastCheckIn" className="h-10 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-stone-900 text-center">Application review response</h1>
        {loading ? <p className="py-10 text-center text-stone-600">Loading your secure review request…</p> : error && !request ? (
          <div role="alert" className="mt-6 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">{error}</div>
        ) : request ? (
          <div className="mt-6">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-amber-800">{request.type.replaceAll('_', ' ')}</p>
              {request.documentKey && <p className="mt-2 font-semibold text-stone-900">Document: {request.documentKey}</p>}
              <p className="mt-3 whitespace-pre-wrap text-stone-800">{request.message}</p>
            </div>
            {sent ? (
              <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5 text-green-800">
                <h2 className="font-semibold">Response received</h2>
                <p className="mt-2 text-sm">Thank you. Your response has been sent to the FastCheckIn review team. Your application remains under review until we complete our checks.</p>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-6 space-y-5">
                <label className="block text-sm font-semibold text-stone-800">
                  Your response
                  <textarea value={responseText} onChange={(e) => setResponseText(e.target.value)} rows={5} maxLength={4000} placeholder="Provide the requested clarification or additional information…" className="mt-2 block w-full rounded-lg border border-stone-300 p-3 font-normal" />
                </label>
                <label className="block text-sm font-semibold text-stone-800">
                  {request.type === 'document_replacement' ? 'Upload clearer / replacement document' : 'Attach a supporting document (optional)'}
                  <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => handleFile(e.target.files?.[0])} className="mt-2 block w-full rounded-lg border border-stone-300 p-3 font-normal" />
                  <span className="mt-1 block text-xs font-normal text-stone-500">JPG, PNG, WebP or PDF. Maximum 4 MB.</span>
                </label>
                {file && <p className="text-sm text-green-700">Selected: {file.filename}</p>}
                {error && <div role="alert" className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
                <button type="submit" disabled={submitting} className="w-full rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700 disabled:opacity-50">{submitting ? 'Sending…' : 'Send response to FastCheckIn'}</button>
              </form>
            )}
          </div>
        ) : null}
        <p className="mt-7 text-center text-xs text-stone-500">This secure link is private to your application and should not be shared.</p>
      </div>
    </div>
  );
}
