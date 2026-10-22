// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initLanguage } from './i18n';
import { initGrammarly } from './services/grammarlyService';

const GRAMMARLY_CLIENT_ID = import.meta.env.VITE_GRAMMARLY_CLIENT_ID || '';
const DETECTED_VISITOR_KEY = 'fastcheckin.detected.visitor';

if (GRAMMARLY_CLIENT_ID) {
  initGrammarly({ clientId: GRAMMARLY_CLIENT_ID, enabled: true });
  console.log('✅ Grammarly enabled');
} else {
  console.log('ℹ️ Grammarly not configured - running without spellcheck');
  console.log('📝 To enable: Add VITE_GRAMMARLY_CLIENT_ID to .env file');
}

async function detectVisitorContext(): Promise<{ countryCode: string; countryName: string | null } | null> {
  try {
    const response = await fetch('/.netlify/functions/market-context', { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data?.countryCode) return null;
    const context = { countryCode: String(data.countryCode).toUpperCase(), countryName: data.countryName || null };
    sessionStorage.setItem(DETECTED_VISITOR_KEY, JSON.stringify(context));
    return context;
  } catch {
    return null;
  }
}

async function bootstrap() {
  const savedLanguage = (() => { try { return localStorage.getItem('fastcheckin_preferred_language'); } catch { return null; } })();
  const visitor = savedLanguage ? null : await Promise.race([
    detectVisitorContext(),
    new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 1000)),
  ]);
  initLanguage(visitor?.countryCode || null);

  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Failed to find the root element');
  ReactDOM.createRoot(rootElement).render(<React.StrictMode><App /></React.StrictMode>);
}

void bootstrap();
