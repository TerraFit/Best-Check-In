import React from 'react';
import { useTranslation } from '../../i18n';

interface Step1EmailEntryProps {
  email: string;
  onEmailChange: (email: string) => void;
  saveDetails: boolean;
  onSaveDetailsChange: (saved: boolean) => void;
  popiaConsent: boolean;
  onPopiaConsentChange: (consent: boolean) => void;
  onSubmit: () => void;
  loading: boolean;
  businessName: string;
  businessSlogan?: string;
  businessLogo?: string;
  heroImage?: string;
  profileLoaded: boolean;
  profileSaveSuccess: boolean;
  primaryColor?: string;
}

export function Step1EmailEntry({
  email,
  onEmailChange,
  saveDetails,
  onSaveDetailsChange,
  popiaConsent,
  onPopiaConsentChange,
  onSubmit,
  loading,
  businessName,
  businessSlogan,
  businessLogo,
  heroImage,
  profileLoaded,
  profileSaveSuccess,
  primaryColor = '#f59e0b',
}: Step1EmailEntryProps) {
  const { t } = useTranslation();

  return (
    <div className="p-10 md:p-16 text-center animate-fade-in flex flex-col flex-grow items-center justify-center">
      <h2 className="text-sm font-bold tracking-[0.3em] text-amber-700 uppercase mb-4">
        {t('checkin_title')}
      </h2>
      <h1 className="text-5xl font-serif text-stone-900 mb-6 uppercase tracking-tight">
        {t('common_welcome_home')}
      </h1>
      {businessSlogan && !heroImage && (
        <p className="text-xl text-stone-500 mb-8 italic font-serif">{businessSlogan}</p>
      )}
      <p className="text-xl text-stone-500 mb-12 italic font-serif opacity-80">{businessName}</p>
      
      <div className="max-w-md w-full mx-auto space-y-8 text-left">
        <div className="space-y-3">
          <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest">
            {t('checkin_email_label')}
          </label>
          <input 
            required 
            type="email" 
            className="w-full border-b border-stone-200 py-3 outline-none focus:border-stone-900 transition-colors text-xl font-serif"
            value={email}
            onChange={e => onEmailChange(e.target.value)}
            placeholder="guest@example.com"
          />
          
          {profileLoaded && (
            <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm animate-fade-in">
              ✓ {t('checkin_profile_loaded')}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-3 p-4 bg-stone-50 rounded-xl border border-stone-200">
          <input
            type="checkbox"
            id="saveDetails"
            className="w-5 h-5 rounded border-stone-300 focus:ring-stone-900"
            checked={saveDetails}
            onChange={e => onSaveDetailsChange(e.target.checked)}
          />
          <label htmlFor="saveDetails" className="text-sm text-stone-700 cursor-pointer">
            <span className="font-bold">{t('checkin_save_details')}</span>
            <span className="text-xs text-stone-500 block">{t('checkin_save_details_sub')}</span>
          </label>
        </div>
        
        {profileSaveSuccess && (
          <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50 animate-fade-in">
            ✓ {t('checkin_profile_saved')}
          </div>
        )}

        <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200 flex items-start gap-4">
          <input 
            type="checkbox" 
            id="popia" 
            className="mt-1 w-5 h-5 rounded border-stone-300 focus:ring-stone-900"
            checked={popiaConsent}
            onChange={e => onPopiaConsentChange(e.target.checked)}
          />
          <label htmlFor="popia" className="text-xs text-stone-500 leading-relaxed cursor-pointer select-none">
            {t('checkin_popia_consent', { businessName })}
          </label>
        </div>
      </div>
      
      {/* ✅ FastCheckin Orange Button with white text */}
      <button 
        type="button"
        onClick={onSubmit}
        disabled={loading}
        className="mt-16 text-white px-14 py-5 rounded-full font-bold hover:opacity-90 transition-all uppercase tracking-widest text-[10px] shadow-2xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        style={{ backgroundColor: primaryColor || '#f59e0b' }}
      >
        {loading ? (
          <>
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            {t('common_processing')}
          </>
        ) : (
          t('checkin_begin_button')
        )}
      </button>
    </div>
  );
}
