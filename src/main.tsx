// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initLanguage } from './i18n';
import { initGrammarly } from './services/grammarlyService';

// ✅ Initialize Grammarly (optional - get Client ID from Grammarly Developer Portal)
// For development, you can use a mock or disable it
const GRAMMARLY_CLIENT_ID = import.meta.env.VITE_GRAMMARLY_CLIENT_ID || '';

if (GRAMMARLY_CLIENT_ID) {
  initGrammarly({
    clientId: GRAMMARLY_CLIENT_ID,
    enabled: true,
  });
  console.log('✅ Grammarly enabled');
} else {
  console.log('ℹ️ Grammarly not configured - running without spellcheck');
  console.log('📝 To enable: Add VITE_GRAMMARLY_CLIENT_ID to .env file');
}

// Initialize language system
initLanguage();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
