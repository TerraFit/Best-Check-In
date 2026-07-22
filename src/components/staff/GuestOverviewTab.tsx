// src/components/staff/GuestOverviewTab.tsx
// ✅ FIXED: Guest Details Modal with Food Restrictions

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, UserPlus, QrCode, Phone, 
  Calendar, ChevronRight, Utensils,
  Bed, UserCheck, UserX, Printer
} from 'lucide-react';

// ✅ Import the Guest Details Modal
import GuestDetailsModal from '../dashboard/GuestDetailsModal';

interface GuestOverviewTabProps {
  bookings: any[];
  todayArrivals: any[];
  todayStayovers: any[];
  todayCheckouts: any[];
  businessId: string;
  onShowQRModal: () => void;
  onShowImportModal?: () => void;
}

export function GuestOverviewTab({
  bookings,
  todayArrivals,
  todayStayovers,
  todayCheckouts,
  businessId,
  onShowQRModal,
  onShowImportModal,
}: GuestOverviewTabProps) {
  const navigate = useNavigate();
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ✅ Debug: Log when modal state changes
  useEffect(() => {
    console.log('🔍 GuestOverviewTab: Modal state:', { 
      isModalOpen, 
      selectedBookingId,
      businessId 
    });
  }, [isModalOpen, selectedBookingId, businessId]);

  // Get all checked-in guests (for the list)
  const checkedInGuests = useMemo(() => {
    const checked = bookings.filter(b => 
      b.status === 'checked_in' || b.status === 'Checked-In' || b.status === 'active'
    );
    console.log('🔍 Checked-in guests:', checked.length);
    return checked;
  }, [bookings]);

  // ✅ Handle guest click - opens the modal
  const handleGuestClick = (bookingId: string) => {
    console.log('🖱️ Guest clicked, bookingId:', bookingId);
    console.log('🖱️ Business ID:', businessId);
    
    if (!bookingId) {
      console.error('❌ No booking ID provided');
      return;
    }
    
    setSelectedBookingId(bookingId);
    setIsModalOpen(true);
  };

  // ✅ Handle modal close
  const handleModalClose = () => {
    console.log('❌ Closing modal');
    setIsModalOpen(false);
    // Clear the selected booking ID after a delay to prevent re-opening
    setTimeout(() => {
      setSelectedBookingId(null);
    }, 300);
  };

  const handleNewCheckin = () => {
    navigate(`/checkin/${businessId}`);
  };

  // Helper to format phone number
  const formatPhone = (phone: string) => {
    if (!phone) return 'N/A';
    return phone;
  };

  // ✅ Check if guest has dietary restrictions
  const hasDietaryRestrictions = (guest: any): boolean => {
    const restrictions = guest.food_restrictions || {};
    return Object.entries(restrictions).some(([key, val]) => val === true && key !== 'other_text');
  };

  // ✅ Get dietary restrictions display text
  const getDietaryDisplay = (guest: any): string => {
    const restrictions = guest.food_restrictions || {};
    const active = Object.entries(restrictions)
      .filter(([key, val]) => val === true && key !== 'other_text')
      .map(([key]) => key.replace('_', ' '));
    
    if (active.length === 0) return '';
    if (active.length === 1) return active[0];
    return `${active[0]} +${active.length - 1}`;
  };

  return (
    <div className="space-y-6">
      {/* ============================================================
          TODAY'S ACTIVITY CARDS
          ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Arrivals Card */}
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="bg-green-50 px-4 py-3 border-b border-green-100 flex items-center gap-2">
            <UserCheck size={18} className="text-green-600" />
            <h3 className="font-bold text-sm text-green-800">Arrivals Today</h3>
            <span className="ml-auto bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded-full">
              {todayArrivals.length}
            </span>
          </div>
          <div className="p-4">
            {todayArrivals.length === 0 ? (
              <p className="text-stone-400 text-sm text-center py-4">No arrivals today</p>
            ) : (
              <div className="space-y-2">
                {todayArrivals.map(guest => (
                  <div 
                    key={guest.id}
                    onClick={() => handleGuestClick(guest.id)}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-green-50 cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="font-medium text-stone-900">{guest.guest_name}</p>
                      <p className="text-xs text-stone-500 flex items-center gap-1">
                        <Phone size={12} /> {formatPhone(guest.guest_phone)}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-stone-400" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stayovers Card */}
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="bg-blue-50 px-4 py-3 border-b border-blue-100 flex items-center gap-2">
            <Bed size={18} className="text-blue-600" />
            <h3 className="font-bold text-sm text-blue-800">Stayovers</h3>
            <span className="ml-auto bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">
              {todayStayovers.length}
            </span>
          </div>
          <div className="p-4">
            {todayStayovers.length === 0 ? (
              <p className="text-stone-400 text-sm text-center py-4">No current stayovers</p>
            ) : (
              <div className="space-y-2">
                {todayStayovers.map(guest => (
                  <div 
                    key={guest.id}
                    onClick={() => handleGuestClick(guest.id)}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="font-medium text-stone-900">{guest.guest_name}</p>
                      <p className="text-xs text-stone-500 flex items-center gap-1">
                        <Calendar size={12} /> Check-out: {guest.check_out_date || 'N/A'}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-stone-400" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Check-outs Card */}
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="bg-amber-50 px-4 py-3 border-b border-amber-100 flex items-center gap-2">
            <UserX size={18} className="text-amber-600" />
            <h3 className="font-bold text-sm text-amber-800">Check-outs Today</h3>
            <span className="ml-auto bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full">
              {todayCheckouts.length}
            </span>
          </div>
          <div className="p-4">
            {todayCheckouts.length === 0 ? (
              <p className="text-stone-400 text-sm text-center py-4">No check-outs today</p>
            ) : (
              <div className="space-y-2">
                {todayCheckouts.map(guest => (
                  <div 
                    key={guest.id}
                    onClick={() => handleGuestClick(guest.id)}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-amber-50 cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="font-medium text-stone-900">{guest.guest_name}</p>
                      <p className="text-xs text-stone-500 flex items-center gap-1">
                        <Phone size={12} /> {formatPhone(guest.guest_phone)}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-stone-400" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================
          QUICK ACTIONS
          ============================================================ */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
        <h3 className="text-sm font-bold text-stone-700 mb-4 flex items-center gap-2">
          <span className="text-lg">⚡</span> Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={handleNewCheckin}
            className="flex items-center gap-3 p-4 border border-stone-200 rounded-2xl hover:bg-orange-50 hover:border-orange-200 transition-all text-left"
          >
            <div className="p-2 bg-orange-500 rounded-xl text-white">
              <UserPlus size={18} />
            </div>
            <div>
              <p className="font-medium text-sm text-stone-900">New Check-in</p>
              <p className="text-xs text-stone-500">Quick check-in</p>
            </div>
          </button>
          
          <button
            onClick={onShowQRModal}
            className="flex items-center gap-3 p-4 border border-stone-200 rounded-2xl hover:bg-blue-50 hover:border-blue-200 transition-all text-left"
          >
            <div className="p-2 bg-blue-500 rounded-xl text-white">
              <QrCode size={18} />
            </div>
            <div>
              <p className="font-medium text-sm text-stone-900">QR Code</p>
              <p className="text-xs text-stone-500">Display QR code</p>
            </div>
          </button>
          
          <button
            onClick={() => window.print()}
            className="flex items-center gap-3 p-4 border border-stone-200 rounded-2xl hover:bg-stone-50 hover:border-stone-300 transition-all text-left"
          >
            <div className="p-2 bg-stone-500 rounded-xl text-white">
              <Printer size={18} />
            </div>
            <div>
              <p className="font-medium text-sm text-stone-900">Print</p>
              <p className="text-xs text-stone-500">Guest list</p>
            </div>
          </button>
        </div>
      </div>

      {/* ============================================================
          ALL GUESTS LIST
          ============================================================ */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-stone-500" />
            <h3 className="font-bold text-sm text-stone-700">All Guests</h3>
            <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
              {checkedInGuests.length} checked in
            </span>
          </div>
          <span className="text-xs text-stone-400">Click to view details</span>
        </div>

        <div className="divide-y divide-stone-100">
          {checkedInGuests.length === 0 ? (
            <div className="p-8 text-center text-stone-400">
              <Users size={32} className="mx-auto mb-2 text-stone-300" />
              <p className="text-sm">No guests currently checked in</p>
            </div>
          ) : (
            checkedInGuests.map(guest => {
              const hasRestrictions = hasDietaryRestrictions(guest);
              const dietaryDisplay = getDietaryDisplay(guest);
              
              return (
                <div
                  key={guest.id}
                  onClick={() => handleGuestClick(guest.id)}
                  className="px-6 py-4 hover:bg-stone-50/60 cursor-pointer transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm">
                      {guest.guest_name?.charAt(0) || 'G'}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-stone-900">{guest.guest_name}</p>
                      <div className="flex items-center gap-3 text-xs text-stone-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} /> {guest.check_in_date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Bed size={12} /> {guest.nights || 1} nights
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {hasRestrictions && (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1" title={dietaryDisplay}>
                        <Utensils size={12} /> Dietary
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      guest.status === 'checked_in' || guest.status === 'Checked-In' || guest.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-stone-100 text-stone-500'
                    }`}>
                      {guest.status === 'checked_in' || guest.status === 'Checked-In' || guest.status === 'active' 
                        ? 'Checked In' 
                        : guest.status}
                    </span>
                    <ChevronRight size={16} className="text-stone-400" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ============================================================
          GUEST DETAILS MODAL - ✅ RENDERED CORRECTLY
          ============================================================ */}
      {isModalOpen && selectedBookingId && (
        <GuestDetailsModal
          isOpen={isModalOpen}
          bookingId={selectedBookingId}
          onClose={handleModalClose}
          businessId={businessId}
        />
      )}
    </div>
  );
}

export default GuestOverviewTab;
