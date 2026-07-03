// src/components/dashboard/GuestDetailsModal.tsx
// ✅ Full Guest Details Modal with Food Restrictions

import { useState, useEffect, useCallback } from 'react';
import { X, Phone, Mail, Globe, User, Calendar, Users, MapPin, Utensils } from 'lucide-react';
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
  other: false,
  other_text: ''
};

const DIETARY_OPTIONS = [
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'vegan', label: 'Vegan' },
  { key: 'pescatarian', label: 'Pescatarian' },
  { key: 'halal', label: 'Halal' },
  { key: 'kosher', label: 'Kosher' },
  { key: 'gluten_free', label: 'Gluten-Free' },
  { key: 'lactose_free', label: 'Lactose-Free' },
  { key: 'nut_allergy', label: 'Nut Allergy' },
  { key: 'seafood_allergy', label: 'Seafood Allergy' },
  { key: 'diabetic', label: 'Diabetic' },
  { key: 'no_pork', label: 'No Pork' },
  { key: 'other', label: 'Other' }
];

export default function GuestDetailsModal({
  isOpen,
  bookingId,
  onClose,
  businessId
}: GuestDetailsModalProps) {
  const { guestDetails, loading, fetchGuestDetails, updateFoodRestrictions } = useGuestDetails();
  
  const [restrictions, setRestrictions] = useState<FoodRestrictions>(DEFAULT_RESTRICTIONS);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

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
  }, [isOpen, handleClose]);

  // Handle close with unsaved changes check
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  // Handle discard changes
  const handleDiscard = useCallback(() => {
    setShowUnsavedWarning(false);
    setHasUnsavedChanges(false);
    if (guestDetails?.food_restrictions) {
      setRestrictions(guestDetails.food_restrictions);
    } else {
      setRestrictions(DEFAULT_RESTRICTIONS);
    }
    onClose();
  }, [guestDetails, onClose]);

  // Handle continue editing
  const handleContinue = useCallback(() => {
    setShowUnsavedWarning(false);
  }, []);

  // Handle restriction change
  const handleRestrictionChange = useCallback((key: keyof FoodRestrictions, value: boolean) => {
    setRestrictions(prev => {
      const newRestrictions = { ...prev, [key]: value };
      // If 'other' is unchecked, clear other_text
      if (key === 'other' && value === false) {
        newRestrictions.other_text = '';
      }
      return newRestrictions;
    });
    setHasUnsavedChanges(true);
  }, []);

  // Handle other text change
  const handleOtherTextChange = useCallback((text: string) => {
    setRestrictions(prev => ({ ...prev, other_text: text }));
    setHasUnsavedChanges(true);
  }, []);

  // Handle save restrictions
  const handleSave = useCallback(async () => {
    if (!bookingId) return;
    
    try {
      await updateFoodRestrictions(bookingId, restrictions);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save restrictions:', error);
    }
  }, [bookingId, restrictions, updateFoodRestrictions]);

  // If modal is not open, return null
  if (!isOpen) return null;

  return (
    <>
      {/* Modal Overlay */}
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleClose();
          }
        }}
      >
        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-white">
            <h2 className="text-xl font-semibold text-gray-900 truncate">
              {loading ? 'Loading...' : guestDetails?.guest_name || 'Guest Details'}
            </h2>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              </div>
            ) : !guestDetails ? (
              <div className="text-center py-12 text-gray-500">
                <User size={48} className="mx-auto mb-4 text-gray-300" />
                <p>Guest details not found</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Guest Information Section */}
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
                    Guest Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <User size={16} className="text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Full Name</p>
                        <p className="text-sm font-medium">{guestDetails.guest_name || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <Phone size={16} className="text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Telephone</p>
                        {guestDetails.guest_phone ? (
                          <a 
                            href={`tel:${guestDetails.guest_phone}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {guestDetails.guest_phone}
                          </a>
                        ) : (
                          <p className="text-sm text-gray-400">N/A</p>
                        )}
                      </div>
                    </div>

                    {/* Email */}
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <Mail size={16} className="text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        {guestDetails.guest_email ? (
                          <a 
                            href={`mailto:${guestDetails.guest_email}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline break-all"
                          >
                            {guestDetails.guest_email}
                          </a>
                        ) : (
                          <p className="text-sm text-gray-400">N/A</p>
                        )}
                      </div>
                    </div>

                    {/* Country */}
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <Globe size={16} className="text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Country of Origin</p>
                        <p className="text-sm font-medium">{guestDetails.guest_country || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Arriving From */}
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <MapPin size={16} className="text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Arriving From</p>
                        <p className="text-sm font-medium">{guestDetails.arriving_from || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Number of Guests */}
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <Users size={16} className="text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Number of Guests</p>
                        <p className="text-sm font-medium">{guestDetails.guests || 1}</p>
                      </div>
                    </div>

                    {/* Check-in Date */}
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <Calendar size={16} className="text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Check-in Date</p>
                        <p className="text-sm font-medium">
                          {guestDetails.check_in_date 
                            ? new Date(guestDetails.check_in_date).toLocaleDateString('en-ZA', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })
                            : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Check-out Date */}
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <Calendar size={16} className="text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Check-out Date</p>
                        <p className="text-sm font-medium">
                          {guestDetails.check_out_date 
                            ? new Date(guestDetails.check_out_date).toLocaleDateString('en-ZA', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })
                            : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Booking Reference */}
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <span className="text-gray-400 text-xs font-mono">#</span>
                      <div>
                        <p className="text-xs text-gray-500">Booking Reference</p>
                        <p className="text-sm font-mono font-medium">{guestDetails.booking_reference || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Food Restrictions Section */}
                <section className="border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Utensils size={18} className="text-orange-500" />
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Food Restrictions
                      </h3>
                    </div>
                    <button
                      onClick={handleSave}
                      disabled={!hasUnsavedChanges}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        hasUnsavedChanges
                          ? 'bg-orange-500 text-white hover:bg-orange-600'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Save Changes
                    </button>
                  </div>

                  {/* Dietary Requirements Checkboxes */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {DIETARY_OPTIONS.map(({ key, label }) => (
                      <label
                        key={key}
                        className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 rounded-lg px-2 py-1.5 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={restrictions[key as keyof FoodRestrictions] as boolean}
                          onChange={(e) => handleRestrictionChange(key as keyof FoodRestrictions, e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                        />
                        {label}
                      </label>
                    ))}
                  </div>

                  {/* Other Text Input */}
                  {restrictions.other && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Specify dietary requirement:
                      </label>
                      <input
                        type="text"
                        value={restrictions.other_text || ''}
                        onChange={(e) => handleOtherTextChange(e.target.value)}
                        placeholder="Please specify..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                  )}

                  {/* No restrictions message */}
                  {!Object.values(restrictions).some(val => val === true) && (
                    <p className="text-sm text-gray-400 italic mt-2">
                      No dietary restrictions recorded
                    </p>
                  )}
                </section>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Warning Modal */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-yellow-100 rounded-full">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Unsaved Changes</h3>
            </div>
            <p className="text-gray-600 mb-6">
              You have unsaved changes to the food restrictions. Are you sure you want to close?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleContinue}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Continue Editing
              </button>
              <button
                onClick={handleDiscard}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
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
