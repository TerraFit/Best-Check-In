
import React from 'react';
import { ViewState } from '../types';

interface NavbarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  onLogout?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, onLogout }) => {
  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div 
            className="flex-shrink-0 flex items-center cursor-pointer" 
            onClick={() => onNavigate('HOME')}
          >
            <span className="text-xl font-bold tracking-tighter text-stone-800">
              J-BAY <span className="text-amber-700">ZEBRA</span> LODGE
            </span>
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <button
                onClick={() => onNavigate('HOME')}
                className={`${currentView === 'HOME' ? 'text-amber-700 font-semibold' : 'text-stone-600'} hover:text-amber-600 px-3 py-2 rounded-md text-sm transition-colors`}
              >
                Home
              </button>
              <button
                onClick={() => onNavigate('CHECKIN')}
                className={`${currentView === 'CHECKIN' ? 'text-amber-700 font-semibold' : 'text-stone-600'} hover:text-amber-600 px-3 py-2 rounded-md text-sm transition-colors`}
              >
                Guest Check-In
              </button>
              <button
                onClick={() => onNavigate('ADMIN_DASHBOARD')}
                className={`${currentView === 'ADMIN_DASHBOARD' || currentView === 'REPORTS' || currentView === 'IMPORT' ? 'text-amber-700 font-semibold' : 'text-stone-600'} hover:text-amber-600 px-3 py-2 rounded-md text-sm transition-colors`}
              >
                Management
              </button>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="text-stone-400 hover:text-red-600 px-3 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-colors border border-stone-100"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
          <div className="md:hidden">
            <button className="text-stone-600 hover:text-amber-600" onClick={() => onNavigate('HOME')}>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
