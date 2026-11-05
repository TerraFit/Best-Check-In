import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

declare global {
  interface Window {
    Hyper?: (key: string, options?: { customBackendUrl?: string }) => any;
  }
}

type PeachSession = { clientSecret: string; paymentId: string; publishableKey: string; baseUrl: string; sdkUrl: string };

export default function RegistrationCardSetup() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const hyperRef = useRef<any>(null);
  const elementsRef = useRef<any>(null);
  const paymentElementRef = useRef<any>(null);
  const [session, setSession] = useState<PeachSession | null>(null);
  const [status, setStatus] = useState('Preparing secure card validation…');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const start = async () => {
      if (!token) {
        setError('This application link is missing or invalid. Please contact FastCheckIn support.');
        setLoading(false);
        return;
      }
      try {
        const returnedPayment = params.has('payment_intent') || params.has('payment_intent_client_secret') || params.has('redirect_status');
        if (returnedPayment) {
          const verifyResponse = await fetch('/.netlify/functions/peach-confirm-registration-card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ registrationToken: token })
          });
          const verifyData = await verifyResponse.json();
          if (verifyResponse.ok && verifyData.verified) {
            navigate('/registration-pending', { replace: true, state: { cardValidated: true } });
            return;
          }
          if (verifyResponse.status === 202) {
            setStatus(verifyData.message || 'Peach is confirming your card. Refresh this page in a moment to check again.');
            return;
          }
          throw new Error(verifyData.error || 'Could not verify the card validation result.');
        }
        const response = await fetch('/.netlify/functions/peach-registration-card-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ registrationToken: token })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not prepare card validation.');
        if (!active) return;
        if (!data.publishableKey || !data.clientSecret || !data.sdkUrl || !data.baseUrl) {
          throw new Error('Peach payment configuration is incomplete. Please contact support.');
        }
        const nextSession = data as PeachSession;
        setSession(nextSession);
        setStatus('Enter your card details below. No payment will be taken now.');
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Could not prepare card validation.');
      } finally {
        if (active) setLoading(false);
      }
    };
    start();
    return () => { active = false; };
  }, [token, params, navigate]);

  useEffect(() => {
    if (!session) return;
    let active = true;
    const mount = async () => {
      try {
        if (!window.Hyper) {
          await new Promise<void>((resolve, reject) => {
            const existing = document.querySelector<HTMLScriptElement>('script[data-peach-hyper]');
            if (existing) {
              if (window.Hyper) return resolve();
              existing.addEventListener('load', () => resolve(), { once: true });
              existing.addEventListener('error', () => reject(new Error('Could not load Peach secure card form.')), { once: true });
              return;
            }
            const script = document.createElement('script');
            script.src = session.sdkUrl;
            script.async = true;
            script.dataset.peachHyper = 'true';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Could not load Peach secure card form.'));
            document.head.appendChild(script);
          });
        }
        if (!active || !window.Hyper) return;
        const hyper = window.Hyper(session.publishableKey, { customBackendUrl: session.baseUrl + '/api' });
        const elements = hyper.elements({ clientSecret: session.clientSecret, locale: 'auto' });
        const paymentElement = elements.create('payment', { layout: 'tabs', paymentMethodOrder: ['card'] });
        hyperRef.current = hyper;
        elementsRef.current = elements;
        paymentElementRef.current = paymentElement;
        paymentElement.mount('#peach-registration-payment-element');
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Could not load secure card form.');
      }
    };
    mount();
    return () => {
      active = false;
      try { paymentElementRef.current?.unmount(); } catch { /* ignore SDK teardown */ }
      paymentElementRef.current = null;
      elementsRef.current = null;
      hyperRef.current = null;
    };
  }, [session]);

  const verifyWithServer = async () => {
    const response = await fetch('/.netlify/functions/peach-confirm-registration-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationToken: token })
    });
    const data = await response.json();
    if (response.ok && data.verified) {
      navigate('/registration-pending', { replace: true, state: { cardValidated: true } });
      return true;
    }
    if (response.status === 202) {
      setStatus(data.message || 'Peach is confirming your card. Please try again in a moment.');
      return false;
    }
    throw new Error(data.error || 'Card validation could not be confirmed.');
  };



  const handleConfirm = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!hyperRef.current || !elementsRef.current) {
      setError('The secure card form is still loading. Please wait a moment.');
      return;
    }
    setSubmitting(true);
    try {
      setStatus('Confirming your card securely with Peach Payments…');
      const result = await hyperRef.current.confirmPayment({
        elements: elementsRef.current,
        confirmParams: { return_url: window.location.href }
      });
      if (result?.error) throw new Error(result.error.message || 'Card validation was not completed.');
      if (result?.paymentIntent?.status === 'succeeded') {
        setStatus('Card validated. Verifying the recurring mandate…');
        await verifyWithServer();
      } else {
        setStatus('Complete any additional bank verification requested by your bank.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Card validation failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 sm:p-9 shadow-2xl">
        <div className="text-center mb-7">
          <img src="/fastcheckin-logo.png" alt="FastCheckIn" className="h-10 mx-auto mb-5" />
          <h1 className="text-2xl font-bold text-stone-900">Secure your FastCheckIn application</h1>
          <p className="mt-2 text-sm text-stone-600">Card validation and recurring payment authorisation</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-6 text-sm text-amber-900">
          <strong>No payment is taken now.</strong> Peach Payments will validate your card and securely establish permission for future subscription payments. Your 14-day free trial only begins the day after your application is approved by FastCheckIn.
        </div>
        {error && <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {loading ? (
          <p className="py-8 text-center text-stone-600">{status}</p>
        ) : !session ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-stone-600">{status}</p>
            <button type="button" onClick={() => verifyWithServer().catch((err) => setError(err instanceof Error ? err.message : 'Could not verify card validation.'))} className="w-full rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700">Check card validation status</button>
          </div>
        ) : (
          <form onSubmit={handleConfirm} className="space-y-5">
            <div id="peach-registration-payment-element" className="min-h-20" />
            <p className="text-xs text-stone-500">Your card details are collected directly by Peach Payments. FastCheckIn does not receive or store your card number or security code.</p>
            <button type="submit" disabled={!session || submitting || Boolean(error)} className="w-full rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? 'Validating card…' : 'Validate card and continue'}
            </button>
            <p aria-live="polite" className="text-center text-sm text-stone-600">{status}</p>
          </form>
        )}
        <p className="mt-6 text-center text-xs text-stone-500">Your application remains pending until FastCheckIn has reviewed and approved it.</p>
      </div>
    </div>
  );
}
