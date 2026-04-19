import React from 'react';

interface HeroProps {
  onCheckIn: () => void;
  businessBranding?: {
    trading_name: string;
    hero_image_url?: string;
    slogan?: string;
  } | null;
  loading?: boolean;
}

export default function Hero({ onCheckIn, businessBranding, loading }: HeroProps) {
  // Loading state
  if (loading) {
    return (
      <div className="relative bg-stone-900 min-h-[80vh] flex items-center justify-center">
        <div className="absolute inset-0 bg-stone-800 animate-pulse" />
        <div className="relative z-10">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  // If we have business branding (from QR code), use it
  if (businessBranding) {
    const backgroundImage = businessBranding.hero_image_url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80';
    
    return (
      <div className="relative bg-stone-900 text-white min-h-[80vh] flex items-center">
        <div className="absolute inset-0 overflow-hidden">
          <img 
            src={backgroundImage}
            alt={businessBranding.trading_name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50" />
        </div>
        
        <div className="relative z-20 max-w-7xl mx-auto px-6 py-24">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-6xl font-serif font-bold mb-6 leading-tight">
              {businessBranding.trading_name}
            </h1>
            {businessBranding.slogan && (
              <p className="text-xl md:text-2xl text-stone-200 mb-4 italic font-serif">
                "{businessBranding.slogan}"
              </p>
            )}
            
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 mb-8">
              <h2 className="text-2xl font-serif font-bold text-amber-400 mb-2">Arriving Guests</h2>
              <p className="text-stone-300 mb-6">Registration is mandatory for all guests</p>
              <button
                onClick={onCheckIn}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 shadow-lg"
              >
                Start Check-In
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback for non-QR home page (only shows "Welcome" not specific business)
  return (
    <div className="relative bg-stone-900 text-white min-h-[80vh] flex items-center">
      <div className="absolute inset-0 overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" 
          alt="Luxury accommodation"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50" />
      </div>
      
      <div className="relative z-20 max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-3xl">
          <h1 className="text-5xl md:text-6xl font-serif font-bold mb-6 leading-tight">
            Welcome to <span className="text-amber-400">FastCheckin</span>
          </h1>
          <p className="text-xl md:text-2xl text-stone-200 mb-8">
            Digital check-in for modern hospitality
          </p>
          
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-serif font-bold text-amber-400 mb-2">Guest Check-in</h2>
            <p className="text-stone-300 mb-6">Complete your registration in under 2 minutes</p>
            <button
              onClick={onCheckIn}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 shadow-lg"
            >
              Start Check-In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
