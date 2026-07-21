// src/components/checkin/Step5_Success.tsx
import React from 'react';
import { useTranslation } from '../../i18n';

interface Step5SuccessProps {
  businessName: string;
  email: string;
  onReset: () => void;
  guestName?: string;
}

export function Step5Success({ businessName, email, onReset, guestName }: Step5SuccessProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white shadow-2xl rounded-[2.5rem] overflow-hidden border border-stone-100 p-10 md:p-16 text-center animate-fade-in flex flex-col items-center justify-center min-h-[700px]">
      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      
      <h2 className="text-3xl font-serif font-bold text-stone-900 mb-4">
        {t('success_checkin_complete')}
      </h2>
      
      <p className="text-lg text-stone-600 mb-2">
        {t('success_welcome', { businessName })}
      </p>
      
      <p className="text-stone-500 mb-8">
        {t('success_email_sent', { email })}
      </p>
      
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 max-w-md mx-auto mb-8 text-left">
        <h3 className="font-bold text-amber-800 mb-2">{t('success_next_steps')}</h3>
        <ul className="text-sm text-amber-700 space-y-2">
          <li>✓ {t('success_step_checkin_recorded')}</li>
          <li>✓ {t('success_step_email_sent')}</li>
          <li>✓ {t('success_step_keys')}</li>
        </ul>
      </div>
      
      <button
        onClick={onReset}
        className="bg-amber-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-amber-700 transition-all shadow-md text-sm uppercase tracking-wider"
      >
        {t('success_new_guest_button')}
      </button>
    </div>
  );
}
