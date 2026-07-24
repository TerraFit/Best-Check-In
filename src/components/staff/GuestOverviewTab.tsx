import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, UserPlus, QrCode, Phone, 
  Calendar, ChevronRight, Utensils,
  Bed, UserCheck, UserX, Printer,
  AlertCircle
} from 'lucide-react';
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
    
    const otherText = restrictions.other_text ? ` (${restrictions.other_text})` : '';
    
    if (active.length === 0 && otherText) {
      return `Other${otherText}`;
    }
    if (active.length === 0) return '';
    if (active.length === 1) {
      return `${active[0]}${otherText}`;
    }
    return `${active[0]} +${active.length - 1}${otherText}`;
  };

  return (
    <>
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
                      {hasDietaryRestrictions(guest) && (
                        <span className="text-amber-500" title="Has dietary restrictions">
                          ⚠️
                        </span>
                      )}
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
                      {hasDietaryRestrictions(guest) && (
                        <span className="text-amber-500" title="Has dietary restrictions">
                          ⚠️
                        </span>
                      )}
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
                      {hasDietaryRestrictions(guest) && (
                        <span className="text-amber-500" title="Has dietary restrictions">
                          ⚠️
                        </span>
                      )}
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
            GUEST DETAILS MODAL
            ============================================================ */}
        <GuestDetailsModal
          isOpen={isModalOpen}
          bookingId={selectedBookingId}
          onClose={handleModalClose}
          businessId={businessId}
        />
      </div>
    </>
  );
}

export default GuestOverviewTab;
