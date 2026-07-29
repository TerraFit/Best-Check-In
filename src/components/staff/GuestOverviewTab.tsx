import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UserPlus, QrCode, Phone, 
  Calendar, ChevronRight,
  Bed, UserCheck, UserX, Printer,
} from 'lucide-react';
import GuestDetailsModal from '../dashboard/GuestDetailsModal';
import { getRoomDisplayName } from '../../services/roomDisplayService';

interface GuestOverviewTabProps {
  bookings: any[];
  todayArrivals: any[];
  todayStayovers: any[];
  todayCheckouts: any[];
  businessId: string;
  onShowQRModal: () => void;
  onShowImportModal?: () => void;
}

function formatGuestRoom(guest: {
  room_number?: number | string | null;
  room_name?: string | null;
}): string | null {
  if (guest.room_number === null || guest.room_number === undefined || guest.room_number === '') {
    return null;
  }
  const n =
    typeof guest.room_number === 'string'
      ? parseInt(guest.room_number, 10)
      : guest.room_number;
  if (Number.isNaN(n)) return null;
  return getRoomDisplayName({
    room_number: n,
    room_name: guest.room_name,
  });
}

export function GuestOverviewTab({
  todayArrivals,
  todayStayovers,
  todayCheckouts,
  businessId,
  onShowQRModal,
}: GuestOverviewTabProps) {
  const navigate = useNavigate();
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    console.log('GuestOverviewTab: Modal state:', { isModalOpen, selectedBookingId, businessId });
  }, [isModalOpen, selectedBookingId, businessId]);

  const handleGuestClick = (bookingId: string) => {
    if (!bookingId) return;
    setSelectedBookingId(bookingId);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedBookingId(null), 300);
  };

  const handleNewCheckin = () => {
    navigate(`/checkin/${businessId}`);
  };

  const formatPhone = (phone: string) => {
    if (!phone) return 'N/A';
    return phone;
  };

  const hasDietaryRestrictions = (guest: any): boolean => {
    const restrictions = guest.food_restrictions || {};
    return Object.entries(restrictions).some(([key, val]) => val === true && key !== 'other_text');
  };

  const renderGuestRow = (guest: any, hoverClass: string) => {
    const roomLabel = formatGuestRoom(guest);
    return (
      <div 
        key={guest.id}
        onClick={() => handleGuestClick(guest.id)}
        className={`flex items-center justify-between p-2 rounded-lg ${hoverClass} cursor-pointer transition-colors`}
      >
        <div className="min-w-0">
          <p className="font-medium text-stone-900">{guest.guest_name}</p>
          {guest.guest_country && (
            <p className="text-xs text-stone-500 truncate">{guest.guest_country}</p>
          )}
          {roomLabel && (
            <p className="text-xs text-stone-600 mt-0.5 truncate">🏨 {roomLabel}</p>
          )}
          <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
            <Phone size={12} /> {formatPhone(guest.guest_phone)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasDietaryRestrictions(guest) && (
            <span className="text-amber-500" title="Has dietary restrictions">⚠️</span>
          )}
          <ChevronRight size={16} className="text-stone-400" />
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  {todayArrivals.map(guest => renderGuestRow(guest, 'hover:bg-green-50'))}
                </div>
              )}
            </div>
          </div>

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
                      <div className="min-w-0">
                        <p className="font-medium text-stone-900">{guest.guest_name}</p>
                        {formatGuestRoom(guest) && (
                          <p className="text-xs text-stone-600 mt-0.5 truncate">
                            🏨 {formatGuestRoom(guest)}
                          </p>
                        )}
                        <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                          <Calendar size={12} /> Check-out: {guest.check_out_date || 'N/A'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {hasDietaryRestrictions(guest) && (
                          <span className="text-amber-500" title="Has dietary restrictions">⚠️</span>
                        )}
                        <ChevronRight size={16} className="text-stone-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

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
                  {todayCheckouts.map(guest => renderGuestRow(guest, 'hover:bg-amber-50'))}
                </div>
              )}
            </div>
          </div>
        </div>

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
