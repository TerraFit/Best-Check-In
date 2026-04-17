import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import CheckInForm from './CheckInForm';

interface BusinessBranding {
  id: string;
  trading_name: string;
  registered_name: string;
  hero_image_url?: string;
  logo_url?: string;
  slogan?: string;
  welcome_message?: string;
  phone?: string;
  email?: string;
  service_paused?: boolean;
  physical_address?: {
    city: string;
    province: string;
    country: string;
  };
}

export default function DynamicCheckIn() {
  const { businessId } = useParams<{ businessId: string }>();
  const [business, setBusiness] = useState<BusinessBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) {
      setError('No business specified');
      setLoading(false);
      return;
    }

    // Fetch business branding - single endpoint for everything
    fetch(`/.netlify/functions/get-business-branding?id=${businessId}`)
      .then(res => {
        if (res.status === 404) throw new Error('Business not found');
        if (!res.ok) throw new Error('Failed to load business');
        return res.json();
      })
      .then(data => {
        setBusiness(data);
        // ✅ CRITICAL: Update browser tab title dynamically
        document.title = `${data.trading_name} - Digital Check-in | FastCheckin`;
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching business:', err);
        setError(err.message);
        setLoading(false);
      });
  }, [businessId]);

  // Loading state with skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        {/* Skeleton Hero */}
        <div className="relative bg-stone-900 h-[60vh] flex items-center">
          <div className="absolute inset-0 skeleton"></div>
          <div className="relative z-20 max-w-7xl mx-auto px-6 py-24">
            <div className="skeleton h-12 w-64 rounded-lg mb-4"></div>
            <div className="skeleton h-8 w-96 rounded-lg"></div>
          </div>
        </div>
        {/* Skeleton Form */}
        <div className="max-w-5xl mx-auto py-10 px-4">
          <div className="bg-white rounded-3xl shadow-2xl p-10">
            <div className="skeleton h-10 w-48 rounded-lg mx-auto mb-8"></div>
            <div className="space-y-6">
              <div className="skeleton h-14 w-full rounded-xl"></div>
              <div className="skeleton h-14 w-full rounded-xl"></div>
              <div className="skeleton h-14 w-48 rounded-full mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state - business not found or invalid
  if (error || !business) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center shadow-2xl">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Check-in Link</h1>
          <p className="text-gray-600 mb-6">
            This check-in link is invalid or the business no longer exists.
            Please contact the establishment directly for assistance.
          </p>
          <a 
            href="/" 
            className="inline-block bg-amber-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-amber-600 transition-colors"
          >
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  // Service paused state
  if (business.service_paused) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center shadow-2xl">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-serif font-bold text-stone-900 mb-2">Temporarily Unavailable</h2>
          <p className="text-stone-600 mb-6">
            {business.trading_name} is currently not accepting online check-ins. 
            Please contact reception directly for assistance.
          </p>
          {business.phone && (
            <a 
              href={`tel:${business.phone}`}
              className="inline-block bg-amber-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-amber-600 transition-colors"
            >
              Call {business.phone}
            </a>
          )}
        </div>
      </div>
    );
  }

  // ✅ Render dynamic branded check-in page
  return (
    <>
      {/* Dynamic Hero Section - Only show if hero image exists */}
      {business.hero_image_url && (
        <div className="relative bg-stone-900 text-white min-h-[50vh] flex items-center">
          <div className="absolute inset-0 overflow-hidden">
            <img 
              src={business.hero_image_url} 
              alt={business.trading_name}
              className="w-full h-full object-cover"
              style={{ objectPosition: 'center' }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
          </div>
          <div className="relative z-20 max-w-7xl mx-auto px-6 py-16 md:py-24">
            <div className="max-w-2xl">
              {business.logo_url && (
                <img 
                  src={business.logo_url} 
                  alt={business.trading_name}
                  className="h-16 md:h-20 w-auto object-contain mb-6 logo-high-res"
                />
              )}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold mb-4">
                {business.trading_name}
              </h1>
              {business.slogan && (
                <p className="text-lg md:text-xl text-stone-200 mb-6 italic">
                  "{business.slogan}"
                </p>
              )}
              {business.physical_address && (
                <p className="text-stone-300 text-sm flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {business.physical_address.city}, {business.physical_address.province}
                </p>
              )}
              <div className="mt-8 inline-block bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/20">
                <p className="text-amber-400 font-semibold text-sm mb-1">✨ Fast Digital Check-in</p>
                <p className="text-white text-sm">Complete your registration in under 2 minutes</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No hero image - show simple branded header */}
      {!business.hero_image_url && (
        <div className="bg-stone-900 text-white py-12">
          <div className="max-w-7xl mx-auto px-6 text-center">
            {business.logo_url && (
              <img 
                src={business.logo_url} 
                alt={business.trading_name}
                className="h-16 w-auto object-contain mx-auto mb-4 logo-high-res"
              />
            )}
            <h1 className="text-3xl md:text-4xl font-serif font-bold">
              {business.trading_name}
            </h1>
            {business.slogan && (
              <p className="text-stone-300 mt-2 italic">"{business.slogan}"</p>
            )}
          </div>
        </div>
      )}

      {/* Check-in Form */}
      <CheckInForm 
        onComplete={(booking) => {
          console.log('✅ Check-in complete:', booking);
          // The success modal is handled inside CheckInForm
        }}
        businessId={businessId}
      />

      {/* Powered by Footer */}
      <div className="text-center py-6 border-t border-stone-200 bg-white">
        <div className="flex items-center justify-center gap-2 text-stone-400 text-xs">
          <span>Powered by</span>
          <img 
            src="/fastcheckin-logo.png" 
            alt="FastCheckin" 
            className="h-4 w-auto object-contain"
          />
          <span>FastCheckin</span>
        </div>
      </div>
    </>
  );
}
