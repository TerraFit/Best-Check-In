// src/i18n/LanguageSelector.tsx
// ✅ MOVED TO BOTTOM-LEFT - No overlap with header buttons

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from './useTranslation';
import { LANGUAGE_OPTIONS, type SupportedLanguage } from './languageService';

interface LanguageSelectorProps {
  variant?: 'header' | 'footer' | 'dropdown';
  className?: string;
}

export default function LanguageSelector({ variant = 'header', className = '' }: LanguageSelectorProps) {
  const { t, language, setLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showDetectionToast, setShowDetectionToast] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<SupportedLanguage | null>(null);

  // Detect language on first visit
  useEffect(() => {
    const hasShownToast = sessionStorage.getItem('language_toast_shown');
    if (!hasShownToast) {
      const browserLang = navigator.language.split('-')[0].toLowerCase() as SupportedLanguage;
      const isSupported = LANGUAGE_OPTIONS.some(opt => opt.code === browserLang);
      
      if (isSupported && browserLang !== 'en' && browserLang !== language) {
        setDetectedLanguage(browserLang);
        setShowDetectionToast(true);
        sessionStorage.setItem('language_toast_shown', 'true');
        
        setTimeout(() => setShowDetectionToast(false), 10000);
      }
    }
  }, [language]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentOption = LANGUAGE_OPTIONS.find(opt => opt.code === language);
  
  const handleLanguageChange = (lang: SupportedLanguage) => {
    setLanguage(lang);
    setIsOpen(false);
  };

  const handleAcceptDetection = () => {
    if (detectedLanguage) {
      setLanguage(detectedLanguage);
      setShowDetectionToast(false);
    }
  };

  const handleDeclineDetection = () => {
    setShowDetectionToast(false);
  };

  // ✅ FOOTER VARIANT - Bottom-left, compact, no overlap
  if (variant === 'footer') {
    return (
      <>
        {/* Language Detection Toast - Bottom positioned */}
        {showDetectionToast && detectedLanguage && (
          <div className="fixed bottom-20 left-4 z-50 animate-slide-in-right max-w-[280px]">
            <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-3">
              <p className="text-xs text-gray-700">
                {t('language_detected_message', { 
                  language: LANGUAGE_OPTIONS.find(o => o.code === detectedLanguage)?.nativeName || detectedLanguage 
                })}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={handleAcceptDetection}
                  className="px-3 py-1 bg-orange-500 text-white text-xs rounded-lg hover:bg-orange-600 transition-colors"
                >
                  {t('language_switch_confirm')}
                </button>
                <button
                  onClick={handleDeclineDetection}
                  className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {t('language_stay')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Language Selector - Compact, bottom-left */}
        <div ref={dropdownRef} className={`relative ${className}`}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-600 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
            aria-label={t('language_selector_title')}
          >
            <span className="text-base">{currentOption?.flag}</span>
            <span className="hidden sm:inline text-xs">{currentOption?.name}</span>
            <svg 
              className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isOpen && (
            <div className="absolute bottom-full left-0 mb-1 w-36 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 max-h-[300px] overflow-y-auto">
              {LANGUAGE_OPTIONS.map(option => (
                <button
                  key={option.code}
                  onClick={() => handleLanguageChange(option.code)}
                  className={`w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-gray-50 transition-colors text-xs ${
                    language === option.code ? 'bg-orange-50 text-orange-600' : 'text-gray-700'
                  }`}
                >
                  <span className="text-base">{option.flag}</span>
                  <span className="text-xs truncate">{option.nativeName}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </>
    );
  }

  // HEADER VARIANT - For other pages, but we're not using this anymore
  return (
    <>
      {showDetectionToast && detectedLanguage && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-w-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 text-2xl">
                {LANGUAGE_OPTIONS.find(o => o.code === detectedLanguage)?.flag}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-700">
                  {t('language_detected_message', { 
                    language: LANGUAGE_OPTIONS.find(o => o.code === detectedLanguage)?.nativeName || detectedLanguage 
                  })}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={handleAcceptDetection}
                    className="px-3 py-1 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    {t('language_switch_confirm')}
                  </button>
                  <button
                    onClick={handleDeclineDetection}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    {t('language_stay')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div ref={dropdownRef} className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
          aria-label={t('language_selector_title')}
        >
          <span className="text-lg">{currentOption?.flag}</span>
          <span className="hidden sm:inline">{currentOption?.name}</span>
          <svg 
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
            {LANGUAGE_OPTIONS.map(option => (
              <button
                key={option.code}
                onClick={() => handleLanguageChange(option.code)}
                className={`w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                  language === option.code ? 'bg-orange-50 text-orange-600' : 'text-gray-700'
                }`}
              >
                <span className="text-lg">{option.flag}</span>
                <span className="text-sm">{option.nativeName}</span>
                {language === option.code && (
                  <svg className="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
