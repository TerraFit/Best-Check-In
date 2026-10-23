// src/i18n/languageService.ts
// Language detection uses an explicit saved choice first, then a supported local-language
// default, then English when no supported local-language default is available.

import type { SupportedLanguage, Translation, TranslationKeys, LanguageOption } from './types';
export type { SupportedLanguage, Translation, TranslationKeys, LanguageOption } from './types';
import enTranslations from './translations/en.json';
import afTranslations from './translations/af.json';
import deTranslations from './translations/de.json';
import frTranslations from './translations/fr.json';
import nlTranslations from './translations/nl.json';
import ptTranslations from './translations/pt.json';
import esTranslations from './translations/es.json';
import ruTranslations from './translations/ru.json';
import zhTranslations from './translations/zh.json';
import arTranslations from './translations/ar.json';
import heTranslations from './translations/he.json';
import itTranslations from './translations/it.json';

const translationMap: Record<SupportedLanguage, Translation> = { en: enTranslations as Translation, af: afTranslations as Translation, de: deTranslations as Translation, fr: frTranslations as Translation, nl: nlTranslations as Translation, pt: ptTranslations as Translation, es: esTranslations as Translation, ru: ruTranslations as Translation, zh: zhTranslations as Translation, ar: arTranslations as Translation, he: heTranslations as Translation, it: itTranslations as Translation };
export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' }, { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', flag: '🇿🇦' }, { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' }, { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' }, { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' }, { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' }, { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' }, { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' }, { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' }, { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' }, { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' }, { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱' },
];

const LANGUAGE_STORAGE_KEY = 'fastcheckin_preferred_language';
const SUPPORTED_CODES: SupportedLanguage[] = ['en', 'af', 'de', 'fr', 'nl', 'pt', 'es', 'ru', 'zh', 'ar', 'he', 'it'];
const BROWSER_LANGUAGE_MAP: Record<string, SupportedLanguage> = { af: 'af', de: 'de', fr: 'fr', nl: 'nl', pt: 'pt', es: 'es', ru: 'ru', zh: 'zh', ar: 'ar', he: 'he', it: 'it', en: 'en' };

// Countries with multiple commonly used languages intentionally use the browser language
// when it is supported; otherwise they fall back to English.
const MULTILINGUAL_COUNTRIES = ['CH', 'BE', 'CA', 'SG', 'LU'];
const COUNTRY_LANGUAGE_MAP: Record<string, SupportedLanguage> = {
  ZA: 'en', GB: 'en', US: 'en', CA: 'en', AU: 'en', NZ: 'en', IE: 'en',
  DE: 'de', AT: 'de', FR: 'fr', IT: 'it', ES: 'es', PT: 'pt', BR: 'pt', AO: 'pt', MZ: 'pt',
  NL: 'nl', RU: 'ru', BY: 'ru', UA: 'ru',
  CN: 'zh', TW: 'zh', HK: 'zh',
  IL: 'he',
  AE: 'ar', SA: 'ar', QA: 'ar', BH: 'ar', KW: 'ar', OM: 'ar', JO: 'ar', EG: 'ar', MA: 'ar', DZ: 'ar', TN: 'ar', LY: 'ar', IQ: 'ar', YE: 'ar', PS: 'ar', SD: 'ar',
  MX: 'es', CR: 'es', PA: 'es', GT: 'es', HN: 'es', SV: 'es', NI: 'es', BZ: 'en', CU: 'es', DO: 'es', HT: 'fr', JM: 'en', TT: 'en', BS: 'en', BB: 'en', PR: 'es',
  AR: 'es', CL: 'es', CO: 'es', PE: 'es', UY: 'es', EC: 'es', VE: 'es', BO: 'es', PY: 'es',
  LU: 'fr', SR: 'nl',
};

