// src/i18n/languageService.ts
import type { SupportedLanguage, Translation, TranslationKeys, LanguageOption } from './types';
import enTranslations from './translations/en.json';
import afTranslations from './translations/af.json';
import deTranslations from './translations/de.json';
import frTranslations from './translations/fr.json';
import nlTranslations from './translations/nl.json';
import ptTranslations from './translations/pt.json';
import esTranslations from './translations/es.json';
import ruTranslations from './translations/ru.json';
// ✅ Add these imports
import zhTranslations from './translations/zh.json';
import arTranslations from './translations/ar.json';
import heTranslations from './translations/he.json';

// All translations
const translationMap: Record<SupportedLanguage, Translation> = {
  en: enTranslations as Translation,
  af: afTranslations as Translation,
  de: deTranslations as Translation,
  fr: frTranslations as Translation,
  nl: nlTranslations as Translation,
  pt: ptTranslations as Translation,
  es: esTranslations as Translation,
  ru: ruTranslations as Translation,
  // ✅ Add these
  zh: zhTranslations as Translation,
  ar: arTranslations as Translation,
  he: heTranslations as Translation
};

// Language options for selector
export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', flag: '🇿🇦' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  // ✅ Add these - with proper commas!
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱' }
];

// Storage key for user preference
const LANGUAGE_STORAGE_KEY = 'fastcheckin_preferred_language';

// Current language state (singleton for non-React contexts)
let currentLanguage: SupportedLanguage = 'en';
let languageChangeCallbacks: Set<(lang: SupportedLanguage) => void> = new Set();
let isInitialized = false;

// Detect browser language
export const detectBrowserLanguage = (): SupportedLanguage => {
  const browserLang = navigator.language.split('-')[0].toLowerCase();
  
  if (browserLang === 'af') return 'af';
  if (browserLang === 'de') return 'de';
  if (browserLang === 'fr') return 'fr';
  if (browserLang === 'nl') return 'nl';
  if (browserLang === 'pt') return 'pt';
  if (browserLang === 'es') return 'es';
  if (browserLang === 'ru') return 'ru';
  // ✅ Add these
  if (browserLang === 'zh') return 'zh';
  if (browserLang === 'ar') return 'ar';
  if (browserLang === 'he') return 'he';
  
  return 'en';
};

// Load saved language preference
export const loadSavedLanguage = (): SupportedLanguage => {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    const validLanguages: SupportedLanguage[] = ['en', 'af', 'de', 'fr', 'nl', 'pt', 'es', 'ru', 'zh', 'ar', 'he'];
    if (saved && validLanguages.includes(saved as SupportedLanguage)) {
      return saved as SupportedLanguage;
    }
  } catch (e) {
    console.warn('Failed to load saved language preference:', e);
  }
  return detectBrowserLanguage();
};

// Save language preference
export const saveLanguagePreference = (lang: SupportedLanguage): void => {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch (e) {
    console.warn('Failed to save language preference:', e);
  }
};

// Set current language
export const setLanguage = (lang: SupportedLanguage): void => {
  if (currentLanguage === lang && isInitialized) return;
  
  currentLanguage = lang;
  saveLanguagePreference(lang);
  
  // Update document direction for RTL languages
  const direction = getLanguageDirection(lang);
  document.documentElement.dir = direction;
  document.documentElement.lang = lang;
  
  // Notify all listeners
  languageChangeCallbacks.forEach(callback => {
    try {
      callback(lang);
    } catch (err) {
      console.error('Error in language change callback:', err);
    }
  });
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
  if (isInitialized) return currentLanguage;
  
  const saved = loadSavedLanguage();
  currentLanguage = saved;
  
  // Set document attributes
  const direction = getLanguageDirection(saved);
  document.documentElement.dir = direction;
  document.documentElement.lang = saved;
  
  isInitialized = true;
  console.log(`🌐 Language initialized: ${saved} (${getLanguageName(saved)})`);
  
  return saved;
};

// Get language name from code
export const getLanguageName = (code: SupportedLanguage): string => {
  const option = LANGUAGE_OPTIONS.find(opt => opt.code === code);
  return option?.nativeName || option?.name || code;
};

// Get flag emoji for language
export const getLanguageFlag = (code: SupportedLanguage): string => {
  const option = LANGUAGE_OPTIONS.find(opt => opt.code === code);
  return option?.flag || '🌐';
};

// Translation function with interpolation and fallback
export const t = (key: keyof TranslationKeys, params?: Record<string, string | number>): string => {
  // Get translation for current language
  let translation = translationMap[currentLanguage];
  let text = translation?.[key];
  
  // Fallback to English if translation missing
  if (!text && currentLanguage !== 'en') {
    text = translationMap.en?.[key];
  }
  
  // Final fallback to the key itself
  if (!text) {
    console.warn(`Missing translation key: ${key} for language: ${currentLanguage}`);
    return key;
  }
  
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
  return translationMap[currentLanguage] || translationMap.en;
};

// Get translations for a specific language
export const getTranslationsForLanguage = (lang: SupportedLanguage): Translation => {
  return translationMap[lang] || translationMap.en;
};

// Check if a language is RTL
export const isRTL = (lang: SupportedLanguage): boolean => {
  const rtlLanguages: SupportedLanguage[] = ['ar', 'he'];
  return rtlLanguages.includes(lang);
};

// Get language direction
export const getLanguageDirection = (lang: SupportedLanguage): 'ltr' | 'rtl' => {
  return isRTL(lang) ? 'rtl' : 'ltr';
};

// Get available languages list
export const getAvailableLanguages = (): LanguageOption[] => {
  return [...LANGUAGE_OPTIONS];
};

// Get supported language codes
export const getSupportedLanguageCodes = (): SupportedLanguage[] => {
  return ['en', 'af', 'de', 'fr', 'nl', 'pt', 'es', 'ru', 'zh', 'ar', 'he'];
};

// Check if a language code is supported
export const isLanguageSupported = (code: string): code is SupportedLanguage => {
  return getSupportedLanguageCodes().includes(code as SupportedLanguage);
};

// Auto-detect and set language based on browser preferences
export const autoDetectLanguage = (): SupportedLanguage => {
  const detected = detectBrowserLanguage();
  setLanguage(detected);
  return detected;
};

// Reset to browser default language
export const resetToBrowserLanguage = (): SupportedLanguage => {
  const browserLang = detectBrowserLanguage();
  setLanguage(browserLang);
  return browserLang;
};
