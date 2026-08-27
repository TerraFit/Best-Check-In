// src/i18n/languageService.ts
// Translation runtime: canonical language packs plus portal-auth/employee additions.
import type { SupportedLanguage, Translation, TranslationKeys, LanguageOption } from './types';
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
import portalTranslations from './translations/portal-auth-employee.json';

const translationMap: Record<SupportedLanguage, Translation> = {
  en: { ...enTranslations, ...portalTranslations.en } as Translation,
  af: { ...afTranslations, ...portalTranslations.af } as Translation,
  de: { ...deTranslations, ...portalTranslations.de } as Translation,
  fr: { ...frTranslations, ...portalTranslations.fr } as Translation,
  nl: { ...nlTranslations, ...portalTranslations.nl } as Translation,
  pt: { ...ptTranslations, ...portalTranslations.pt } as Translation,
  es: { ...esTranslations, ...portalTranslations.es } as Translation,
  ru: { ...ruTranslations, ...portalTranslations.ru } as Translation,
  zh: { ...zhTranslations, ...portalTranslations.zh } as Translation,
  ar: { ...arTranslations, ...portalTranslations.ar } as Translation,
  he: { ...heTranslations, ...portalTranslations.he } as Translation,
  it: { ...itTranslations, ...portalTranslations.it } as Translation
};

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', flag: '🇿🇦' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱' },
];
const LANGUAGE_STORAGE_KEY = 'fastcheckin_preferred_language';
let currentLanguage: SupportedLanguage = 'en';
let languageChangeCallbacks: Set<(lang: SupportedLanguage) => void> = new Set();
let isInitialized = false;
export const detectBrowserLanguage = (): SupportedLanguage => { const browserLang = navigator.language.split('-')[0].toLowerCase(); const languageMap: Record<string, SupportedLanguage> = { af:'af',de:'de',fr:'fr',nl:'nl',pt:'pt',es:'es',ru:'ru',zh:'zh',ar:'ar',he:'he',it:'it' }; return languageMap[browserLang] || 'en'; };
export const loadSavedLanguage = (): SupportedLanguage => { try { const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY); const validLanguages: SupportedLanguage[] = ['en','af','de','fr','nl','pt','es','ru','zh','ar','he','it']; if(saved&&validLanguages.includes(saved as SupportedLanguage)) return saved as SupportedLanguage; } catch(e){ console.warn('Failed to load saved language preference:',e); } return detectBrowserLanguage(); };
export const saveLanguagePreference = (lang: SupportedLanguage): void => { try{localStorage.setItem(LANGUAGE_STORAGE_KEY,lang);}catch(e){console.warn('Failed to save language preference:',e);} };
export const setLanguage = (lang: SupportedLanguage): void => { if(currentLanguage===lang&&isInitialized)return; currentLanguage=lang; saveLanguagePreference(lang); document.documentElement.dir=getLanguageDirection(lang); document.documentElement.lang=lang; languageChangeCallbacks.forEach(callback=>{try{callback(lang);}catch(err){console.error('Error in language change callback:',err);}}); };
export const getCurrentLanguage = (): SupportedLanguage => currentLanguage;
export const onLanguageChange = (callback:(lang:SupportedLanguage)=>void):()=>void => { languageChangeCallbacks.add(callback); return()=>languageChangeCallbacks.delete(callback); };
export const initLanguage = (): SupportedLanguage => { if(isInitialized)return currentLanguage; const saved=loadSavedLanguage(); currentLanguage=saved; document.documentElement.dir=getLanguageDirection(saved); document.documentElement.lang=saved; isInitialized=true; console.log(`🌐 Language initialized: ${saved} (${getLanguageName(saved)})`); return saved; };
export const getLanguageName = (code:SupportedLanguage):string => { const option=LANGUAGE_OPTIONS.find(opt=>opt.code===code); return option?.nativeName||option?.name||code; };
export const getLanguageFlag = (code:SupportedLanguage):string => { const option=LANGUAGE_OPTIONS.find(opt=>opt.code===code); return option?.flag||'🌐'; };
export const t = (key:keyof TranslationKeys, params?:Record<string,string|number>):string => { if(key==='landing_cta_business_login') key='login_sign_in' as keyof TranslationKeys; let translation=translationMap[currentLanguage]; let text=translation?.[key]; if(!text&&currentLanguage!=='en')text=translationMap.en?.[key]; if(!text){console.warn(`Missing translation key: ${key} for language: ${currentLanguage}`);return key;} if(params)Object.entries(params).forEach(([param,value])=>{text=text!.replace(new RegExp(`\\{${param}\\}`,'g'),String(value));}); return text; };
export const getTranslations = ():Translation => translationMap[currentLanguage]||translationMap.en;
export const getTranslationsForLanguage = (lang:SupportedLanguage):Translation => translationMap[lang]||translationMap.en;
export const isRTL = (lang:SupportedLanguage):boolean => ['ar','he'].includes(lang);
export const getLanguageDirection = (lang:SupportedLanguage):'ltr'|'rtl' => isRTL(lang)?'rtl':'ltr';
export const getAvailableLanguages = ():LanguageOption[] => [...LANGUAGE_OPTIONS];
export const getSupportedLanguageCodes = ():SupportedLanguage[] => ['en','af','de','fr','nl','pt','es','ru','zh','ar','he','it'];
export const isLanguageSupported = (code:string):code is SupportedLanguage => getSupportedLanguageCodes().includes(code as SupportedLanguage);
export const autoDetectLanguage = ():SupportedLanguage => {const detected=detectBrowserLanguage();setLanguage(detected);return detected;};
export const resetToBrowserLanguage = ():SupportedLanguage => {const browserLang=detectBrowserLanguage();setLanguage(browserLang);return browserLang;};
