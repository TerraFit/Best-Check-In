import React from 'react';

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
  const primaryColor = business?.primary_color || '#f59e0b';
  const secondaryColor = business?.secondary_color || '#1e1e1e';
  const businessName = business?.trading_name || 'the lodge';

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
        Welcome to {businessName}, {booking?.guestName?.split(' ')[0] || 'Guest'}.
      </p>
      <p className="text-stone-500 mb-8">
        Your registration has been recorded. We hope you enjoy your stay.
      </p>

      {/* Booking Summary */}
      <div className="bg-stone-50 rounded-2xl p-6 mb-8 text-left max-w-md mx-auto">
        <h3 className="font-bold text-stone-900 mb-3">Booking Summary</h3>
        <div className="space-y-2 text-sm">
          <p><span className="text-stone-500">Check-in:</span> {booking?.checkInDate}</p>
          <p><span className="text-stone-500">Nights:</span> {booking?.nights}</p>
          <p><span className="text-stone-500">Guests:</span> {booking?.adults} Adult(s), {booking?.kids} Child(ren)</p>
        </div>
      </div>

      {/* Action Buttons - FIXED */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <a
          href={business?.website_url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="px-8 py-4 rounded-xl font-semibold transition-all hover:-translate-y-1 shadow-md"
          style={{ backgroundColor: secondaryColor, color: 'white' }}
        >
          Visit {businessName} Website
        </a>
        
        <a
          href="https://fastcheckin.co.za"
          target="_blank"
          rel="noopener noreferrer"
          className="px-8 py-4 bg-stone-200 text-stone-700 rounded-xl font-semibold hover:bg-stone-300 transition-all"
        >
          Get FastCheckin App
        </a>
      </div>
    </div>
  );
};

export default CheckinSuccess;
