import React, { useState } from 'react';
import { useTranslation } from '../i18n';

interface CheckinSuccessProps {
  booking: any;
  business?: {
    trading_name: string;
    website_url?: string;
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
  onClose?: () => void;
}

const CheckinSuccess: React.FC<CheckinSuccessProps> = ({ booking, business, onClose }) => {
  const { t } = useTranslation();
  const [emailSent, setEmailSent] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [unsubscribe, setUnsubscribe] = useState(false);
  
  const primaryColor = business?.primary_color || '#f59e0b';
  const secondaryColor = business?.secondary_color || '#1e1e1e';
  const businessName = business?.trading_name || t('success_guest_fallback');
  const guestEmail = booking?.email || booking?.guest_email;
  const guestFirst = (booking?.guestName || booking?.guest_name || '').split(' ')[0] || t('success_guest_fallback');

  const sendConfirmationEmail = async () => {
    if (!guestEmail) {
      alert(t('success_no_email'));
      return;
    }
    
    setSendingEmail(true);
    try {
      const response = await fetch('/.netlify/functions/send-checkin-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: guestEmail,
          guestName: booking?.guestName || booking?.guest_name,
          businessName,
          checkInDate: booking?.checkInDate || booking?.check_in_date,
          nights: booking?.nights,
          waiverData: booking?.signatureData,
          marketingConsent: booking?.popiaMarketingConsent,
          unsubscribe: unsubscribe
        })
      });
      
      if (response.ok) {
        setEmailSent(true);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert(t('success_email_failed'));
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-16 px-4 text-center">
      {/* Success Icon */}
      <div className="w-24 h-24 mx-auto mb-8 rounded-full flex items-center justify-center shadow-lg"
           style={{ backgroundColor: primaryColor }}>
        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      {/* Success Message */}
      <h1 className="text-3xl font-serif font-bold text-stone-900 mb-4">
        {t('success_checkin_complete')}
      </h1>
      <p className="text-stone-600 text-lg mb-2">
        {t('success_welcome', { businessName })}, {guestFirst}.
      </p>
      <p className="text-stone-500 mb-8">
        {t('success_registration_recorded')}
      </p>

      {/* Booking Summary */}
      <div className="bg-stone-50 rounded-2xl p-6 mb-8 text-left max-w-md mx-auto">
        <h3 className="font-bold text-stone-900 mb-3">{t('success_booking_summary')}</h3>
        <div className="space-y-2 text-sm">
          <p><span className="text-stone-500">{t('checkin_checkin_date_label')}:</span> {booking?.checkInDate || booking?.check_in_date}</p>
          <p><span className="text-stone-500">{t('checkin_nights_label')}:</span> {booking?.nights}</p>
          <p><span className="text-stone-500">{t('checkin_guest_label')}:</span> {t('checkin_adults_count', { count: booking?.adults || booking?.adults })} , {t('checkin_children_count', { count: booking?.kids || booking?.children })}</p>
          {booking?.arriving_from && (
            <p><span className="text-stone-500">{t('checkin_arriving_from')}:</span> {booking.arriving_from}</p>
          )}
          {booking?.next_destination && (
            <p><span className="text-stone-500">{t('checkin_next_destination')}:</span> {booking.next_destination}</p>
          )}
        </div>
      </div>

      {/* Marketing Consent & Email Options */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8 text-left">
        <div className="flex items-start gap-3 mb-4">
          <input
            type="checkbox"
            id="marketingConsent"
            checked={!unsubscribe}
            onChange={(e) => setUnsubscribe(!e.target.checked)}
            className="mt-1 w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
          />
          <label htmlFor="marketingConsent" className="text-sm text-amber-800">
            <span className="font-semibold">{t('success_marketing_offers', { businessName })}</span>
            <span className="block text-xs text-amber-600 mt-1">{t('success_marketing_privacy')}</span>
          </label>
        </div>
        
        <button
          onClick={sendConfirmationEmail}
          disabled={sendingEmail || emailSent}
          className="w-full mt-2 py-3 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50"
        >
          {sendingEmail ? t('success_sending') : emailSent ? t('success_email_sent_btn') : t('success_send_email')}
        </button>
        
        {emailSent && (
          <p className="text-xs text-amber-700 text-center mt-3">
            {t('success_email_details_sent')}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <a
          href={business?.website_url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="px-8 py-4 rounded-xl font-semibold transition-all hover:-translate-y-1 shadow-md text-center"
          style={{ backgroundColor: secondaryColor, color: 'white' }}
        >
          {t('success_visit_website', { businessName })}
        </a>
        
        <a
          href="https://fastcheckin.co.za"
          target="_blank"
          rel="noopener noreferrer"
          className="px-8 py-4 bg-stone-200 text-stone-700 rounded-xl font-semibold hover:bg-stone-300 transition-all text-center"
        >
          {t('success_get_app')}
        </a>
      </div>

      {/* Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="mt-6 text-sm text-stone-400 hover:text-stone-600 transition-colors"
        >
          {t('success_return_welcome')}
        </button>
      )}
    </div>
  );
};

export default CheckinSuccess;
