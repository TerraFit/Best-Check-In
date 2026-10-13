import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          action: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: (errorCode?: string) => void;
        }
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

type TurnstileWidgetProps = {
  action: 'homepage-download' | 'homepage-enquiry' | 'enterprise-enquiry';
  onToken: (token: string) => void;
  resetKey?: number;
};

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
const SCRIPT_ID = 'fastcheckin-turnstile-script';

export default function TurnstileWidget({ action, onToken, resetKey = 0 }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [widgetError, setWidgetError] = useState<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY || !containerRef.current) return;

    let cancelled = false;

    const render = () => {
      if (cancelled || !containerRef.current) return;
      if (!window.turnstile) {
        const message = 'Cloudflare Turnstile loaded without exposing its API.';
        console.error(`[FastCheckIn Turnstile] ${message}`, { action });
        setWidgetError(message);
        return;
      }
      try {
        setWidgetError(null);
        if (widgetIdRef.current) {
          window.turnstile.reset(widgetIdRef.current);
        } else {
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: SITE_KEY,
            action,
            callback: (token) => {
              setWidgetError(null);
              onToken(token);
            },
            'expired-callback': () => onToken(''),
            'error-callback': (errorCode) => {
              onToken('');
              const message = errorCode
                ? `Cloudflare Turnstile reported error ${errorCode}.`
                : 'Cloudflare Turnstile could not initialize or verify this hostname.';
              console.error(`[FastCheckIn Turnstile] ${message}`, {
                action,
                hostname: window.location.hostname,
                siteKeyConfigured: Boolean(SITE_KEY),
              });
              setWidgetError(message);
            },
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[FastCheckIn Turnstile] Widget render failed.', {
          action,
          hostname: window.location.hostname,
          siteKeyConfigured: Boolean(SITE_KEY),
          error: message,
        });
        setWidgetError(`Security verification could not start: ${message}`);
      }
    };

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      if (window.turnstile) render();
      else existing.addEventListener('load', render, { once: true });
    } else {
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      script.addEventListener('load', render, { once: true });
      script.addEventListener('error', () => {
        const message = 'Cloudflare Turnstile script failed to load.';
        console.error(`[FastCheckIn Turnstile] ${message}`, {
          action,
          hostname: window.location.hostname,
        });
        setWidgetError(message);
      }, { once: true });
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
    };
  }, [action, onToken]);

  useEffect(() => {
    if (resetKey > 0 && widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
      onToken('');
    }
  }, [resetKey, onToken]);

  if (!SITE_KEY) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        CAPTCHA is not configured yet. Please contact us if you need assistance.
      </p>
    );
  }

  return (
    <div>
      <div ref={containerRef} className="min-h-[65px]" aria-label="Security verification" />
      {widgetError && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          Security verification failed to start. Please refresh and try again. ({widgetError})
        </p>
      )}
    </div>
  );
}
