import React from 'react';
import { useLocation, Link } from 'react-router-dom';

export default function RegistrationSuccess() {
  const location = useLocation();
  const businessName = location.state?.businessName || 'your business';
  const email = location.state?.email || 'your email';
  const plan = location.state?.plan || 'Growth';
  const maxRooms = location.state?.maxRooms || 10;
  const trialEnd = location.state?.trialEnd || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString();

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-amber-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-3xl font-serif font-bold text-stone-900 mb-2">
          Welcome to FastCheckin! 🎉
        </h1>
        
        <p className="text-stone-600 mb-4">
          Your <span className="font-semibold text-amber-600">{plan}</span> plan is ready to go.
        </p>
        
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-amber-800 font-semibold">✨ Your 14-Day Free Trial Has Started ✨</p>
          <p className="text-sm text-amber-700 mt-1">Trial ends on: <strong>{trialEnd}</strong></p>
          <p className="text-xs text-amber-600 mt-2">No payment required until your trial ends</p>
        </div>
        
        <p className="text-stone-600 mb-6">
          We've sent a confirmation email to:
        </p>
        
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 mb-6">
          <p className="text-stone-800 font-mono">{email}</p>
        </div>
        
        <div className="space-y-4 text-left bg-stone-50 rounded-xl p-6 mb-6">
          <h2 className="font-bold text-stone-900">What happens next?</h2>
          <ol className="space-y-3 text-sm text-stone-600">
            <li className="flex gap-3">
              <span className="bg-amber-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
              <span>Check your email for your login credentials</span>
            </li>
            <li className="flex gap-3">
              <span className="bg-amber-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
              <span>Log in to your dashboard to complete your profile</span>
            </li>
            <li className="flex gap-3">
              <span className="bg-amber-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
              <span>Download your QR code and display it at reception</span>
            </li>
            <li className="flex gap-3">
              <span className="bg-amber-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</span>
              <span>Start accepting guest check-ins immediately!</span>
            </li>
          </ol>
        </div>
        
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-amber-800">
            💡 <strong>Pro tip:</strong> Log in now to set up your property and download your QR code.
          </p>
        </div>
        
        <div className="flex flex-col gap-3">
          <Link
            to="/business/login"
            className="bg-amber-500 text-white px-8 py-4 rounded-xl font-bold hover:bg-amber-600 transition-colors text-sm uppercase tracking-widest"
          >
            Log In to Your Dashboard
          </Link>
          <Link
            to="/"
            className="text-stone-500 hover:text-stone-700 transition-colors text-sm"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
