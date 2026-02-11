
import React from 'react';
import { ViewState } from '../types';

interface HeroProps {
  onCheckIn: () => void;
}

const Hero: React.FC<HeroProps> = ({ onCheckIn }) => {
  return (
    <div className="relative h-screen flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center z-0" 
        style={{ backgroundImage: `url('https://picsum.photos/id/1018/1920/1080')` }}
      >
        <div className="absolute inset-0 bg-stone-900/40"></div>
      </div>
      
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto flex flex-col items-center">
        <div className="mb-12">
           <h4 className="text-amber-500 font-bold uppercase tracking-[0.4em] text-xs mb-4">Welcome Home</h4>
           <h1 className="text-6xl md:text-8xl text-white font-serif font-bold mb-4 drop-shadow-2xl">
            J-Bay Zebra Lodge
           </h1>
           <p className="text-xl md:text-2xl text-stone-200 italic font-serif opacity-90">
            "Enjoy Nature At Its Best"
           </p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl p-10 rounded-[3rem] border border-white/20 shadow-2xl max-w-lg w-full">
           <p className="text-white text-sm font-bold uppercase tracking-widest mb-8">Arriving Guests</p>
           <button
            onClick={onCheckIn}
            className="w-full bg-white text-stone-900 px-12 py-6 rounded-3xl text-lg font-bold transition-all transform hover:scale-105 shadow-xl hover:bg-stone-50 mb-4"
          >
            Digital Check-In
          </button>
          <p className="text-stone-300 text-[10px] uppercase tracking-widest">Registration is mandatory for all guests</p>
        </div>

        <div className="mt-12 flex gap-8">
           <a href="https://www.jbayzebralodge.co.za" target="_blank" className="text-white/60 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors">Official Website</a>
           <span className="text-white/20">|</span>
           <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Thornhill, Eastern Cape</span>
        </div>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 opacity-30 animate-pulse">
        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </div>
  );
};

export default Hero;
