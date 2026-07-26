// src/components/staff/GuestDietariesTab.tsx
// ✅ COMPLETE: Fixed audit logging for employee actions

import React, { useState, useMemo, useEffect } from 'react';
import { ChevronRight, X, Utensils, Info, Check, AlertCircle } from 'lucide-react';
import { createAuditLog } from '@/utils/auditLogger';

// Types
interface FoodRestrictions {
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
}

interface Booking {
  id: string;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  guest_country: string;
  guest_province: string;
  guest_city: string;
  passport_or_id: string;
  check_in_date: string;
  check_out_date?: string;
  nights: number;
  status: string;
  food_restrictions: FoodRestrictions;
  business_id?: string;
  [key: string]: any;
}

interface GuestDietariesTabProps {
  bookings: Booking[];
  session: {
    user: {
      id: string;
      full_name: string;
      role: 'owner' | 'EmployeeOverview';
      business_id: string;
      email?: string;
    };
  };
  onSaveDietary: (guestId: string, updatedRestrictions: FoodRestrictions) => Promise<void>;
}

const DIETARY_OPTIONS = [
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'vegan', label: 'Vegan' },
  { key: 'halal', label: 'Halal' },
  { key: 'kosher', label: 'Kosher' },
  { key: 'gluten_free', label: 'Gluten-Free' },
  { key: 'dairy_free', label: 'Dairy-Free' },
  { key: 'lactose_intolerant', label: 'Lactose Intolerant' },
  { key: 'nut_allergy', label: 'Nut Allergy' },
  { key: 'shellfish_allergy', label: 'Shellfish Allergy' },
  { key: 'egg_allergy', label: 'Egg Allergy' },
  { key: 'soy_allergy', label: 'Soy Allergy' },
  { key: 'pork_free', label: 'Pork-Free' },
  { key: 'diabetic', label: 'Diabetic' },
  { key: 'no_seafood', label: 'No Seafood' }
];

