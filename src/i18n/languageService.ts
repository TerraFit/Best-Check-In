// src/i18n/languageService.ts
import type { SupportedLanguage, Translation, TranslationKeys, LanguageOption } from './types';
import enTranslations from './translations/en.json';
import afTranslations from './translations/af.json';
import deTranslations from './translations/de.json';
import frTranslations from './translations/fr.json';
import nlTranslations from './translations/nl.json';
import ptTranslations from './translations/pt.json';
import esTranslations from './translations/es.json';

// All translations
const translationMap: Record<SupportedLanguage, Translation> = {
  en: enTranslations as Translation,
  af: afTranslations as Translation,
  de: deTranslations as Translation,
  fr: frTranslations as Translation,
  nl: nlTranslations as Translation,
  pt: ptTranslations as Translation,
  es: esTranslations as Translation
};

// Language options for selector
export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', flag: '🇿🇦' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' }
];

// Storage key for user preference
const LANGUAGE_STORAGE_KEY = 'fastcheckin_preferred_language';

// Current language state (singleton for non-React contexts)
let currentLanguage: SupportedLanguage = 'en';
let languageChangeCallbacks: Set<(lang: SupportedLanguage) => void> = new Set();

// Detect browser language
export const detectBrowserLanguage = (): SupportedLanguage => {
  const browserLang = navigator.language.split('-')[0].toLowerCase();
  
  if (browserLang === 'af') return 'af';
  if (browserLang === 'de') return 'de';
  if (browserLang === 'fr') return 'fr';
  if (browserLang === 'nl') return 'nl';
  if (browserLang === 'pt') return 'pt';
  if (browserLang === 'es') return 'es';
  
  return 'en';
};

// Load saved language preference
export const loadSavedLanguage = (): SupportedLanguage => {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved && (saved === 'en' || saved === 'af' || saved === 'de' || saved === 'fr' || saved === 'nl' || saved === 'pt' || saved === 'es')) {
      return saved as SupportedLanguage;
    }
  } catch (e) {
    // localStorage not available
  }
  return detectBrowserLanguage();
};

// Save language preference
export const saveLanguagePreference = (lang: SupportedLanguage): void => {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch (e) {
    // localStorage not available
  }
};

// Set current language
export const setLanguage = (lang: SupportedLanguage): void => {
  currentLanguage = lang;
  saveLanguagePreference(lang);
  
  // Notify all listeners
  languageChangeCallbacks.forEach(callback => callback(lang));
};

// Get current language
export const getCurrentLanguage = (): SupportedLanguage => {
  return currentLanguage;
};

// Subscribe to language changes (for React components)
export const onLanguageChange = (callback: (lang: SupportedLanguage) => void): () => void => {
  languageChangeCallbacks.add(callback);
  return () => languageChangeCallbacks.delete(callback);
};

// Initialize language system
export const initLanguage = (): SupportedLanguage => {
  const saved = loadSavedLanguage();
  currentLanguage = saved;
  return saved;
};

// Translation function with interpolation
export const t = (key: keyof TranslationKeys, params?: Record<string, string | number>): string => {
  const translation = translationMap[currentLanguage];
  let text = translation[key] || translationMap.en[key] || key;
  
  // Replace interpolation params like {name}
  if (params) {
    Object.entries(params).forEach(([param, value]) => {
      text = text.replace(new RegExp(`\\{${param}\\}`, 'g'), String(value));
    });
  }
  
  return text;
};

// Get full translation object (for components that need nested access)
export const getTranslations = (): Translation => {
  return translationMap[currentLanguage];
};

// Check if a language is RTL
export const isRTL = (lang: SupportedLanguage): boolean => {
  const rtlLanguages: SupportedLanguage[] = [];
  return rtlLanguages.includes(lang);
};

// Get language direction
export const getLanguageDirection = (lang: SupportedLanguage): 'ltr' | 'rtl' => {
  return isRTL(lang) ? 'rtl' : 'ltr';
};
