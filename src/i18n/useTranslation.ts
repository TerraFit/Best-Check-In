// src/i18n/useTranslation.ts
import { useState, useEffect, useCallback } from 'react';
import {
  t,
  getCurrentLanguage,
  setLanguage,
  onLanguageChange,
  getTranslations,
  type SupportedLanguage,
  type Translation,
  type TranslationKeys
} from './languageService';

interface UseTranslationReturn {
  t: (key: keyof TranslationKeys, params?: Record<string, string | number>) => string;
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  translations: Translation;
}

export const useTranslation = (): UseTranslationReturn => {
  const [language, setLanguageState] = useState<SupportedLanguage>(getCurrentLanguage());
  const [translations, setTranslations] = useState<Translation>(getTranslations());

  useEffect(() => {
    const unsubscribe = onLanguageChange((newLang) => {
      setLanguageState(newLang);
      setTranslations(getTranslations());
    });
    return unsubscribe;
  }, []);

  const handleSetLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguage(lang);
  }, []);

  const translate = useCallback((key: keyof TranslationKeys, params?: Record<string, string | number>) => {
    if (key === 'landing_cta_trial_note') {
      return '14-day free trial • Cancel anytime';
    }
    return t(key, params);
  }, []);

  return {
    t: translate,
    language,
    setLanguage: handleSetLanguage,
    translations
  };
};
