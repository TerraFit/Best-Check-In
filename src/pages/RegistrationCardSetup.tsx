import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getCurrentLanguage } from '../i18n/languageService';

declare global {
  interface Window {
    Hyper?: (key: string, options?: { customBackendUrl?: string }) => any;
  }
}

type PeachSession = { clientSecret: string; paymentId: string; publishableKey: string; baseUrl: string; sdkUrl: string };

// Peach Web SDK supports a defined set of locale codes. FastCheckIn has additional
// languages (notably Afrikaans), so unsupported selections deliberately fall back
// to English instead of allowing browser tags such as "fr-FR" to reach the SDK.
const PEACH_SUPPORTED_LOCALES = new Set([
  'en', 'he', 'fr', 'ar', 'ja', 'de', 'es', 'ca', 'pt', 'it', 'pl', 'nl', 'sv', 'ru', 'zh'
]);
const getPeachLocale = (): string => {
  const selectedLanguage = getCurrentLanguage();
  return PEACH_SUPPORTED_LOCALES.has(selectedLanguage) ? selectedLanguage : 'en';
};

export default function RegistrationCardSetup() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const hyperRef = useRef<any>(null);
  const elementsRef = useRef<any>(null);
  const paymentElementRef = useRef<any>(null);
  const paymentContainerRef = useRef<HTMLDivElement>(null);
  const confirmingRef = useRef(false);
  const [session, setSession] = useState<PeachSession | null>(null);
  const [status, setStatus] = useState('Preparing secure card validation…');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const verifyWithServer = async () => {
    const response = await fetch('/.netlify/functions/peach-confirm-registration-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationToken: token })
    });
    const data = await response.json();
    if (response.ok && data.verified) {
      navigate('/registration-pending', { replace: true, state: { cardValidated: true } });
      return { verified: true, retryable: false };
    }
    if (response.status === 202) {
      setStatus(data.message || 'Peach is confirming your card. Please check again in a moment.');
      if (data.redirectUrl) {
        const redirect = new URL(data.redirectUrl);
        if (redirect.protocol === 'https:' && ['app.sandbox-next.peachpayments.com', 'app.next.peachpayments.com'].includes(redirect.hostname)) {
          window.location.assign(data.redirectUrl);
        }
      }
      return { verified: false, retryable: Boolean(data.retryable), peachStatus: data.peachStatus };
    }
    if (response.status === 409 && data.code === 'no_payment_intent') {
      return { verified: false, retryable: true, noPaymentIntent: true };
    }
    throw new Error(data.error || 'Card validation could not be confirmed.');
  };

  const startNewOrResumeSession = async (): Promise<boolean> => {
    const response = await fetch('/.netlify/functions/peach-registration-card-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationToken: token })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not prepare card validation.');
    if (data.pending) {
      setStatus(data.message || 'Your existing Peach card validation is still processing. Please check again shortly.');
      if (data.redirectUrl) {
        const redirect = new URL(data.redirectUrl);
        if (redirect.protocol === 'https:' && ['app.sandbox-next.peachpayments.com', 'app.next.peachpayments.com'].includes(redirect.hostname)) {
          window.location.assign(data.redirectUrl);
        }
      }
      return false;
    }
    if (!data.publishableKey || !data.clientSecret || !data.sdkUrl || !data.baseUrl) {
      throw new Error('Peach payment configuration is incomplete. Please contact support.');
    }
    setSession(data as PeachSession);
    setStatus('Enter your card details below. No payment will be taken now.');
    return true;
  };

  useEffect(() => {
    let active = true;
    const start = async () => {
      if (!token) {
        setError('This application link is missing or invalid. Please contact FastCheckIn support.');
        setLoading(false);
        return;
      }
      try {
        // Peach's documented return uses payment_id and status (not only the
        // Stripe-compatible payment_intent / redirect_status names). Always
        // reconcile against Peach so a clean return URL is also recoverable.
        const returnedFromPeach = ['payment_id', 'payment_intent', 'payment_intent_client_secret', 'payment_intent_id', 'status', 'redirect_status']
          .some((key) => params.has(key));
        if (returnedFromPeach) setStatus('Peach returned your card validation. Confirming the result securely…');

        const verification = await verifyWithServer();
        if (!active || verification.verified) return;
        if (!verification.retryable) {
          setLoading(false);
          return;
        }
        await startNewOrResumeSession();
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Could not prepare card validation.');
      } finally {
        if (active) setLoading(false);
      }
    };
    start();
    return () => { active = false; };
  }, [token, navigate]);

  useEffect(() => {
    if (!session) return;
    let active = true;
    let mountedElement: any = null;
    let mountedContainer: HTMLDivElement | null = null;

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
        const container = paymentContainerRef.current;
        if (!container || !container.isConnected) throw new Error('The secure card form could not be mounted. Please reload this page.');
        const hyper = window.Hyper(session.publishableKey, { customBackendUrl: session.baseUrl + '/api' });
        const elements = hyper.elements({ clientSecret: session.clientSecret, locale: getPeachLocale(), loader: 'auto' });
        const paymentElement = elements.create('payment', { layout: 'tabs', paymentMethodOrder: ['card'] });
        mountedContainer = container;
        mountedElement = paymentElement;
        hyperRef.current = hyper;
        elementsRef.current = elements;
        paymentElementRef.current = paymentElement;
        // Hyper's documented Payment Element mount API accepts a CSS selector string.
        // Passing the DOM node here triggers the SDK's internal selector parsing (i.split).
        paymentElement.mount('#peach-registration-payment-element');
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Could not load secure card form.');
      }
    };
    mount();
    return () => {
      active = false;
      // Peach can navigate away for 3DS while React is tearing down this route.
      // Only ask the SDK to unmount while its original host node still exists.
      if (!confirmingRef.current && mountedElement && mountedContainer?.isConnected) {
        try { mountedElement.unmount(); } catch { /* SDK may already have torn itself down */ }
      }
      if (paymentElementRef.current === mountedElement) paymentElementRef.current = null;
      if (elementsRef.current && paymentElementRef.current === null) elementsRef.current = null;
      if (hyperRef.current && paymentElementRef.current === null) hyperRef.current = null;
    };
  }, [session]);

  const handleConfirm = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!hyperRef.current || !elementsRef.current) {
      setError('The secure card form is still loading. Please wait a moment.');
      return;
    }
    setSubmitting(true);
    confirmingRef.current = true;
    try {
      setStatus('Confirming your card securely with Peach Payments…');
      const result = await hyperRef.current.confirmPayment({
        elements: elementsRef.current,
        confirmParams: {
          return_url: `${window.location.origin}/registration-payment?token=${encodeURIComponent(token)}`
        },
        redirect: 'if_required'
      });
      if (result?.error) throw new Error(result.error.message || 'Card validation was not completed.');
      if (result?.paymentIntent?.status === 'succeeded') {
        setStatus('Card validated. Verifying the recurring mandate…');
        await verifyWithServer();
      } else if (result?.paymentIntent?.status) {
        setStatus('Peach is processing your card validation. We will confirm the result before continuing.');
      } else {
        setStatus('Complete any additional bank verification requested by your bank. You will return here automatically.');
      }
    } catch (err) {
      const sdkMessage = err instanceof Error ? err.message : 'Card validation could not be completed.';
      // The SDK error is not the authoritative payment state. Reconcile with
      // Peach server-side before deciding whether the shopper can retry.
      try {
        const verification = await verifyWithServer();
        if (!verification.verified && verification.retryable) {
          // This is a local retry, not a 3DS redirect: allow the old Element
          // to unmount before the replacement session mounts into its host.
          confirmingRef.current = false;
          setSession(null);
          setError('');
          const sessionReady = await startNewOrResumeSession();
          if (sessionReady) {
            setStatus(
              verification.peachStatus === 'failed' || verification.peachStatus === 'cancelled'
                ? 'The previous card attempt was unsuccessful. A fresh validation session is ready; please enter your card details again.'
                : 'Peach has made the card session available for another attempt. Please review your card details and try again.'
            );
          }
        } else if (!verification.verified) {
          setError(sdkMessage);
          setStatus(
            verification.peachStatus
              ? `Peach reports “${verification.peachStatus}”. We have not started another attempt. Check the status again shortly.`
              : 'Peach has not confirmed a retryable result. Check the status again before trying another card.'
          );
        }
      } catch (verificationError) {
        setError(
          verificationError instanceof Error
            ? `${sdkMessage} We could not verify the result with Peach: ${verificationError.message}`
            : sdkMessage
        );
      }
    } finally {
      confirmingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleCheckStatus = async () => {
    setError('');
    setSubmitting(true);
    try {
      const result = await verifyWithServer();
      if (!result.verified && result.retryable) await startNewOrResumeSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify card validation.');
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
        ) : session ? (
          <form onSubmit={handleConfirm} className="space-y-5">
            <div id="peach-registration-payment-element" ref={paymentContainerRef} className="min-h-20" />
            <p className="text-xs text-stone-500">Your card details are collected directly by Peach Payments. FastCheckIn does not receive or store your card number or security code.</p>
            <button type="submit" disabled={submitting || Boolean(error)} className="w-full rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? 'Validating card…' : 'Validate card and continue'}
            </button>
            <p aria-live="polite" className="text-center text-sm text-stone-600">{status}</p>
          </form>
        ) : (
          <div className="space-y-4 text-center">
            <p className="text-sm text-stone-600">{status}</p>
            <button type="button" onClick={handleCheckStatus} disabled={submitting} className="w-full rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700 disabled:opacity-50">
              {submitting ? 'Checking…' : 'Check card validation status'}
            </button>
          </div>
        )}
        <p className="mt-6 text-center text-xs text-stone-500">Your application remains pending until FastCheckIn has reviewed and approved it.</p>
      </div>
    </div>
  );
}
