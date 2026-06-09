import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CheckInForm from '../components/CheckInForm';

interface BusinessBranding {
  id: string;
  trading_name: string;
  registered_name?: string;
  hero_image_url?: string;
  logo_url?: string;
  slogan?: string;
  welcome_message?: string;
  primary_color?: string;
  secondary_color?: string;
  phone?: string;
  email?: string;
  avg_price?: number;
  service_paused?: boolean;
  physical_address?: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
  };
}

// Success Modal Component
function SuccessModal({ booking, businessName, onClose }: { 
  booking: any; 
  businessName: string; 
  onClose: () => void;
}) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center shadow-2xl animate-scale-in">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h2 className="text-2xl font-serif font-bold text-stone-900 mb-2">
          Check-in Complete! 🎉
        </h2>
        
        <p className="text-stone-600 mb-4">
          Welcome to <span className="font-semibold text-amber-600">{businessName}</span>,<br />
          <span className="font-medium">{booking?.guestName}</span>!
        </p>
        
        <div className="bg-amber-50 rounded-xl p-4 mb-6 text-left">
          <p className="text-sm text-amber-800 font-semibold mb-2">✨ Booking Summary</p>
          <div className="space-y-1 text-sm">
            <p><span className="text-stone-600">Check-in:</span> {booking?.checkInDate}</p>
            <p><span className="text-stone-600">Nights:</span> {booking?.nights}</p>
            <p><span className="text-stone-600">Guests:</span> {booking?.adults} Adult(s), {booking?.kids} Child(ren)</p>
          </div>
        </div>
        
        <p className="text-sm text-stone-500 mb-4">
          A confirmation email has been sent to your email address.
        </p>
        
        <button
          onClick={onClose}
          className="w-full bg-amber-500 text-white py-3 rounded-xl font-semibold hover:bg-amber-600 transition-colors"
        >
          New Check-in ({countdown}s)
        </button>
        
        <button
          onClick={() => window.location.href = '/'}
          className="w-full mt-3 text-stone-500 text-sm hover:text-stone-700 transition-colors"
        >
          Return to Home
        </button>
      </div>
    </div>
  );
}

export default function DynamicCheckIn() {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  
  const [business, setBusiness] = useState<BusinessBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Loading check-in system...');
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastBooking, setLastBooking] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!businessId) {
      setError('No business specified');
      setLoading(false);
      return;
    }

    // Progress simulation for better UX
    const progressSteps = [
      { progress: 20, message: 'Connecting to secure server...', time: 300 },
      { progress: 40, message: 'Loading business information...', time: 600 },
      { progress: 60, message: 'Preparing secure check-in form...', time: 900 },
      { progress: 80, message: 'Almost ready...', time: 1200 },
    ];

    let stepIndex = 0;
    const progressInterval = setInterval(() => {
      if (stepIndex < progressSteps.length) {
        setLoadingProgress(progressSteps[stepIndex].progress);
        setLoadingMessage(progressSteps[stepIndex].message);
        stepIndex++;
      }
    }, 800);

    // Fetch business branding - API returns business object directly
    fetch(`/.netlify/functions/get-business-branding?id=${businessId}`)
      .then(res => {
        if (!res.ok) throw new Error('Business not found');
        return res.json();
      })
      .then(data => {
        console.log('✅ DynamicCheckIn - Business branding received:', data);
        console.log('✅ DynamicCheckIn - Trading name:', data.trading_name);
        setLoadingProgress(100);
        setLoadingMessage('Ready!');
        setBusiness(data);
        // Update browser tab title dynamically
        document.title = `${data.trading_name} - Check-In | FastCheckin`;
        
        // Small delay for smooth transition
        setTimeout(() => setLoading(false), 500);
      })
      .catch(err => {
        console.error('Error fetching business:', err);
        setError(err.message);
        setLoading(false);
      })
      .finally(() => {
        clearInterval(progressInterval);
      });

    return () => clearInterval(progressInterval);
  }, [businessId, refreshKey]);

  const handleCheckinComplete = (booking: any, accessToken?: string) => {
    console.log('✅ Check-in complete!', booking);
    setLastBooking(booking);
    setShowSuccessModal(true);
  };

  const handleModalClose = () => {
    setShowSuccessModal(false);
    setLastBooking(null);
    // Force refresh to reset the form
    setRefreshKey(prev => prev + 1);
  };

  // Enhanced Loading state with progress bar
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-8">
            <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          
          <div className="w-full bg-stone-700 rounded-full h-2 mb-4 overflow-hidden">
            <div 
              className="bg-amber-500 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          
          <p className="text-stone-300 text-sm font-medium">
            {loadingMessage}
          </p>
          <p className="text-stone-500 text-xs mt-2">
            Please wait while we prepare your secure check-in
          </p>
          
          <div className="mt-6 flex justify-center space-x-1">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
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
            {error || 'This check-in link is invalid or the business no longer exists.'}
          </p>
          <a href="/" className="inline-block bg-amber-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-amber-600 transition-colors">
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  // Pass business branding to CheckInForm
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
              onLoad={() => console.log('Hero image loaded')}
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
                  onLoad={() => console.log('Logo loaded')}
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

      {/* Check-in Form - PASS THE BRANDING DATA AS A PROP */}
      <CheckInForm 
        key={refreshKey}
        onComplete={handleCheckinComplete}
        businessId={businessId}
        businessBranding={business}
      />

      {/* Success Modal */}
      {showSuccessModal && lastBooking && (
        <SuccessModal 
          booking={lastBooking}
          businessName={business.trading_name}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
