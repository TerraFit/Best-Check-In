import React from 'react';
import { useLocation, Link } from 'react-router-dom';

export default function RegistrationSuccess() {
  const location = useLocation();
  const email = location.state?.email || 'your email';

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-3xl font-serif font-bold text-stone-900 mb-2">
          Registration Submitted!
        </h1>
        
        <p className="text-stone-600 mb-6">
          Thank you for registering with Fast Checkin. We've sent a confirmation email to:
        </p>
        
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-amber-800 font-mono">{email}</p>
        </div>
        
        <div className="space-y-4 text-left bg-stone-50 rounded-xl p-6 mb-6">
          <h2 className="font-bold text-stone-900">What happens next?</h2>
          <ol className="space-y-3 text-sm text-stone-600">
            <li className="flex gap-3">
              <span className="bg-amber-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
              <span>Our team will review your application (usually within 24 hours)</span>
            </li>
            <li className="flex gap-3">
              <span className="bg-amber-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
              <span>You'll receive an email with your setup link and QR code</span>
            </li>
            <li className="flex gap-3">
              <span className="bg-amber-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
              <span>Complete your hotel profile (rooms, pricing, seasons)</span>
            </li>
            <li className="flex gap-3">
              <span className="bg-amber-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</span>
              <span>Start accepting guest check-ins!</span>
            </li>
          </ol>
        </div>
        
        <Link
          to="/"
          className="inline-block bg-stone-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-stone-800 transition-colors text-sm uppercase tracking-widest"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
}
