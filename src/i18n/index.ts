// src/i18n/index.ts
export { useTranslation } from './useTranslation';
export { default as LanguageSelector } from './LanguageSelector';
export { 
  t, 
  setLanguage, 
  getCurrentLanguage, 
  initLanguage,
  LANGUAGE_OPTIONS,
  type SupportedLanguage,
  type TranslationKeys
} from './languageService';