export function GuestDietariesTab({ bookings, session, onSaveDietary }: GuestDietariesTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<Booking | null>(null);
  const [localRestrictions, setLocalRestrictions] = useState<FoodRestrictions | null>(null);
  const [otherText, setOtherText] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Reset error when guest changes
  useEffect(() => {
    setErrorMsg(null);
  }, [selectedGuest]);

  // Filter to ONLY checked-in and stayover guests
  const filteredGuests = useMemo(() => {
    const activeGuests = bookings.filter(b => {
      const isCheckedIn = b.status === 'checked_in' || b.status === 'Checked-In';
      const isStayover = b.status === 'stayover' || b.status === 'Stayover';
      
      // Exclude completed, cancelled, or future bookings
      if (b.status === 'completed' || b.status === 'Completed' || 
          b.status === 'cancelled' || b.status === 'Cancelled' ||
          b.status === 'confirmed' || b.status === 'Confirmed') {
        return false;
      }
      
      return isCheckedIn || isStayover;
    });
    
    // Apply search filter
    return activeGuests.filter(b => {
      const nameMatch = b.guest_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const emailMatch = b.guest_email?.toLowerCase().includes(searchTerm.toLowerCase());
      return nameMatch || emailMatch;
    });
  }, [bookings, searchTerm]);

  const handleOpenGuest = (guest: Booking) => {
    setSelectedGuest(guest);
    setLocalRestrictions({ ...guest.food_restrictions });
    setOtherText(guest.food_restrictions?.other_text || '');
    setErrorMsg(null);
  };

  const handleToggleRestriction = (key: keyof FoodRestrictions) => {
    if (!localRestrictions) return;
    setLocalRestrictions(prev => {
      if (!prev) return null;
      return {
        ...prev,
        [key]: !prev[key]
      };
    });
  };

  // Helper to format restrictions for display
  const formatRestrictions = (restrictions: FoodRestrictions, includeOtherText: boolean = true): string => {
    const active = Object.entries(restrictions)
      .filter(([key, value]) => value === true && key !== 'other_text')
      .map(([key]) => key.replace(/_/g, ' '))
      .join(', ');
    
    if (includeOtherText && restrictions.other && restrictions.other_text) {
      return active ? `${active} (${restrictions.other_text})` : restrictions.other_text;
    }
    
    return active || 'None';
  };

  // Helper to count active restrictions
  const getActiveRestrictionCount = (restrictions: FoodRestrictions): number => {
    return Object.entries(restrictions)
      .filter(([key, value]) => value === true && key !== 'other_text')
      .length;
  };

  const handleSave = async () => {
    if (!selectedGuest || !localRestrictions) {
      setErrorMsg('No guest selected or restrictions not loaded');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      // Prepare final restrictions with other_text
      const finalRestrictions: FoodRestrictions = {
        ...localRestrictions,
        other_text: localRestrictions.other ? otherText : ''
      };

      // Check if anything actually changed
      const previousRestrictions = selectedGuest.food_restrictions;
      const hasChanged = JSON.stringify(previousRestrictions) !== JSON.stringify(finalRestrictions);

      if (!hasChanged) {
        setErrorMsg('No changes detected. Please modify a restriction before saving.');
        setIsSaving(false);
        return;
      }

      // Format changes for audit log
      const previousActive = formatRestrictions(previousRestrictions, true);
      const newActive = formatRestrictions(finalRestrictions, true);

      // ✅ Get business_id from session or selectedGuest
      const businessId = session.user.business_id || selectedGuest.business_id || 'unknown';

      console.log('🔍 Creating audit log with:', {
        businessId,
        userId: session.user.id,
        userName: session.user.full_name,
        userRole: session.user.role,
        guestName: selectedGuest.guest_name,
        bookingId: selectedGuest.id
      });

      // ✅ CREATE AUDIT LOG FIRST (before saving)
      const auditResult = await createAuditLog({
        action: 'UPDATE_FOOD_RESTRICTIONS',
        guest_id: selectedGuest.id,
        employee_id: session.user.id,
        user_id: session.user.id,
        user_name: session.user.full_name || 'Employee',
        user_role: session.user.role || 'EmployeeOverview',
        business_id: businessId,
        guest_name: selectedGuest.guest_name,
        booking_id: selectedGuest.id,
        description: `Updated food restrictions for guest ${selectedGuest.guest_name}`,
        changes: {
          previous_value: previousActive,
          new_value: newActive,
          previous_restrictions: previousRestrictions,
          new_restrictions: finalRestrictions
        }
      });

      console.log('📝 Audit result:', auditResult);

      // ✅ Then save the dietary restrictions
      await onSaveDietary(selectedGuest.id, finalRestrictions);

      // Show success
      setSuccessMsg(true);
      setErrorMsg(null);
      
      // Update the selected guest's restrictions in the local state
      setSelectedGuest({
        ...selectedGuest,
        food_restrictions: finalRestrictions
      });

      setTimeout(() => {
        setSuccessMsg(false);
        setSelectedGuest(null);
        setLocalRestrictions(null);
        setOtherText('');
      }, 2000);

    } catch (error: any) {
      console.error('❌ Error saving dietary restrictions:', error);
      setErrorMsg(error.message || 'Failed to save dietary restrictions. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
      {/* Left panel - Active Guests List */}
      <div className="lg:col-span-1 bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm flex flex-col h-[600px]">
        <div className="p-4 border-b border-stone-100 bg-stone-50/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
              Active Guests ({filteredGuests.length})
            </span>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search active guests..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-stone-200 rounded-xl py-2 px-4 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
        </div>

        <div className="flex-grow overflow-y-auto divide-y divide-stone-100">
          {filteredGuests.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-400">
              No active checked-in guests found.
            </div>
          ) : (
            filteredGuests.map(guest => {
              const activeCount = guest.food_restrictions 
                ? getActiveRestrictionCount(guest.food_restrictions)
                : 0;

              return (
                <div
                  key={guest.id}
                  onClick={() => handleOpenGuest(guest)}
                  className={`p-4 cursor-pointer transition-colors flex justify-between items-center ${
                    selectedGuest?.id === guest.id ? 'bg-amber-50' : 'hover:bg-stone-50/60'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-stone-900 truncate">{guest.guest_name}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5 truncate">
                      Check-in: {guest.check_in_date} • {guest.nights || 1} nights
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {activeCount > 0 ? (
                      <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded-full">
                        ⚠️ {activeCount} Alert{activeCount > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="bg-stone-100 text-stone-400 text-[9px] font-medium px-2 py-0.5 rounded-full">
                        Clean
                      </span>
                    )}
                    <ChevronRight size={14} className="text-stone-400" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right panel - Restriction Editor */}
      <div className="lg:col-span-2 bg-white rounded-3xl border border-stone-200 shadow-sm min-h-[600px] flex flex-col">
        {selectedGuest && localRestrictions ? (
          <div className="p-6 md:p-8 flex-grow flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex justify-between items-start border-b border-stone-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-stone-950 font-serif leading-none">
                    Dietary Requirements Editor
                  </h3>
                  <p className="text-xs text-stone-400 mt-1">
                    Manage kitchen synchronized alerts for <strong className="text-stone-700">{selectedGuest.guest_name}</strong>
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedGuest(null);
                    setErrorMsg(null);
                  }}
                  className="p-1 rounded-full hover:bg-stone-100 text-stone-400"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-3 flex items-start gap-2">
                  <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-red-700">{errorMsg}</span>
                </div>
              )}

              {/* Success Message */}
              {successMsg && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center gap-2 animate-fade-in">
                  <Check size={16} className="text-emerald-500" />
                  <span className="text-xs text-emerald-700 font-medium">
                    ✅ Kitchen synchronization complete! Audit log created.
                  </span>
                </div>
              )}

              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-stone-500 font-bold text-[10px] uppercase tracking-wider">
                  <Info size={12} className="text-amber-500" /> Guest Information (Read-Only)
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-1">
                  <div>
                    <span className="text-stone-400 text-[10px] block">Guest Name</span>
                    <span className="font-semibold text-stone-700 block">{selectedGuest.guest_name}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 text-[10px] block">Room</span>
                    <span className="font-semibold text-stone-700 block">{selectedGuest.guest_province || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 text-[10px] block">Check-in</span>
                    <span className="font-semibold text-stone-700 block">{selectedGuest.check_in_date}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 text-[10px] block">Check-out</span>
                    <span className="font-semibold text-stone-700 block">{selectedGuest.check_out_date || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                  Select Associated Restrictions
                </h4>
                <div className="flex flex-wrap gap-2.5">
                  {DIETARY_OPTIONS.map(opt => {
                    const isActive = localRestrictions[opt.key as keyof FoodRestrictions] === true;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => handleToggleRestriction(opt.key as keyof FoodRestrictions)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                          isActive
                            ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-md shadow-amber-500/10 scale-105'
                            : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => handleToggleRestriction('other')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                      localRestrictions.other
                        ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-md shadow-amber-500/10 scale-105'
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    Other custom...
                  </button>
                </div>
              </div>

              {localRestrictions.other && (
                <div className="space-y-1 animate-fade-in">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Specify Custom Food Restriction
                  </label>
                  <input
                    type="text"
                    value={otherText}
                    onChange={e => setOtherText(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 py-3 px-4 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="e.g. No raw eggs, strawberry allergy..."
                  />
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-stone-100 flex items-center justify-between mt-8">
              <div className="flex items-center gap-3">
                {successMsg ? (
                  <span className="text-emerald-600 text-xs font-bold flex items-center gap-1.5">
                    ✓ Saved to audit trail
                  </span>
                ) : isSaving ? (
                  <span className="text-amber-600 text-xs font-bold flex items-center gap-1.5">
                    ⏳ Saving...
                  </span>
                ) : (
                  <span className="text-stone-400 text-xs">
                    All changes are logged in the Platform Audit Trail
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className={`bg-amber-500 hover:bg-amber-600 text-stone-950 font-black px-8 py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all ${
                  isSaving ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSaving ? 'Saving...' : 'Save Food Restrictions'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center p-8 text-center text-stone-400">
            <Utensils size={48} className="text-stone-200 mb-3" />
            <h3 className="text-sm font-bold text-stone-800">Select a Guest to Edit</h3>
            <p className="text-[11px] text-stone-400 mt-1 max-w-xs">
              Click any active guest on the left sidebar to view their profile, existing food restrictions, and to commit updates directly.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default GuestDietariesTab;
