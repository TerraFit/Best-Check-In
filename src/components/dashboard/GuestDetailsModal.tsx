// src/components/dashboard/GuestDetailsModal.tsx
// Food restrictions + Editable stay details + Room allocation + Audit logging

import { useState, useEffect, useCallback } from 'react';
import { 
  X, Phone, Mail, Globe, User, Calendar, Users, 
  MapPin, Utensils, ArrowRight, Bed, Clock, Hash,
  Save, Edit2, Check, AlertCircle
} from 'lucide-react';
import { useGuestDetails } from '../../hooks/useGuestDetails';
import { FoodRestrictions } from '../../types/guest';
import GuestDetailsRoomSection from './GuestDetailsRoomSection';

interface GuestDetailsModalProps {
  isOpen: boolean;
  bookingId: string | null;
  onClose: () => void;
  businessId?: string;
}

const DEFAULT_RESTRICTIONS: FoodRestrictions = {
  vegetarian: false,
  vegan: false,
  pescatarian: false,
  halal: false,
  kosher: false,
  gluten_free: false,
  lactose_free: false,
  nut_allergy: false,
  seafood_allergy: false,
  diabetic: false,
  no_pork: false,
  carnivore: false,
  other: false,
  other_text: ''
};

const DIETARY_OPTIONS = [
  { key: 'vegetarian', label: 'Vegetarian', icon: '🥬' },
  { key: 'vegan', label: 'Vegan', icon: '🌱' },
  { key: 'pescatarian', label: 'Pescatarian', icon: '🐟' },
  { key: 'halal', label: 'Halal', icon: '☪️' },
  { key: 'kosher', label: 'Kosher', icon: '✡️' },
  { key: 'gluten_free', label: 'Gluten-Free', icon: '🌾' },
  { key: 'lactose_free', label: 'Lactose-Free', icon: '🥛' },
  { key: 'nut_allergy', label: 'Nut Allergy', icon: '🥜' },
  { key: 'seafood_allergy', label: 'Seafood Allergy', icon: '🦐' },
  { key: 'diabetic', label: 'Diabetic', icon: '💉' },
  { key: 'no_pork', label: 'No Pork', icon: '🐷' },
  { key: 'carnivore', label: 'Carnivore', icon: '🥩' },
  { key: 'other', label: 'Other', icon: '📝' }
];

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

const getBusinessIdFromStorage = (): string | null => {
  try {
    const authStr = localStorage.getItem('fastcheckin_auth');
    if (authStr) {
      const auth = JSON.parse(authStr);
      return auth.user?.businessId || null;
    }
  } catch (e) {
    console.warn('Could not get business_id from auth:', e);
  }
  try {
    const businessStr = localStorage.getItem('business');
    if (businessStr) {
      const business = JSON.parse(businessStr);
      return business.id || null;
    }
  } catch (e) {
    console.warn('Could not get business_id from business storage:', e);
  }
  return null;
};

const createAuditLog = async (logData: {
  bookingId: string;
  action: string;
  details: any;
  description: string;
  businessId?: string;
  guestName?: string;
}) => {
  try {
    const authStr = localStorage.getItem('fastcheckin_auth');
    const auth = authStr ? JSON.parse(authStr) : null;
    const user = auth?.user || { id: '00000000-0000-0000-0000-000000000000', name: 'Unknown User' };
    const businessId = logData.businessId || getBusinessIdFromStorage() || '7417fcbb-7771-4d44-8c7f-ccef573fa24b';
    const auditLog = {
      business_id: businessId,
      user_id: user.id || '00000000-0000-0000-0000-000000000000',
      user_name: user.name || user.full_name || 'Unknown User',
      user_role: user.role || 'owner',
      action: logData.action,
      details: logData.details,
      description: logData.description,
      booking_id: logData.bookingId,
      guest_name: logData.guestName || null,
      ip_address: 'unknown',
      user_agent: navigator.userAgent || 'unknown'
    };
    const response = await fetch('/.netlify/functions/create-audit-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(auditLog)
    });
    if (response.ok) return { success: true };
    return { success: false, error: await response.text() };
  } catch (err) {
    return { success: false, error: err };
  }
};

