// src/pages/EmployeeDashboard.tsx
// ✅ Simplified Employee Dashboard - 3 stat cards only

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, Users, Utensils, Calendar, Clock, 
  User, Phone, Mail, Globe, MapPin, 
  ChevronRight, AlertCircle, CheckCircle, 
  Bed, ArrowRight, UserCheck, UserX
} from 'lucide-react';
import Logo from '../components/Logo';

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

  // ============================================================
  // ✅ GET EMPLOYEE DATA FROM SESSION
  // ============================================================
  useEffect(() => {
    try {
      const authStr = localStorage.getItem('fastcheckin_employee_auth');
      if (authStr) {
        const auth = JSON.parse(authStr);
        setEmployee(auth.user);
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

        const businessId = auth?.user?.businessId;
        if (!businessId) {
          console.error('No business ID found');
          setLoading(false);
          return;
        }

        const response = await fetch(
          `/.netlify/functions/get-business-bookings?businessId=${businessId}&limit=1000&page=1`,
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
            `/.netlify/functions/get-business-branding?id=${businessId}`,
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
  // ✅ FILTER BOOKINGS
  // ============================================================
  const today = new Date().toISOString().split('T')[0];

  const todaysArrivals = useMemo(() => {
    return bookings.filter(b => b.check_in_date === today && b.status !== 'checked_in');
  }, [bookings, today]);

  const activeBookings = useMemo(() => {
    return bookings.filter(b => b.status === 'checked_in');
  }, [bookings]);

  const todaysCheckouts = useMemo(() => {
    return bookings.filter(b => b.check_out_date === today);
  }, [bookings, today]);

  // ============================================================
  // ✅ CHECK IF GUEST HAS DIETARY RESTRICTIONS
  // ============================================================
  const hasDietaryRestrictions = (guest: Booking): boolean => {
    const restrictions = guest.food_restrictions || {};
    return Object.entries(restrictions).some(([key, val]) => val === true && key !== 'other_text');
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
            TAB: OVERVIEW
            ============================================================ */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Stats Cards - Only 3 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Today's Arrivals */}
              <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-xl">
                    <UserCheck size={18} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Arrivals Today</p>
                    <p className="text-2xl font-bold text-stone-900">{todaysArrivals.length}</p>
                  </div>
                </div>
              </div>

              {/* Current Stayovers */}
              <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-xl">
                    <Bed size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Stayovers</p>
                    <p className="text-2xl font-bold text-stone-900">{activeBookings.length}</p>
                  </div>
                </div>
              </div>

              {/* Check-outs Today */}
              <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-xl">
                    <UserX size={18} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Check-outs Today</p>
                    <p className="text-2xl font-bold text-stone-900">{todaysCheckouts.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Guest Cards - Arrivals, Stayovers, Check-outs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Arrivals Card */}
              <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-stone-100 bg-green-50/50 flex items-center gap-2">
                  <UserCheck size={16} className="text-green-600" />
                  <h3 className="font-bold text-xs uppercase tracking-widest text-green-700">Arrivals</h3>
                  <span className="ml-auto bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {todaysArrivals.length}
                  </span>
                </div>
                <div className="p-4 max-h-56 overflow-y-auto">
                  {todaysArrivals.length === 0 ? (
                    <p className="text-sm text-stone-400 text-center py-6">No arrivals today</p>
                  ) : (
                    todaysArrivals.map(guest => (
                      <div key={guest.id} className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-stone-900">{guest.guest_name}</p>
                          <p className="text-[10px] text-stone-400">{guest.guest_city || 'N/A'}</p>
                        </div>
                        <span className="text-[10px] text-green-600 font-medium">Arriving</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Stayovers Card */}
              <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-stone-100 bg-blue-50/50 flex items-center gap-2">
                  <Bed size={16} className="text-blue-600" />
                  <h3 className="font-bold text-xs uppercase tracking-widest text-blue-700">Stayovers</h3>
                  <span className="ml-auto bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {activeBookings.length}
                  </span>
                </div>
                <div className="p-4 max-h-56 overflow-y-auto">
                  {activeBookings.length === 0 ? (
                    <p className="text-sm text-stone-400 text-center py-6">No current stayovers</p>
                  ) : (
                    activeBookings.map(guest => (
                      <div key={guest.id} className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-stone-900">{guest.guest_name}</p>
                          {/* ✅ Dietary Alert Badge - Next to name */}
                          {hasDietaryRestrictions(guest) && (
                            <span className="text-[10px] text-amber-600 font-bold" title="Has dietary restrictions">
                              ⚠️
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-blue-600 font-medium">Staying</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Check-outs Card */}
              <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-stone-100 bg-amber-50/50 flex items-center gap-2">
                  <UserX size={16} className="text-amber-600" />
                  <h3 className="font-bold text-xs uppercase tracking-widest text-amber-700">Check-outs</h3>
                  <span className="ml-auto bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {todaysCheckouts.length}
                  </span>
                </div>
                <div className="p-4 max-h-56 overflow-y-auto">
                  {todaysCheckouts.length === 0 ? (
                    <p className="text-sm text-stone-400 text-center py-6">No check-outs today</p>
                  ) : (
                    todaysCheckouts.map(guest => (
                      <div key={guest.id} className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-stone-900">{guest.guest_name}</p>
                          <p className="text-[10px] text-stone-400">{guest.guest_city || 'N/A'}</p>
                        </div>
                        <span className="text-[10px] text-amber-600 font-medium">Departing</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            TAB: DIETARIES
            ============================================================ */}
        {activeTab === 'dietaries' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-stone-100 bg-amber-50/50 flex items-center justify-between">
                <h3 className="font-bold text-xs uppercase tracking-widest text-amber-700 flex items-center gap-2">
                  <Utensils size={14} /> Guest Dietary Requirements & Restrictions
                </h3>
                <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {bookings.filter(b => hasDietaryRestrictions(b)).length} guests
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50/80 border-b border-stone-100 text-stone-400 font-bold uppercase tracking-widest text-[9px]">
                    <tr>
                      <th className="px-6 py-4">Guest Name</th>
                      <th className="px-6 py-4">Room</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Dietary Restrictions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-medium">
                    {bookings.filter(b => hasDietaryRestrictions(b)).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-stone-400">
                          No guests with dietary restrictions
                        </td>
                      </tr>
                    ) : (
                      bookings.filter(b => hasDietaryRestrictions(b)).map(guest => {
                        const restrictions = guest.food_restrictions || {};
                        const activeRestrictions = Object.entries(restrictions)
                          .filter(([key, val]) => val === true && key !== 'other_text')
                          .map(([key]) => key.replace('_', ' ').toUpperCase());
                        
                        return (
                          <tr key={guest.id} className="hover:bg-stone-50/50 transition-colors">
                            <td className="px-6 py-4 font-bold text-stone-900">{guest.guest_name}</td>
                            <td className="px-6 py-4 text-stone-600">{guest.guest_city || 'N/A'}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold ${
                                guest.status === 'checked_in' ? 'bg-green-100 text-green-800' :
                                guest.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {guest.status || 'Pending'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1">
                                {activeRestrictions.slice(0, 3).map(r => (
                                  <span key={r} className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[8px] font-bold">
                                    {r}
                                  </span>
                                ))}
                                {activeRestrictions.length > 3 && (
                                  <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded-full text-[8px] font-bold">
                                    +{activeRestrictions.length - 3}
                                  </span>
                                )}
                                {restrictions.other_text && (
                                  <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-[8px] font-bold" title={restrictions.other_text}>
                                    Other
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
    </div>
  );
}
