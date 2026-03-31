import React, { useState } from 'react';

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
  const [emailSent, setEmailSent] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [unsubscribe, setUnsubscribe] = useState(false);
  
  const primaryColor = business?.primary_color || '#f59e0b';
  const secondaryColor = business?.secondary_color || '#1e1e1e';
  const businessName = business?.trading_name || 'the lodge';
  const guestEmail = booking?.email || booking?.guest_email;

  const sendConfirmationEmail = async () => {
    if (!guestEmail) {
      alert('No email address provided');
      return;
    }
    
    setSendingEmail(true);
    try {
      // Call your email function
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
      alert('Could not send confirmation email. Please contact reception.');
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
        Check-in Complete!
      </h1>
      <p className="text-stone-600 text-lg mb-2">
        Welcome to {businessName}, {booking?.guestName?.split(' ')[0] || booking?.guest_name?.split(' ')[0] || 'Guest'}.
      </p>
      <p className="text-stone-500 mb-8">
        Your registration has been recorded. We hope you enjoy your stay.
      </p>

      {/* Booking Summary */}
      <div className="bg-stone-50 rounded-2xl p-6 mb-8 text-left max-w-md mx-auto">
        <h3 className="font-bold text-stone-900 mb-3">Booking Summary</h3>
        <div className="space-y-2 text-sm">
          <p><span className="text-stone-500">Check-in:</span> {booking?.checkInDate || booking?.check_in_date}</p>
          <p><span className="text-stone-500">Nights:</span> {booking?.nights}</p>
          <p><span className="text-stone-500">Guests:</span> {booking?.adults || booking?.adults} Adult(s), {booking?.kids || booking?.children} Child(ren)</p>
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
            <span className="font-semibold">Get exclusive offers and updates from {businessName}</span>
            <span className="block text-xs text-amber-600 mt-1">Unsubscribe anytime. We'll never share your email.</span>
          </label>
        </div>
        
        <button
          onClick={sendConfirmationEmail}
          disabled={sendingEmail || emailSent}
          className="w-full mt-2 py-3 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50"
        >
          {sendingEmail ? 'Sending...' : emailSent ? 'Confirmation Sent ✓' : 'Send Confirmation Email'}
        </button>
        
        {emailSent && (
          <p className="text-xs text-amber-700 text-center mt-3">
            A confirmation email with your waiver and check-in details has been sent.
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
          Visit {businessName} Website
        </a>
        
        <a
          href="https://fastcheckin.co.za"
          target="_blank"
          rel="noopener noreferrer"
          className="px-8 py-4 bg-stone-200 text-stone-700 rounded-xl font-semibold hover:bg-stone-300 transition-all text-center"
        >
          Get FastCheckin App
        </a>
      </div>

      {/* Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="mt-6 text-sm text-stone-400 hover:text-stone-600 transition-colors"
        >
          Return to Welcome Screen
        </button>
      )}
    </div>
  );
};

export default CheckinSuccess;
