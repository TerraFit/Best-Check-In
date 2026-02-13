import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY!);

interface AccountSetupProps {
  data: {
    email: string;
    password: string;
    confirmPassword: string;
    subscriptionTier: 'monthly' | 'annual';
    paymentMethod: 'card' | 'eft';
  };
  onChange: (field: string, value: any) => void;
  onSubmit: () => void;
  onBack: () => void;
}

export default function AccountSetup({ data, onChange, onSubmit, onBack }: AccountSetupProps) {
  const [processing, setProcessing] = useState(false);
  const [showEftDetails, setShowEftDetails] = useState(false);

  const prices = {
    monthly: 299,
    annual: 2990 // 10 months for price of 12
  };

  const handleStripePayment = async () => {
    setProcessing(true);
    const stripe = await stripePromise;
    
    // Create payment session
    const response = await fetch('/.netlify/functions/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tier: data.subscriptionTier,
        email: data.email
      })
    });
    
    const session = await response.json();
    
    // Redirect to Stripe
    const result = await stripe!.redirectToCheckout({
      sessionId: session.id
    });
    
    if (result.error) {
      alert(result.error.message);
      setProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (data.password !== data.confirmPassword) {
      alert("Passwords don't match");
      return;
    }
    
    if (data.password.length < 8) {
      alert("Password must be at least 8 characters");
      return;
    }
    
    if (data.paymentMethod === 'card') {
      await handleStripePayment();
    } else {
      setShowEftDetails(true);
    }
  };

  if (showEftDetails) {
    return (
      <div className="space-y-8">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-serif font-bold text-amber-900 mb-4">EFT Payment Details</h3>
          
          <div className="bg-white rounded-xl p-6 text-left space-y-4 mb-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-stone-500 mb-1">Bank</p>
              <p className="font-mono text-lg">First National Bank</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-stone-500 mb-1">Account Name</p>
              <p className="font-mono text-lg">Fast Checkin Pty Ltd</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-stone-500 mb-1">Account Number</p>
              <p className="font-mono text-lg">62789012345</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-stone-500 mb-1">Branch Code</p>
              <p className="font-mono text-lg">250655</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-stone-500 mb-1">Reference</p>
              <p className="font-mono text-lg bg-amber-100 p-2 rounded">FAST-{Date.now().toString().slice(-8)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-stone-500 mb-1">Amount Due</p>
              <p className="font-mono text-2xl font-bold text-amber-700">R {prices[data.subscriptionTier].toLocaleString()}</p>
            </div>
          </div>
          
          <p className="text-sm text-amber-800 mb-6">
            Your account will be activated within 24 hours of payment confirmation.
          </p>
          
          <button
            onClick={onSubmit}
            className="w-full bg-amber-600 text-white py-4 rounded-xl font-bold hover:bg-amber-700"
          >
            Complete Registration (Payment Pending)
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h2 className="text-3xl font-serif font-bold text-stone-900 mb-2">Account & Payment</h2>
        <p className="text-stone-500 text-sm">Create your admin account and choose your subscription.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
            Email Address <span className="text-amber-600">*</span>
          </label>
          <input
            type="email"
            required
            value={data.email}
            onChange={e => onChange('email', e.target.value)}
            className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500"
            placeholder="admin@jbaylodge.com"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
            Confirm Email <span className="text-amber-600">*</span>
          </label>
          <input
            type="email"
            required
            className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
            Password <span className="text-amber-600">*</span>
          </label>
          <input
            type="password"
            required
            value={data.password}
            onChange={e => onChange('password', e.target.value)}
            className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500"
            placeholder="••••••••"
          />
          <p className="text-[10px] text-stone-400 mt-1">Minimum 8 characters</p>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
            Confirm Password <span className="text-amber-600">*</span>
          </label>
          <input
            type="password"
            required
            value={data.confirmPassword}
            onChange={e => onChange('confirmPassword', e.target.value)}
            className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500"
            placeholder="••••••••"
          />
        </div>
      </div>

      {/* Subscription Tiers */}
      <div className="border-t border-stone-100 pt-8">
        <h3 className="text-xl font-serif font-bold text-stone-900 mb-6">Choose Your Plan</h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <label className={`
            border-2 rounded-2xl p-6 cursor-pointer transition-all
            ${data.subscriptionTier === 'monthly' 
              ? 'border-amber-600 bg-amber-50' 
              : 'border-stone-200 hover:border-amber-200'}
          `}>
            <input
              type="radio"
              name="tier"
              value="monthly"
              checked={data.subscriptionTier === 'monthly'}
              onChange={e => onChange('subscriptionTier', e.target.value)}
              className="sr-only"
            />
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-stone-900">Monthly</h4>
                <p className="text-2xl font-serif font-bold text-amber-700 mt-2">R299</p>
                <p className="text-xs text-stone-500">per month</p>
              </div>
              {data.subscriptionTier === 'monthly' && (
                <div className="bg-amber-600 text-white p-1 rounded-full">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          </label>

          <label className={`
            border-2 rounded-2xl p-6 cursor-pointer transition-all relative overflow-hidden
            ${data.subscriptionTier === 'annual' 
              ? 'border-amber-600 bg-amber-50' 
              : 'border-stone-200 hover:border-amber-200'}
          `}>
            <div className="absolute top-0 right-0 bg-amber-600 text-white px-3 py-1 text-[10px] font-bold uppercase">
              Save 17%
            </div>
            <input
              type="radio"
              name="tier"
              value="annual"
              checked={data.subscriptionTier === 'annual'}
              onChange={e => onChange('subscriptionTier', e.target.value)}
              className="sr-only"
            />
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-stone-900">Annual</h4>
                <p className="text-2xl font-serif font-bold text-amber-700 mt-2">R2,990</p>
                <p className="text-xs text-stone-500">R249/month</p>
              </div>
              {data.subscriptionTier === 'annual' && (
                <div className="bg-amber-600 text-white p-1 rounded-full">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          </label>
        </div>
      </div>

      {/* Payment Method */}
      <div className="border-t border-stone-100 pt-8">
        <h3 className="text-xl font-serif font-bold text-stone-900 mb-6">Payment Method</h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          <label className={`
            border rounded-xl p-4 cursor-pointer transition-all
            ${data.paymentMethod === 'card' 
              ? 'border-amber-600 bg-amber-50' 
              : 'border-stone-200 hover:border-amber-200'}
          `}>
            <input
              type="radio"
              name="paymentMethod"
              value="card"
              checked={data.paymentMethod === 'card'}
              onChange={e => onChange('paymentMethod', e.target.value)}
              className="sr-only"
            />
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M2 10h20" stroke="currentColor" strokeWidth="2"/>
                <circle cx="6" cy="16" r="1" fill="currentColor"/>
                <circle cx="12" cy="16" r="1" fill="currentColor"/>
              </svg>
              <span className="font-medium">Credit / Debit Card</span>
            </div>
          </label>

          <label className={`
            border rounded-xl p-4 cursor-pointer transition-all
            ${data.paymentMethod === 'eft' 
              ? 'border-amber-600 bg-amber-50' 
              : 'border-stone-200 hover:border-amber-200'}
          `}>
            <input
              type="radio"
              name="paymentMethod"
              value="eft"
              checked={data.paymentMethod === 'eft'}
              onChange={e => onChange('paymentMethod', e.target.value)}
              className="sr-only"
            />
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
              <span className="font-medium">EFT / Bank Transfer</span>
            </div>
          </label>
        </div>
      </div>

      {/* Terms */}
      <div className="bg-stone-50 p-6 rounded-xl">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            required
            className="w-5 h-5 mt-0.5 rounded border-stone-300 text-amber-600"
          />
          <span className="text-sm text-stone-600">
            I agree to the <a href="#" className="text-amber-700 font-bold hover:underline">Terms of Service</a> and 
            <a href="#" className="text-amber-700 font-bold hover:underline ml-1">Privacy Policy</a>. I understand that 
            my subscription will automatically renew unless cancelled.
          </span>
        </label>
      </div>

      <div className="flex justify-between pt-6">
        <button
          type="button"
          onClick={onBack}
          className="px-8 py-4 border border-stone-200 rounded-xl font-bold text-stone-600 hover:bg-stone-50 transition-all text-sm uppercase tracking-widest"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={processing}
          className="px-8 py-4 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-all shadow-lg text-sm uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? 'Processing...' : 'Complete Registration'}
        </button>
      </div>
    </form>
  );
}
