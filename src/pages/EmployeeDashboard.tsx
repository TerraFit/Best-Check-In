// src/pages/EmployeeDashboard.tsx
// ✅ COMPLETE: Using GuestOverviewTab with modal support

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, Users, Utensils, Calendar, 
  User, Bed, UserCheck, UserX,
  QrCode, PlusCircle
} from 'lucide-react';
import Logo from '../components/Logo';
import QRCodeModal from '../components/QRCodeModal';
import { GuestOverviewTab } from '../components/staff/GuestOverviewTab';

interface Booking {
  id: string;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  guest_country?: string;
  guest_province?: string;
  guest_city?: string;
  check_in_date?: string;
  check_out_date?: string;
  status?: string;
  nights?: number;
  food_restrictions?: {
    vegetarian: boolean;
    vegan: boolean;
    halal: boolean;
    kosher: boolean;
    gluten_free: boolean;
    dairy_free: boolean;
    lactose_intolerant: boolean;
    nut_allergy: boolean;
    shellfish_allergy: boolean;
    egg_allergy: boolean;
    soy_allergy: boolean;
    pork_free: boolean;
    diabetic: boolean;
    no_seafood: boolean;
    carnivore?: boolean;
    other: boolean;
    other_text?: string;
  };
}

interface EmployeeUser {
  id: string;
  full_name: string;
  phone_number: string;
  business_id: string;
  role: string;
}

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'dietaries'>('overview');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<EmployeeUser | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);

  // ============================================================
  // ✅ GET EMPLOYEE DATA FROM SESSION
  // ============================================================
  useEffect(() => {
    try {
      const authStr = localStorage.getItem('fastcheckin_employee_auth');
      if (authStr) {
        const auth = JSON.parse(authStr);
        setEmployee(auth.user);
        setBusinessId(auth.user?.businessId || null);
      }
    } catch (e) {
      console.error('Error getting employee data:', e);
    }
  }, []);

  // ============================================================
  // ✅ FETCH BOOKINGS
  // ============================================================
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const authStr = localStorage.getItem('fastcheckin_auth');
        const auth = authStr ? JSON.parse(authStr) : null;
        const token = auth?.token;

        if (!token) {
          console.error('No auth token found');
          setLoading(false);
          return;
        }

        const businessIdFromAuth = auth?.user?.businessId;
        if (!businessIdFromAuth) {
          console.error('No business ID found');
          setLoading(false);
          return;
        }

        const response = await fetch(
          `/.netlify/functions/get-business-bookings?businessId=${businessIdFromAuth}&limit=1000&page=1`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          setBookings(data.bookings || []);
          
          // Get business name
          const bizResponse = await fetch(
            `/.netlify/functions/get-business-branding?id=${businessIdFromAuth}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          if (bizResponse.ok) {
            const bizData = await bizResponse.json();
            setBusinessName(bizData.trading_name || 'J-Bay Zebra Lodge');
          }
        } else {
          console.error('Failed to fetch bookings');
        }
      } catch (error) {
        console.error('Error fetching bookings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  // ============================================================
  // ✅ LOGOUT
  // ============================================================
  const handleLogout = () => {
    localStorage.removeItem('fastcheckin_employee_auth');
    localStorage.removeItem('fastcheckin_auth');
    localStorage.removeItem('fastcheckin_business_auth');
    navigate('/employee/login');
  };

  // ============================================================
  // ✅ DATE HELPERS
  // ============================================================
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parseDate = (dateStr: string | undefined): Date | null => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  };

  // ============================================================
  // ✅ FILTER BOOKINGS - CORRECT LOGIC
  // ============================================================

  // ARRIVALS: Checking in TODAY
  const todaysArrivals = useMemo(() => {
    return bookings.filter(b => {
      const checkIn = parseDate(b.check_in_date);
      if (!checkIn) return false;
      return checkIn.getTime() === today.getTime();
    });
  }, [bookings]);

  // ✅ STAYOVERS: Checked in BEFORE today AND checking out AFTER today
  const stayovers = useMemo(() => {
    return bookings.filter(b => {
      const checkIn = parseDate(b.check_in_date);
      const checkOut = parseDate(b.check_out_date);
      
      if (!checkIn) return false;
      if (b.status !== 'checked_in') return false;
      if (checkIn.getTime() >= today.getTime()) return false;
      if (!checkOut) return true;
      return checkOut.getTime() > today.getTime();
    });
  }, [bookings]);

  // CHECK-OUTS: Checking out TODAY
  const todaysCheckouts = useMemo(() => {
    return bookings.filter(b => {
      const checkOut = parseDate(b.check_out_date);
      if (!checkOut) return false;
      return checkOut.getTime() === today.getTime();
    });
  }, [bookings]);

  // ✅ CURRENT GUESTS: All guests who are currently at the property
  const currentGuests = useMemo(() => {
    return [...todaysArrivals, ...stayovers, ...todaysCheckouts];
  }, [todaysArrivals, stayovers, todaysCheckouts]);

  // ============================================================
  // ✅ CHECK IF GUEST HAS DIETARY RESTRICTIONS
  // ============================================================
  const hasDietaryRestrictions = (guest: Booking): boolean => {
    const restrictions = guest.food_restrictions || {};
    return Object.entries(restrictions).some(([key, val]) => val === true && key !== 'other_text');
  };

  // ============================================================
  // ✅ GET GUEST LOCATION (province or city)
  // ============================================================
  const getGuestLocation = (guest: Booking): string => {
    return guest.guest_province || guest.guest_city || '';
  };

  // ✅ Get active restrictions with icons
  const getRestrictionItems = (guest: Booking): string[] => {
    const restrictions = guest.food_restrictions || {};
    const items: string[] = [];
    const iconMap: Record<string, string> = {
      vegetarian: '🥬',
      vegan: '🌱',
      pescatarian: '🐟',
      halal: '☪️',
      kosher: '✡️',
      gluten_free: '🌾',
      lactose_free: '🥛',
      nut_allergy: '🥜',
      seafood_allergy: '🦐',
      diabetic: '🍬',
      no_pork: '🐖',
      carnivore: '🥩',
      other: '📝'
    };
    
    Object.entries(restrictions).forEach(([key, val]) => {
      if (val === true && key !== 'other_text') {
        const icon = iconMap[key] || '🍽️';
        const label = key.replace('_', ' ').toUpperCase();
        items.push(`${icon} ${label}`);
      }
    });
    
    if (restrictions.other_text) {
      items.push(`📝 OTHER (${restrictions.other_text})`);
    }
    
    return items;
  };

  // ============================================================
  // ✅ LOADING STATE
  // ============================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4" />
          <p className="text-stone-400 text-sm">Loading employee dashboard...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // ✅ RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <Logo size="sm" />
              <div>
                <h1 className="text-sm font-bold text-stone-900">{businessName || 'Employee Portal'}</h1>
                <p className="text-[10px] text-stone-400 flex items-center gap-1">
                  <User size={10} /> {employee?.full_name || 'Staff'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="hidden sm:inline-block px-3 py-1 bg-amber-50 rounded-lg text-xs font-bold text-amber-700 border border-amber-200">
                🧑‍🍳 Staff Portal
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-stone-200 hover:border-red-200 text-stone-600 hover:text-red-600 rounded-xl text-xs font-semibold transition-all"
              >
                <LogOut size={12} /> Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Tabs */}
        <div className="flex border-b border-stone-200 overflow-x-auto gap-6 text-sm">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-4 px-1 font-semibold transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-amber-500 text-stone-950'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            📋 Guest Overview
          </button>
          <button
            onClick={() => setActiveTab('dietaries')}
            className={`pb-4 px-1 font-semibold transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'dietaries'
                ? 'border-amber-500 text-stone-950'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            🥑 Guest Dietaries / Restrictions
          </button>
        </div>

        {/* ============================================================
            TAB: OVERVIEW - Using GuestOverviewTab with Modal
            ============================================================ */}
        {activeTab === 'overview' && (
          <GuestOverviewTab
            bookings={bookings}
            todayArrivals={todaysArrivals}
            todayStayovers={stayovers}
            todayCheckouts={todaysCheckouts}
            businessId={businessId || ''}
            onShowQRModal={() => setShowQRModal(true)}
          />
        )}

        {/* ============================================================
            TAB: DIETARIES - ONLY CURRENT GUESTS with Icons
            ============================================================ */}
        {activeTab === 'dietaries' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-stone-100 bg-amber-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Utensils size={14} className="text-amber-700" />
                  <h3 className="font-bold text-xs uppercase tracking-widest text-amber-700">
                    Current Guest Dietary Requirements
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {currentGuests.filter(b => hasDietaryRestrictions(b)).length} guests
                  </span>
                  <span className="text-[10px] text-stone-400">
                    {todaysArrivals.length} arriving · {stayovers.length} staying · {todaysCheckouts.length} departing
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50/80 border-b border-stone-100 text-stone-400 font-bold uppercase tracking-widest text-[9px]">
                    <tr>
                      <th className="px-6 py-4">Guest Name</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Room / Location</th>
                      <th className="px-6 py-4">Dietary Restrictions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-medium">
                    {currentGuests.filter(b => hasDietaryRestrictions(b)).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-stone-400">
                          No dietary restrictions for current guests
                        </td>
                      </tr>
                    ) : (
                      currentGuests
                        .filter(b => hasDietaryRestrictions(b))
                        .map(guest => {
                          const restrictionItems = getRestrictionItems(guest);
                          
                          // Determine status label
                          let statusLabel = '';
                          let statusColor = '';
                          
                          if (todaysArrivals.some(a => a.id === guest.id)) {
                            statusLabel = 'Arriving Today';
                            statusColor = 'bg-green-100 text-green-800';
                          } else if (todaysCheckouts.some(c => c.id === guest.id)) {
                            statusLabel = 'Departing Today';
                            statusColor = 'bg-amber-100 text-amber-800';
                          } else if (stayovers.some(s => s.id === guest.id)) {
                            statusLabel = 'Staying Over';
                            statusColor = 'bg-blue-100 text-blue-800';
                          } else {
                            statusLabel = guest.status || 'Checked In';
                            statusColor = 'bg-green-100 text-green-800';
                          }
                          
                          return (
                            <tr 
                              key={guest.id} 
                              className="hover:bg-stone-50/50 transition-colors cursor-pointer"
                              onClick={() => setActiveTab('overview')}
                            >
                              <td className="px-6 py-4 font-bold text-stone-900">
                                <span className="text-amber-500 mr-2">⚠️</span>
                                {guest.guest_name}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold ${statusColor}`}>
                                  {statusLabel}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-stone-600">
                                {getGuestLocation(guest) || 'N/A'}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-wrap gap-1">
                                  {restrictionItems.slice(0, 3).map((item, idx) => (
                                    <span key={idx} className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[8px] font-bold whitespace-nowrap">
                                      {item}
                                    </span>
                                  ))}
                                  {restrictionItems.length > 3 && (
                                    <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded-full text-[8px] font-bold">
                                      +{restrictionItems.length - 3}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* QR Code Modal */}
      {showQRModal && businessId && (
        <QRCodeModal
          businessId={businessId}
          businessName={businessName}
          onClose={() => setShowQRModal(false)}
        />
      )}
    </div>
  );
}
