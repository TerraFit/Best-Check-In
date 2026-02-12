import React, { useState, useEffect } from 'react';
import { ViewState, Booking, MonthlyData } from './types';
import { SAMPLE_BOOKINGS, MOCK_HISTORICAL_DATA } from './constants';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Dashboard from './components/Dashboard';
import CheckInForm from './components/CheckInForm';
import ImportData from './components/ImportData';
import Login from './pages/Login.tsx';

interface CheckInAppProps {
  externalNavigate?: (view: string) => void;
  initialView?: ViewState;
}

const CheckInApp: React.FC<CheckInAppProps> = ({ 
  externalNavigate, 
  initialView = 'HOME' 
}) => {
  const [currentView, setCurrentView] = useState<ViewState>(initialView);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Check BOTH authentication systems
    const oldAuth = localStorage.getItem('jbay_auth_session') === 'true';
    const newAuth = localStorage.getItem('jbay_user') !== null;
    return oldAuth || newAuth;
  });
  const [pendingView, setPendingView] = useState<ViewState | null>(null);
  const [bookings, setBookings] = useState<Booking[]>(() => {
    const saved = localStorage.getItem('jbay_bookings');
    return saved ? JSON.parse(saved) : SAMPLE_BOOKINGS;
  });
  const [historicalData, setHistoricalData] = useState<MonthlyData[]>(() => {
    const saved = localStorage.getItem('jbay_history');
    return saved ? JSON.parse(saved) : MOCK_HISTORICAL_DATA;
  });
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [wantsWhatsApp, setWantsWhatsApp] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  useEffect(() => {
    localStorage.setItem('jbay_bookings', JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem('jbay_history', JSON.stringify(historicalData));
  }, [historicalData]);

  const handleNavigate = (view: ViewState) => {
    // Use external navigate if provided (for React Router integration)
    if (externalNavigate) {
      externalNavigate(view);
      return;
    }
    
    // Otherwise use internal state (original behavior)
    const isAdminView = ['ADMIN_DASHBOARD', 'REPORTS', 'IMPORT'].includes(view);
    if (isAdminView && !isAuthenticated) {
      setPendingView(view);
      setCurrentView('LOGIN');
    } else {
      setCurrentView(view);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogin = (success: boolean, remember: boolean) => {
    if (success) {
      setIsAuthenticated(true);
      if (remember) {
        localStorage.setItem('jbay_auth_session', 'true');
      } else {
        localStorage.removeItem('jbay_auth_session');
      }
      handleNavigate(pendingView || 'ADMIN_DASHBOARD');
      setPendingView(null);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('jbay_auth_session');
    localStorage.removeItem('jbay_user');
    setCurrentView('HOME');
  };

  const handleCheckInComplete = (newBooking: Booking) => {
    setBookings(prev => [newBooking, ...prev]);
    setShowSuccessCard(true);
  };

  const handleImportedData = (newBookings: Booking[], newMonthly: MonthlyData[]) => {
    setBookings(prev => [...newBookings, ...prev]);
    setHistoricalData(prev => {
      const combined = [...prev];
      newMonthly.forEach(newItem => {
        const idx = combined.findIndex(i => i.month === newItem.month && i.year === newItem.year);
        if (idx >= 0) {
          combined[idx] = {
            ...combined[idx],
            bookings: combined[idx].bookings + newItem.bookings,
            revenue: combined[idx].revenue + newItem.revenue
          };
        } else {
          combined.push(newItem);
        }
      });
      return combined.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return m.indexOf(a.month) - m.indexOf(b.month);
      });
    });
  };

  const closeSuccessCard = () => {
    setShowSuccessCard(false);
    setWantsWhatsApp(false);
    setWhatsappStatus('idle');
    handleNavigate('HOME');
  };

  const handleWhatsAppToggle = (checked: boolean) => {
    setWantsWhatsApp(checked);
    if (checked) {
      setWhatsappStatus('sending');
      setTimeout(() => {
        setWhatsappStatus('sent');
      }, 2000);
    } else {
      setWhatsappStatus('idle');
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'HOME':
        return <Hero onCheckIn={() => handleNavigate('CHECKIN')} />;
      case 'LOGIN':
        return <Login onLogin={handleLogin} onCancel={() => setCurrentView('HOME')} />;
      case 'CHECKIN':
        return (
          <div className="min-h-screen bg-stone-50">
            <CheckInForm onComplete={handleCheckInComplete} />
          </div>
        );
      case 'ADMIN_DASHBOARD':
      case 'REPORTS':
        return (
          <div className="min-h-screen bg-stone-50">
            <Dashboard 
              data={historicalData} 
              bookings={bookings} 
              activeView={currentView} 
              onNavigate={handleNavigate}
            />
          </div>
        );
      case 'IMPORT':
        return (
          <div className="min-h-screen bg-stone-50">
            <ImportData 
              onImport={handleImportedData}
              existingBookings={bookings}
              existingMonthlyData={historicalData}
            />
          </div>
        );
      default:
        return <Hero onCheckIn={() => handleNavigate('CHECKIN')} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      {currentView !== 'HOME' && currentView !== 'LOGIN' && (
        <Navbar currentView={currentView} onNavigate={handleNavigate} onLogout={isAuthenticated ? handleLogout : undefined} />
      )}
      
      {/* TOP MENU BAR - FIXED WITH WINDOW.LOCATION */}
      {(currentView === 'ADMIN_DASHBOARD' || currentView === 'REPORTS' || currentView === 'IMPORT') && (
        <div className="bg-stone-900 text-stone-400 py-3 border-b border-stone-800 sticky top-16 z-40 shadow-md">
          <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
            <div className="flex gap-10 text-[10px] uppercase font-bold tracking-widest overflow-x-auto">
              <button 
                onClick={() => window.location.href = '/admin'}
                className={`whitespace-nowrap pb-1 transition-all ${window.location.pathname === '/admin' && !window.location.search.includes('view=reports') && !window.location.search.includes('view=import') ? 'text-amber-500 border-b-2 border-amber-500' : 'hover:text-stone-200'}`}
              >
                Marketing Overview
              </button>
              <button 
                onClick={() => window.location.href = '/admin?view=reports'}
                className={`whitespace-nowrap pb-1 transition-all ${window.location.search.includes('view=reports') ? 'text-amber-500 border-b-2 border-amber-500' : 'hover:text-stone-200'}`}
              >
                Guest Registry (Statutory)
              </button>
              <button 
                onClick={() => window.location.href = '/admin?view=import'}
                className={`whitespace-nowrap pb-1 transition-all ${window.location.search.includes('view=import') ? 'text-amber-500 border-b-2 border-amber-500' : 'hover:text-stone-200'}`}
              >
                Data Import
              </button>
            </div>
            <button 
              onClick={handleLogout}
              className="text-[9px] uppercase font-bold tracking-[0.2em] text-stone-500 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      )}

      <main className="flex-grow">
        {renderContent()}
      </main>

      {showSuccessCard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 text-center animate-scale-in">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h3 className="text-3xl font-serif font-bold text-stone-900 mb-4 leading-tight">
              Registration Complete!
            </h3>
            
            <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 mb-8 text-left">
              <h4 className="text-amber-900 font-bold text-xs uppercase tracking-widest mb-2">Welcome Connectivity</h4>
              <p className="text-amber-800 text-sm mb-1">Guest WiFi Password: <span className="font-mono font-bold select-all">zebralodge</span></p>
              <p className="text-stone-500 text-[10px]">Enjoy your stay at J-Bay Zebra Lodge.</p>
            </div>

            <div className="space-y-4 mb-8">
              <a 
                href="https://www.jbayzebralodge.co.za"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-stone-900 text-white font-bold py-5 rounded-2xl transition-all shadow-lg text-lg transform hover:-translate-y-1 text-center"
              >
                Visit Our Official Website
              </a>
              
              <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100 text-left">
                <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      id="whatsapp" 
                      disabled={whatsappStatus === 'sending'}
                      className="w-6 h-6 rounded-md border-stone-300 text-amber-700 focus:ring-amber-700 cursor-pointer disabled:opacity-50" 
                      checked={wantsWhatsApp}
                      onChange={(e) => handleWhatsAppToggle(e.target.checked)}
                    />
                    <label htmlFor="whatsapp" className="text-sm font-semibold text-stone-700 leading-tight cursor-pointer">
                      Send my indemnity copy to WhatsApp
                    </label>
                  </div>
                  
                  {whatsappStatus !== 'idle' && (
                    <div className="mt-3 pl-9 animate-fade-in">
                      {whatsappStatus === 'sending' ? (
                        <div className="flex items-center gap-2 text-stone-500 text-xs">
                          <div className="w-3 h-3 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                          <span>Generating WhatsApp link...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Sent!</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button 
              onClick={closeSuccessCard}
              className="w-full text-stone-500 font-bold py-4 rounded-xl hover:text-stone-900 transition-all uppercase tracking-widest text-xs"
            >
              Return to Welcome Screen
            </button>
          </div>
        </div>
      )}

      {currentView !== 'LOGIN' && (
        <footer className="bg-stone-900 text-stone-500 py-16 px-6 border-t border-stone-800 mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
            <div className="text-center md:text-left">
              <h4 className="text-white font-bold text-2xl mb-2 tracking-tighter">J-BAY <span className="text-amber-600">ZEBRA</span> LODGE</h4>
              <p className="text-sm italic font-serif text-stone-400">"Enjoy Nature At Its Best"</p>
            </div>
            <div className="flex flex-wrap justify-center gap-10 text-[10px] font-bold uppercase tracking-widest">
              <a href="https://www.jbayzebralodge.co.za" target="_blank" rel="noopener noreferrer" className="hover:text-amber-500 transition-colors">Official Website</a>
              <a href="#" className="hover:text-amber-500 transition-colors">Conservation</a>
              <button 
                onClick={() => {
                  if (externalNavigate) {
                    externalNavigate('LOGIN');
                  } else {
                    handleNavigate('LOGIN');
                  }
                }}
                className="text-stone-400 hover:text-white border border-stone-700 px-4 py-1 rounded transition-all"
              >
                Admin Portal
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default CheckInApp;
