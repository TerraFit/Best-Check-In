import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function NewsletterSubscribe() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [businessName, setBusinessName] = useState('');

  const businessId = searchParams.get('business');
  const email = searchParams.get('email');
  const firstName = searchParams.get('firstName');
  const lastName = searchParams.get('lastName');

  useEffect(() => {
    if (!businessId || !email) {
      setStatus('error');
      return;
    }

    const subscribe = async () => {
      try {
        const response = await fetch('/.netlify/functions/newsletter-subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            business_id: businessId,
            email: decodeURIComponent(email),
            guest_name: firstName && lastName ? `${decodeURIComponent(firstName)} ${decodeURIComponent(lastName)}` : null,
            first_name: firstName ? decodeURIComponent(firstName) : null,
            last_name: lastName ? decodeURIComponent(lastName) : null,
            source: 'email'
          })
        });

        const data = await response.json();
        
        if (response.ok) {
          setBusinessName(data.business_name);
          setStatus('success');
        } else {
          setStatus('error');
        }
      } catch (error) {
        console.error('Subscription error:', error);
        setStatus('error');
      }
    };

    subscribe();
  }, [businessId, email, firstName, lastName]);

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-white">Processing your subscription...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">😢</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-6">We couldn't process your subscription. Please try again later.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // Success state
  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 max-w-md text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">You're in the draw!</h2>
        <p className="text-gray-600 mb-4">
          Thank you for subscribing to <strong>{businessName}</strong>'s newsletter!
        </p>
        <div className="bg-amber-50 p-4 rounded-lg mb-6">
          <p className="text-amber-800 font-semibold">✨ You've been entered to win ✨</p>
          <p className="text-sm text-amber-700">Good luck! We'll contact you if you win.</p>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Want better odds? Share this page with friends and family!
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
        >
          Return to Home
        </button>
      </div>
    </div>
  );
}
