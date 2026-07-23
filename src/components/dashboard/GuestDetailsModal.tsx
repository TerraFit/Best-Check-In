// src/components/dashboard/GuestDetailsModal.tsx
// ✅ COMPLETE: Food restrictions + Editable stay details

import { useState, useEffect, useCallback } from 'react';
import { 
  X, Phone, Mail, Globe, User, Calendar, Users, 
  MapPin, Utensils, ArrowRight, Bed, Clock, Hash,
  Save, Edit2, Check, AlertCircle
} from 'lucide-react';
import { useGuestDetails } from '../../hooks/useGuestDetails';
import { FoodRestrictions } from '../../types/guest';

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

export default function GuestDetailsModal({
  isOpen,
  bookingId,
  onClose,
  businessId
}: GuestDetailsModalProps) {
  const { 
    guestDetails, 
    loading, 
    fetchGuestDetails, 
    updateFoodRestrictions,
    updateStayDetails  // ✅ NEW
  } = useGuestDetails();
  
  const [restrictions, setRestrictions] = useState<FoodRestrictions>(DEFAULT_RESTRICTIONS);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // ✅ NEW: Stay editing state
  const [isEditingStay, setIsEditingStay] = useState(false);
  const [stayEditData, setStayEditData] = useState({
    check_in_date: '',
    check_out_date: '',
    nights: 1
  });
  const [savingStay, setSavingStay] = useState(false);

  // Load guest details when modal opens
  useEffect(() => {
    if (isOpen && bookingId) {
      fetchGuestDetails(bookingId);
    }
  }, [isOpen, bookingId, fetchGuestDetails]);

  // Initialize restrictions when guest details load
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
    }
  }, [guestDetails]);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (hasUnsavedChanges || isEditingStay) {
      setShowUnsavedWarning(true);
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, isEditingStay, onClose]);

  const handleDiscard = useCallback(() => {
    setShowUnsavedWarning(false);
    setHasUnsavedChanges(false);
    setIsEditingStay(false);
    if (guestDetails?.food_restrictions) {
      setRestrictions(guestDetails.food_restrictions);
    } else {
      setRestrictions(DEFAULT_RESTRICTIONS);
    }
    if (guestDetails) {
      setStayEditData({
        check_in_date: guestDetails.check_in_date || '',
        check_out_date: guestDetails.check_out_date || '',
        nights: guestDetails.nights || 1
      });
    }
    onClose();
  }, [guestDetails, onClose]);

  const handleContinue = useCallback(() => {
    setShowUnsavedWarning(false);
  }, []);

  const handleRestrictionChange = useCallback((key: keyof FoodRestrictions, value: boolean) => {
    setRestrictions(prev => {
      const newRestrictions = { ...prev, [key]: value };
      if (key === 'other' && value === false) {
        newRestrictions.other_text = '';
      }
      return newRestrictions;
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
      await updateFoodRestrictions(bookingId, restrictions);
      setHasUnsavedChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      setError('Failed to save food restrictions. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [bookingId, restrictions, updateFoodRestrictions]);

  // ✅ NEW: Handle stay save
  const handleSaveStay = async () => {
    if (!bookingId) return;
    
    setSavingStay(true);
    setError(null);
    
    try {
      const result = await updateStayDetails(bookingId, stayEditData);
      if (result.success) {
        setIsEditingStay(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (err) {
      console.error('❌ Failed to save stay details:', err);
      setError('Failed to save stay details. Please try again.');
    } finally {
      setSavingStay(false);
    }
  };

  // ✅ Get active restrictions with icons
  const getActiveRestrictionsWithIcons = (): string[] => {
    const active: string[] = [];
    DIETARY_OPTIONS.forEach(({ key, icon }) => {
      if (key === 'other') {
        if (restrictions.other && restrictions.other_text) {
          active.push(`📝 OTHER (${restrictions.other_text})`);
        } else if (restrictions.other) {
          active.push('📝 OTHER');
        }
      } else if (restrictions[key as keyof FoodRestrictions] === true) {
        active.push(`${icon} ${key.replace('_', ' ').toUpperCase()}`);
      }
    });
    return active;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Main Modal Overlay */}
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleClose();
          }
        }}
      >
        <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-fade-in">
          
          {/* HEADER */}
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
                  <p className="text-xs text-gray-400 font-mono">
                    Ref: {guestDetails.booking_reference}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* BODY */}
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
                
                {/* SECTION 1: GUEST INFORMATION */}
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
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {guestDetails.guest_name || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <Phone size={16} className="text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-400">Phone</p>
                        {guestDetails.guest_phone ? (
                          <a href={`tel:${guestDetails.guest_phone}`} className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline truncate block">
                            {guestDetails.guest_phone}
                          </a>
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
                          <a href={`mailto:${guestDetails.guest_email}`} className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline truncate block">
                            {guestDetails.guest_email}
                          </a>
                        ) : (
                          <p className="text-sm text-gray-400">N/A</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <Globe size={16} className="text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-400">Country of Origin</p>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {guestDetails.guest_country || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* SECTION 2: TRAVEL DETAILS */}
                <section>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="h-px flex-1 bg-gray-200"></span>
                    <span>Travel Details</span>
                    <span className="h-px flex-1 bg-gray-200"></span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100 col-span-full sm:col-span-1">
                      <MapPin size={16} className="text-blue-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-blue-500 font-medium">Arriving From</p>
                        <p className="text-sm font-semibold text-blue-700 truncate">
                          {guestDetails.arriving_from || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-100 col-span-full sm:col-span-1">
                      <ArrowRight size={16} className="text-green-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-green-500 font-medium">Next Destination</p>
                        <p className="text-sm font-semibold text-green-700 truncate">
                          {guestDetails.next_destination || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* SECTION 3: STAY DETAILS - ✅ WITH EDIT BUTTON */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <span className="h-px flex-1 bg-gray-200"></span>
                      <span className="flex items-center gap-2">
                        <Calendar size={14} className="text-blue-500" />
                        Stay Details
                      </span>
                      <span className="h-px flex-1 bg-gray-200"></span>
                    </h3>
                    
                    {!isEditingStay ? (
                      <button
                        onClick={() => setIsEditingStay(true)}
                        className="text-xs text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1"
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsEditingStay(false)}
                          className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveStay}
                          disabled={savingStay}
                          className="text-xs bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 font-medium disabled:opacity-50 flex items-center gap-1"
                        >
                          {savingStay ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Check size={12} /> Save
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Check-in Date */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <Calendar size={16} className="text-gray-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-400">Check-in</p>
                        {isEditingStay ? (
                          <input
                            type="date"
                            value={stayEditData.check_in_date}
                            onChange={(e) => setStayEditData(prev => ({ 
                              ...prev, 
                              check_in_date: e.target.value 
                            }))}
                            className="w-full text-sm font-medium text-gray-900 bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none"
                          />
                        ) : (
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {formatDate(guestDetails?.check_in_date)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Check-out Date */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <Calendar size={16} className="text-gray-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-400">Check-out</p>
                        {isEditingStay ? (
                          <input
                            type="date"
                            value={stayEditData.check_out_date}
                            onChange={(e) => setStayEditData(prev => ({ 
                              ...prev, 
                              check_out_date: e.target.value 
                            }))}
                            className="w-full text-sm font-medium text-gray-900 bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none"
                          />
                        ) : (
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {formatDate(guestDetails?.check_out_date)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Nights */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <Users size={16} className="text-gray-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-400">Nights</p>
                        {isEditingStay ? (
                          <input
                            type="number"
                            min="1"
                            max="365"
                            value={stayEditData.nights}
                            onChange={(e) => setStayEditData(prev => ({ 
                              ...prev, 
                              nights: parseInt(e.target.value) || 1 
                            }))}
                            className="w-full text-sm font-medium text-gray-900 bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none"
                          />
                        ) : (
                          <p className="text-sm font-medium text-gray-900">
                            {guestDetails?.nights || 1}
                            <span className="text-xs text-gray-400 ml-1">nights</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                {/* SECTION 4: FOOD RESTRICTIONS */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <span className="h-px flex-1 bg-gray-200"></span>
                      <span className="flex items-center gap-2">
                        <Utensils size={14} className="text-orange-500" />
                        Food Restrictions
                      </span>
                      <span className="h-px flex-1 bg-gray-200"></span>
                    </h3>
                    
                    <div className="flex items-center gap-2">
                      {saveSuccess && (
                        <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                          <Check size={14} /> Saved
                        </span>
                      )}
                      {error && (
                        <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                          <AlertCircle size={14} /> Error
                        </span>
                      )}
                      <button
                        onClick={handleSave}
                        disabled={!hasUnsavedChanges || saving}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                          hasUnsavedChanges && !saving
                            ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {saving ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save size={13} />
                            Save
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Dietary Requirements Checkboxes */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {DIETARY_OPTIONS.map(({ key, label, icon }) => {
                      const isChecked = restrictions[key as keyof FoodRestrictions] as boolean;
                      return (
                        <label
                          key={key}
                          className={`flex items-center gap-2 text-sm cursor-pointer transition-all rounded-lg px-3 py-2 border ${
                            isChecked
                              ? 'bg-orange-50 border-orange-200 text-orange-700'
                              : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => handleRestrictionChange(key as keyof FoodRestrictions, e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500 flex-shrink-0"
                          />
                          <span className="truncate">{icon} {label}</span>
                        </label>
                      );
                    })}
                  </div>

                  {/* Other Text Input */}
                  {restrictions.other && (
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Specify dietary requirement:
                      </label>
                      <input
                        type="text"
                        value={restrictions.other_text || ''}
                        onChange={(e) => handleOtherTextChange(e.target.value)}
                        placeholder="Please specify..."
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                  )}

                  {/* Active restrictions display */}
                  {getActiveRestrictionsWithIcons().length > 0 && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs font-medium text-amber-800 mb-2">Current Restrictions:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {getActiveRestrictionsWithIcons().map((item, index) => (
                          <span key={index} className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-[10px] font-medium">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {!Object.values(restrictions).some(val => val === true) && (
                    <p className="text-sm text-gray-400 italic mt-2 text-center">
                      No dietary restrictions recorded
                    </p>
                  )}
                </section>

                {/* SECTION 5: METADATA */}
                <section className="pt-2">
                  <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 pt-4">
                    <span className="flex items-center gap-1">
                      <Hash size={12} />
                      Booking ID: {guestDetails.id?.substring(0, 8) || 'N/A'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {guestDetails.check_in_date ? `Checked in: ${formatDate(guestDetails.check_in_date)}` : 'Not checked in'}
                    </span>
                  </div>
                </section>
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end flex-shrink-0">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* UNSAVED CHANGES WARNING MODAL */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl animate-scale-in">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-2 bg-yellow-100 rounded-full flex-shrink-0">
                <AlertCircle size={24} className="text-yellow-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Unsaved Changes</h3>
                <p className="text-sm text-gray-600 mt-1">
                  You have unsaved changes. What would you like to do?
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleContinue}
                className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
              >
                Continue Editing
              </button>
              <button
                onClick={handleDiscard}
                className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
