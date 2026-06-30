// src/components/LanguageDebug.tsx
// ⚡ Temporary - Remove after testing

import { useTranslation } from '../i18n';

export function LanguageDebug() {
  const { t, language } = useTranslation();
  
  return (
    <div className="fixed bottom-20 right-4 bg-stone-900 text-white px-4 py-3 rounded-lg z-[100] text-xs font-mono shadow-xl border border-stone-700">
      <div className="flex items-center gap-3">
        <span className="text-stone-400">🌐 Language:</span>
        <span className="font-bold text-amber-400">{language.toUpperCase()}</span>
        <span className="text-stone-500">|</span>
        <span className="text-stone-400">Welcome:</span>
        <span className="text-green-400">{t('common_welcome')}</span>
      </div>
    </div>
  );
}