export default function GuestDetailsModal({
  isOpen,
  bookingId,
  onClose,
  businessId: businessIdProp
}: GuestDetailsModalProps) {
  const { 
    guestDetails, 
    loading, 
    fetchGuestDetails, 
    updateFoodRestrictions,
    updateStayDetails
  } = useGuestDetails();
  
  const [restrictions, setRestrictions] = useState<FoodRestrictions>(DEFAULT_RESTRICTIONS);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditingStay, setIsEditingStay] = useState(false);
  const [stayEditData, setStayEditData] = useState({
    check_in_date: '',
    check_out_date: '',
    nights: 1
  });
  const [savingStay, setSavingStay] = useState(false);
  const [localRoomId, setLocalRoomId] = useState<string | null>(null);
  const [localRoomNumber, setLocalRoomNumber] = useState<number | null>(null);
  const [localRoomName, setLocalRoomName] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && bookingId) fetchGuestDetails(bookingId);
  }, [isOpen, bookingId, fetchGuestDetails]);

  useEffect(() => {
    if (guestDetails?.food_restrictions) {
      setRestrictions(guestDetails.food_restrictions);
      setHasUnsavedChanges(false);
    }
    if (guestDetails) {
      setStayEditData({
        check_in_date: guestDetails.check_in_date || '',
        check_out_date: guestDetails.check_out_date || '',
        nights: guestDetails.nights || 1
      });
      setLocalRoomId(guestDetails.room_id || null);
      setLocalRoomNumber(guestDetails.room_number ?? null);
      setLocalRoomName(guestDetails.room_name || null);
    }
  }, [guestDetails]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) handleClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (hasUnsavedChanges || isEditingStay) setShowUnsavedWarning(true);
    else onClose();
  }, [hasUnsavedChanges, isEditingStay, onClose]);

  const handleDiscard = useCallback(() => {
    setShowUnsavedWarning(false);
    setHasUnsavedChanges(false);
    setIsEditingStay(false);
    if (guestDetails?.food_restrictions) setRestrictions(guestDetails.food_restrictions);
    else setRestrictions(DEFAULT_RESTRICTIONS);
    if (guestDetails) {
      setStayEditData({
        check_in_date: guestDetails.check_in_date || '',
        check_out_date: guestDetails.check_out_date || '',
        nights: guestDetails.nights || 1
      });
    }
    onClose();
  }, [guestDetails, onClose]);

  const handleContinue = useCallback(() => setShowUnsavedWarning(false), []);

  const handleRestrictionChange = useCallback((key: keyof FoodRestrictions, value: boolean) => {
    setRestrictions(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'other' && value === false) next.other_text = '';
      return next;
    });
    setHasUnsavedChanges(true);
    setSaveSuccess(false);
    setError(null);
  }, []);

  const handleOtherTextChange = useCallback((text: string) => {
    setRestrictions(prev => ({ ...prev, other_text: text }));
    setHasUnsavedChanges(true);
    setSaveSuccess(false);
    setError(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!bookingId) return;
    setSaving(true);
    setSaveSuccess(false);
    setError(null);
    try {
      const businessId = businessIdProp || getBusinessIdFromStorage() || '';
      await updateFoodRestrictions(bookingId, restrictions);
      await createAuditLog({
        bookingId,
        action: 'UPDATE_FOOD_RESTRICTIONS',
        details: restrictions,
        description: `Updated food restrictions for guest ${guestDetails?.guest_name || 'Unknown'}`,
        businessId,
        guestName: guestDetails?.guest_name
      });
      setHasUnsavedChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      setError('Failed to save food restrictions. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [bookingId, restrictions, updateFoodRestrictions, guestDetails, businessIdProp]);

  const handleSaveStay = async () => {
    if (!bookingId) return;
    setSavingStay(true);
    setError(null);
    try {
      const businessId = businessIdProp || getBusinessIdFromStorage() || '';
      const result = await updateStayDetails(bookingId, stayEditData);
      if (result.success) {
        await createAuditLog({
          bookingId,
          action: 'UPDATE_STAY_DETAILS',
          details: stayEditData,
          description: `Updated stay details for guest ${guestDetails?.guest_name || 'Unknown'}`,
          businessId,
          guestName: guestDetails?.guest_name
        });
        setIsEditingStay(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (err) {
      setError('Failed to save stay details. Please try again.');
    } finally {
      setSavingStay(false);
    }
  };

  const getActiveRestrictionsWithIcons = (): string[] => {
    const active: string[] = [];
    DIETARY_OPTIONS.forEach(({ key, icon }) => {
      if (key === 'other') {
        if (restrictions.other && restrictions.other_text) active.push(`📝 OTHER (${restrictions.other_text})`);
        else if (restrictions.other) active.push('📝 OTHER');
      } else if (restrictions[key as keyof FoodRestrictions] === true) {
        active.push(`${icon} ${key.replace('_', ' ').toUpperCase()}`);
      }
    });
    return active;
  };

  const resolvedBusinessId =
    businessIdProp || guestDetails?.business_id || getBusinessIdFromStorage() || '';

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      >
        <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-fade-in">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-white flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-xl">
                <User size={18} className="text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {loading ? 'Loading...' : guestDetails?.guest_name || 'Guest Details'}
                </h2>
                {guestDetails?.booking_reference && (
                  <p className="text-xs text-gray-400 font-mono">Ref: {guestDetails.booking_reference}</p>
                )}
              </div>
            </div>
            <button onClick={handleClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600" aria-label="Close">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {loading && (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto mb-4" />
                  <p className="text-sm text-gray-400">Loading guest details...</p>
                </div>
              </div>
            )}

            {!loading && !guestDetails && (
              <div className="text-center py-16">
                <User size={48} className="mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">Guest Not Found</h3>
                <p className="text-sm text-gray-400">No details available for this booking</p>
              </div>
            )}

            {!loading && guestDetails && (
              <div className="space-y-8">
                <section>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="h-px flex-1 bg-gray-200"></span>
                    <span>Guest Information</span>
                    <span className="h-px flex-1 bg-gray-200"></span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <User size={16} className="text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-400">Full Name</p>
                        <p className="text-sm font-medium text-gray-900 truncate">{guestDetails.guest_name || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <Phone size={16} className="text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-400">Phone</p>
                        {guestDetails.guest_phone ? (
                          <a href={`tel:${guestDetails.guest_phone}`} className="text-sm font-medium text-blue-600 hover:underline truncate block">{guestDetails.guest_phone}</a>
                        ) : (
                          <p className="text-sm text-gray-400">N/A</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <Mail size={16} className="text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-400">Email</p>
                        {guestDetails.guest_email ? (
                          <a href={`mailto:${guestDetails.guest_email}`} className="text-sm font-medium text-blue-600 hover:underline truncate block">{guestDetails.guest_email}</a>
                        ) : (
                          <p className="text-sm text-gray-400">N/A</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <Globe size={16} className="text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-400">Country of Origin</p>
                        <p className="text-sm font-medium text-gray-900 truncate">{guestDetails.guest_country || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="h-px flex-1 bg-gray-200"></span>
                    <span>Travel Details</span>
                    <span className="h-px flex-1 bg-gray-200"></span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <MapPin size={16} className="text-blue-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-blue-500 font-medium">Arriving From</p>
                        <p className="text-sm font-semibold text-blue-700 truncate">{guestDetails.arriving_from || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                      <ArrowRight size={16} className="text-green-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-green-500 font-medium">Next Destination</p>
                        <p className="text-sm font-semibold text-green-700 truncate">{guestDetails.next_destination || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <span className="h-px flex-1 bg-gray-200"></span>
                      <span className="flex items-center gap-2"><Calendar size={14} className="text-blue-500" /> Stay Details</span>
                      <span className="h-px flex-1 bg-gray-200"></span>
                    </h3>
                    {!isEditingStay ? (
                      <button onClick={() => setIsEditingStay(true)} className="text-xs text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1">
                        <Edit2 size={12} /> Edit
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button onClick={() => setIsEditingStay(false)} className="text-xs text-gray-500 font-medium">Cancel</button>
                        <button onClick={handleSaveStay} disabled={savingStay} className="text-xs bg-green-500 text-white px-3 py-1 rounded-lg font-medium disabled:opacity-50 flex items-center gap-1">
                          {savingStay ? 'Saving...' : (<><Check size={12} /> Save</>)}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <Calendar size={16} className="text-gray-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-400">Check-in</p>
                        {isEditingStay ? (
                          <input type="date" value={stayEditData.check_in_date} onChange={(e) => setStayEditData(prev => ({ ...prev, check_in_date: e.target.value }))} className="w-full text-sm font-medium bg-transparent border-b outline-none" />
                        ) : (
                          <p className="text-sm font-medium text-gray-900">{formatDate(guestDetails?.check_in_date)}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <Calendar size={16} className="text-gray-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-400">Check-out</p>
                        {isEditingStay ? (
                          <input type="date" value={stayEditData.check_out_date} onChange={(e) => setStayEditData(prev => ({ ...prev, check_out_date: e.target.value }))} className="w-full text-sm font-medium bg-transparent border-b outline-none" />
                        ) : (
                          <p className="text-sm font-medium text-gray-900">{formatDate(guestDetails?.check_out_date)}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <Users size={16} className="text-gray-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-400">Nights</p>
                        {isEditingStay ? (
                          <input type="number" min={1} max={365} value={stayEditData.nights} onChange={(e) => setStayEditData(prev => ({ ...prev, nights: parseInt(e.target.value) || 1 }))} className="w-full text-sm font-medium bg-transparent border-b outline-none" />
                        ) : (
                          <p className="text-sm font-medium text-gray-900">{guestDetails?.nights || 1} <span className="text-xs text-gray-400">nights</span></p>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                {/* SECTION: ROOM ALLOCATION (Phase 1) */}
                {bookingId && resolvedBusinessId && (
                  <GuestDetailsRoomSection
                    businessId={resolvedBusinessId}
                    bookingId={bookingId}
                    checkInDate={stayEditData.check_in_date || guestDetails.check_in_date}
                    checkOutDate={stayEditData.check_out_date || guestDetails.check_out_date}
                    roomId={localRoomId}
                    roomNumber={localRoomNumber}
                    roomName={localRoomName}
                    onAssigned={(room) => {
                      setLocalRoomId(room?.id || null);
                      setLocalRoomNumber(room?.room_number ?? null);
                      setLocalRoomName(room?.room_name || null);
                    }}
                  />
                )}

                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <span className="h-px flex-1 bg-gray-200"></span>
                      <span className="flex items-center gap-2"><Utensils size={14} className="text-orange-500" /> Food Restrictions</span>
                      <span className="h-px flex-1 bg-gray-200"></span>
                    </h3>
                    <div className="flex items-center gap-2">
                      {saveSuccess && <span className="text-xs text-green-600 font-medium flex items-center gap-1"><Check size={14} /> Saved</span>}
                      {error && <span className="text-xs text-red-600 font-medium flex items-center gap-1"><AlertCircle size={14} /> Error</span>}
                      <button
                        onClick={handleSave}
                        disabled={!hasUnsavedChanges || saving}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
                          hasUnsavedChanges && !saving
                            ? 'bg-orange-500 text-white hover:bg-orange-600'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {saving ? 'Saving...' : (<><Save size={13} /> Save</>)}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {DIETARY_OPTIONS.map(({ key, label, icon }) => {
                      const isChecked = restrictions[key as keyof FoodRestrictions] as boolean;
                      return (
                        <label key={key} className={`flex items-center gap-2 text-sm cursor-pointer rounded-lg px-3 py-2 border ${
                          isChecked ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-gray-50 border-gray-200 text-gray-700'
                        }`}>
                          <input type="checkbox" checked={isChecked} onChange={(e) => handleRestrictionChange(key as keyof FoodRestrictions, e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-orange-500" />
                          <span className="truncate">{icon} {label}</span>
                        </label>
                      );
                    })}
                  </div>
                  {restrictions.other && (
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Specify dietary requirement:</label>
                      <input type="text" value={restrictions.other_text || ''} onChange={(e) => handleOtherTextChange(e.target.value)} placeholder="Please specify..." className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                    </div>
                  )}
                  {getActiveRestrictionsWithIcons().length > 0 && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs font-medium text-amber-800 mb-2">Current Restrictions:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {getActiveRestrictionsWithIcons().map((item, index) => (
                          <span key={index} className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-[10px] font-medium">{item}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                <section className="pt-2">
                  <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 pt-4">
                    <span className="flex items-center gap-1"><Hash size={12} /> Booking ID: {guestDetails.id?.substring(0, 8) || 'N/A'}</span>
                    <span className="flex items-center gap-1"><Clock size={12} />{guestDetails.check_in_date ? `Checked in: ${formatDate(guestDetails.check_in_date)}` : 'Not checked in'}</span>
                  </div>
                </section>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
            <button onClick={handleClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">Close</button>
          </div>
        </div>
      </div>

      {showUnsavedWarning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-2 bg-yellow-100 rounded-full"><AlertCircle size={24} className="text-yellow-600" /></div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Unsaved Changes</h3>
                <p className="text-sm text-gray-600 mt-1">You have unsaved changes. What would you like to do?</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleContinue} className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-lg font-medium">Continue Editing</button>
              <button onClick={handleDiscard} className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium">Discard Changes</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
