import React from 'react';

interface HeroProps {
  onCheckIn: () => void;
}

export default function Hero({ onCheckIn }: HeroProps) {
  return (
    <div className="relative bg-stone-900 text-white min-h-[80vh] flex items-center">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-black/50 z-10" />
        <img 
          src="https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" 
          alt="J-Bay Zebra Lodge"
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="relative z-20 max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-3xl">
          <h1 className="text-5xl md:text-6xl font-serif font-bold mb-6 leading-tight">
            J-Bay <span className="text-amber-400">Zebra</span> Lodge
          </h1>
          <p className="text-xl md:text-2xl text-stone-200 mb-4 italic font-serif">
            "Enjoy Nature At Its Best"
          </p>
          <p className="text-lg text-stone-300 mb-8">
            Thornhill, Eastern Cape
          </p>
          
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
          
          <div className="flex gap-6 text-sm text-stone-400">
            <a href="https://www.jbayzebralodge.co.za" target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors">
              Official Website
            </a>
            <span>|</span>
            <span>Thornhill, Eastern Cape</span>
          </div>
        </div>
      </div>
    </div>
  );
}