let currentLanguage: SupportedLanguage = 'en';
let languageChangeCallbacks: Set<(lang: SupportedLanguage) => void> = new Set();
let isInitialized = false;
export const detectBrowserLanguage = (): SupportedLanguage => { if (typeof navigator === 'undefined') return 'en'; const browserLang = navigator.language?.split('-')[0].toLowerCase() || 'en'; return BROWSER_LANGUAGE_MAP[browserLang] || 'en'; };
export const detectLanguageForCountry = (countryCode?: string | null): SupportedLanguage => {
  const country = (countryCode || '').toUpperCase();
  if (country === 'ZA') return detectBrowserLanguage() === 'af' ? 'af' : 'en';
  if (MULTILINGUAL_COUNTRIES.includes(country)) return detectBrowserLanguage();
  return COUNTRY_LANGUAGE_MAP[country] || 'en';
};
export const loadSavedLanguage = (countryCode?: string | null): SupportedLanguage => { try { const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY); if (saved && SUPPORTED_CODES.includes(saved as SupportedLanguage)) return saved as SupportedLanguage; } catch (e) { console.warn('Failed to load saved language preference:', e); } return countryCode ? detectLanguageForCountry(countryCode) : detectBrowserLanguage(); };
export const saveLanguagePreference = (lang: SupportedLanguage): void => { try { localStorage.setItem(LANGUAGE_STORAGE_KEY, lang); } catch (e) { console.warn('Failed to save language preference:', e); } };
export const setLanguage = (lang: SupportedLanguage): void => { if (currentLanguage === lang && isInitialized) return; currentLanguage = lang; saveLanguagePreference(lang); document.documentElement.dir = getLanguageDirection(lang); document.documentElement.lang = lang; languageChangeCallbacks.forEach(callback => { try { callback(lang); } catch (err) { console.error('Error in language change callback:', err); } }); };
export const getCurrentLanguage = (): SupportedLanguage => currentLanguage;
export const onLanguageChange = (callback: (lang: SupportedLanguage) => void): (() => void) => { languageChangeCallbacks.add(callback); return () => languageChangeCallbacks.delete(callback); };
export const initLanguage = (countryCode?: string | null): SupportedLanguage => { if (isInitialized) return currentLanguage; const saved = loadSavedLanguage(countryCode); currentLanguage = saved; document.documentElement.dir = getLanguageDirection(saved); document.documentElement.lang = saved; isInitialized = true; console.log(`🌐 Language initialized: ${saved} (${getLanguageName(saved)})`); return saved; };
export const getLanguageName = (code: SupportedLanguage): string => { const option = LANGUAGE_OPTIONS.find(opt => opt.code === code); return option?.nativeName || option?.name || code; };
export const getLanguageFlag = (code: SupportedLanguage): string => { const option = LANGUAGE_OPTIONS.find(opt => opt.code === code); return option?.flag || '🌐'; };
export const t = (key: keyof TranslationKeys, params?: Record<string, string | number>): string => { if (key === 'landing_cta_business_login') key = 'login_sign_in' as keyof TranslationKeys; let translation = translationMap[currentLanguage]; let text = translation?.[key]; if (!text && currentLanguage !== 'en') text = translationMap.en?.[key]; if (!text) { console.warn(`Missing translation key: ${key} for language: ${currentLanguage}`); return String(key); } if (params) Object.entries(params).forEach(([param, value]) => { text = text.replace(new RegExp(`\\{${param}\\}`, 'g'), String(value)); }); return text; };
export const getTranslations = (): Translation => translationMap[currentLanguage] || translationMap.en;
export const getTranslationsForLanguage = (lang: SupportedLanguage): Translation => translationMap[lang] || translationMap.en;
export const isRTL = (lang: SupportedLanguage): boolean => ['ar', 'he'].includes(lang);
export const getLanguageDirection = (lang: SupportedLanguage): 'ltr' | 'rtl' => isRTL(lang) ? 'rtl' : 'ltr';
export const getAvailableLanguages = (): LanguageOption[] => [...LANGUAGE_OPTIONS];
export const getSupportedLanguageCodes = (): SupportedLanguage[] => [...SUPPORTED_CODES];
export const isLanguageSupported = (code: string): code is SupportedLanguage => SUPPORTED_CODES.includes(code as SupportedLanguage);
export const autoDetectLanguage = (): SupportedLanguage => { const detected = detectBrowserLanguage(); setLanguage(detected); return detected; };
export const resetToBrowserLanguage = (): SupportedLanguage => { const browserLang = detectBrowserLanguage(); setLanguage(browserLang); return browserLang; };
