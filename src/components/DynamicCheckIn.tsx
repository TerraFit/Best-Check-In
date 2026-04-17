import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import CheckInForm from './CheckInForm';

interface BusinessBranding {
  id: string;
  trading_name: string;
  hero_image_url?: string;
  logo_url?: string;
  slogan?: string;
  welcome_message?: string;
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

    // Fetch business branding
    fetch(`/.netlify/functions/get-business-branding?id=${businessId}`)
      .then(res => {
        if (!res.ok) throw new Error('Business not found');
        return res.json();
      })
      .then(data => {
        setBusiness(data);
        // ✅ CRITICAL: Update browser tab title dynamically
        document.title = `${data.trading_name} - Check-In | FastCheckin`;
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching business:', err);
        setError(err.message);
        setLoading(false);
      });
  }, [businessId]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-white">Loading check-in...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !business) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Check-in Link</h1>
          <p className="text-gray-600 mb-6">
            This check-in link is invalid or the business no longer exists.
          </p>
          <a href="/" className="inline-block bg-amber-500 text-white px-6 py-3 rounded-lg font-semibold">
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  // ✅ Pass business branding to CheckInForm
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Dynamic Hero Section (if hero image exists) */}
      {business.hero_image_url && (
        <div className="relative bg-stone-900 text-white min-h-[60vh] flex items-center">
          <div className="absolute inset-0 overflow-hidden">
            <img 
              src={business.hero_image_url} 
              alt={business.trading_name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50" />
          </div>
          <div className="relative z-20 max-w-7xl mx-auto px-6 py-24">
            <div className="max-w-3xl">
              {business.logo_url && (
                <img 
                  src={business.logo_url} 
                  alt={business.trading_name}
                  className="h-20 w-auto object-contain mb-6"
                />
              )}
              <h1 className="text-5xl md:text-6xl font-serif font-bold mb-4">
                {business.trading_name}
              </h1>
              {business.slogan && (
                <p className="text-xl text-stone-200 mb-8 italic">
                  "{business.slogan}"
                </p>
              )}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 inline-block">
                <p className="text-amber-400 font-semibold mb-2">✨ Fast Digital Check-in</p>
                <p className="text-white">Complete your registration in under 2 minutes</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Check-in Form */}
      <CheckInForm 
        onComplete={(booking) => {
          console.log('Check-in complete:', booking);
          // Handle post-check-in success (show modal, etc.)
        }}
        businessId={businessId}
      />
    </div>
  );
}
