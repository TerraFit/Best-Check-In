// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initLanguage } from './i18n';
import { initGrammarly } from './services/grammarlyService';

const GRAMMARLY_CLIENT_ID = import.meta.env.VITE_GRAMMARLY_CLIENT_ID || '';

if (GRAMMARLY_CLIENT_ID) {
  initGrammarly({ clientId: GRAMMARLY_CLIENT_ID, enabled: true });
  console.log('✅ Grammarly enabled');
} else {
  console.log('ℹ️ Grammarly not configured - running without spellcheck');
  console.log('📝 To enable: Add VITE_GRAMMARLY_CLIENT_ID to .env file');
}

async function detectVisitorCountry(): Promise<string | null> {
  try {
    const response = await fetch('/.netlify/functions/market-context', { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.countryCode || null;
  } catch {
    return null;
  }
}

async function bootstrap() {
  // If the visitor has already chosen a language, initLanguage() returns that
  // immediately. Otherwise, wait briefly for Netlify GeoIP so the first render
  // can use the country's supported local language rather than flashing English.
  const countryCode = await Promise.race([
    detectVisitorCountry(),
    new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 1000)),
  ]);
  initLanguage(countryCode);

  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Failed to find the root element');

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

void bootstrap();
