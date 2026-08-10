// src/hooks/useCheckIn.ts
// ✅ FIXED: Prevent form submission from reloading page with diagnostic logs

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from '../i18n';
import { checkinService } from '../services/checkinService';
import { 
  CheckInFormData, 
  FoodRestrictions, 
  TouchedFields, 
  DEFAULT_RESTRICTIONS,
  BusinessBranding 
} from '../types/checkin';
import { Booking } from '../types';
import { cleanLocation, formatFullName, parseFullName } from '../utils/checkinHelpers';
import { buildIndemnityPlainText } from '../components/IndemnityText';

interface UseCheckInProps {
  businessId: string | null;
  onComplete: (booking: Booking, token?: string) => void;
  resetOnMount?: boolean;
}

export function useCheckIn({ businessId, onComplete, resetOnMount = false }: UseCheckInProps) {
  const { t } = useTranslation();
  
  // State
  const [step, setStep] = useState(() => {
    if (resetOnMount) {
      return 1;
    }
    const saved = sessionStorage.getItem('checkin_step');
    return saved ? parseInt(saved, 10) : 1;
  });

  const [formData, setFormData] = useState<CheckInFormData>(() => {
    if (resetOnMount) {
      return {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        passportOrId: '',
        nationality: '',
        checkInDate: '',
        checkOutDate: '',
        roomType: '',
        numberOfGuests: 1,
        specialRequests: '',
        signature: '',
        idPhoto: '',
        saveDetails: false,
        restrictions: DEFAULT_RESTRICTIONS,
      };
    }
    const saved = sessionStorage.getItem('checkin_form');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fall through
      }
    }
    return {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      passportOrId: '',
      nationality: '',
      checkInDate: '',
      checkOutDate: '',
      roomType: '',
      numberOfGuests: 1,
      specialRequests: '',
      signature: '',
      idPhoto: '',
      saveDetails: false,
      restrictions: DEFAULT_RESTRICTIONS,
    };
  });

  const [touched, setTouched] = useState<TouchedFields>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState<BusinessBranding | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [notification, setNotification] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [guestProfileLoaded, setGuestProfileLoaded] = useState(false);
  const isSubmitting = useRef(false);

  // Load branding
  useEffect(() => {
    if (!businessId) return;
    checkinService.getBusinessBranding(businessId).then(setBranding).catch(console.error);
  }, [businessId]);

  // Persist step and form to sessionStorage
  useEffect(() => {
    if (!resetOnMount) {
      sessionStorage.setItem('checkin_step', String(step));
      sessionStorage.setItem('checkin_form', JSON.stringify(formData));
    }
  }, [step, formData, resetOnMount]);

  // Load guest profile when email changes
  useEffect(() => {
    const email = formData.email?.toLowerCase().trim();
    if (!email || !email.includes('@') || guestProfileLoaded) return;
    const timer = setTimeout(async () => {
      try {
        const profile = await checkinService.getGuestProfile(email);
        if (profile) {
          setFormData(prev => ({
            ...prev,
            firstName: profile.first_name || prev.firstName,
            lastName: profile.last_name || prev.lastName,
            phone: profile.phone || prev.phone,
            passportOrId: profile.passport_or_id || prev.passportOrId,
            nationality: profile.nationality || prev.nationality,
            restrictions: profile.restrictions || prev.restrictions,
          }));
          setGuestProfileLoaded(true);
        }
      } catch (e) {
        console.warn('Profile load failed', e);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [formData.email, guestProfileLoaded]);

  const updateField = useCallback((field: keyof CheckInFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
    setErrors(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const updateFullName = useCallback((fullName: string) => {
    const { firstName, lastName } = parseFullName(fullName);
    setFormData(prev => ({ ...prev, firstName, lastName }));
    setTouched(prev => ({ ...prev, firstName: true, lastName: true }));
  }, []);

  const validateStep = useCallback((currentStep: number): boolean => {
    const newErrors: Record<string, string> = {};
    if (currentStep === 1) {
      if (!formData.firstName.trim()) newErrors.firstName = t('error_required');
      if (!formData.lastName.trim()) newErrors.lastName = t('error_required');
      if (!formData.email.trim() || !formData.email.includes('@')) newErrors.email = t('error_invalid_email');
      if (!formData.phone.trim()) newErrors.phone = t('error_required');
      if (!formData.passportOrId.trim()) newErrors.passportOrId = t('error_required');
      if (!formData.nationality.trim()) newErrors.nationality = t('error_required');
    } else if (currentStep === 2) {
      if (!formData.checkInDate) newErrors.checkInDate = t('error_required');
      if (!formData.checkOutDate) newErrors.checkOutDate = t('error_required');
      if (formData.checkInDate && formData.checkOutDate && formData.checkOutDate <= formData.checkInDate) {
        newErrors.checkOutDate = t('error_checkout_after_checkin');
      }
      if (!formData.roomType) newErrors.roomType = t('error_required');
      if (formData.numberOfGuests < 1) newErrors.numberOfGuests = t('error_required');
    } else if (currentStep === 3) {
      // restrictions optional
    } else if (currentStep === 4) {
      if (!formData.signature) newErrors.signature = t('error_signature_required');
      if (!formData.idPhoto) newErrors.idPhoto = t('error_photo_required');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, t]);

  const getErrorClass = useCallback((field: string) => {
    return errors[field] && touched[field] ? 'border-red-500' : '';
  }, [errors, touched]);

  const nextStep = useCallback(() => {
    if (validateStep(step)) {
      setStep(s => Math.min(s + 1, 4));
    }
  }, [step, validateStep]);

  const prevStep = useCallback(() => {
    setStep(s => Math.max(s - 1, 1));
  }, []);

  const handleRestrictionsSave = useCallback((restrictions: FoodRestrictions) => {
    setFormData(prev => ({ ...prev, restrictions }));
  }, []);

  const saveGuestProfile = useCallback(async () => {
    try {
      await checkinService.saveGuestProfile(formData.email.toLowerCase().trim(), {
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone,
        passport_or_id: formData.passportOrId,
        nationality: formData.nationality,
        restrictions: formData.restrictions,
      });
    } catch (e) {
      console.warn('Failed to save guest profile', e);
    }
  }, [formData]);

  const resetForm = useCallback(() => {
    setStep(1);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      passportOrId: '',
      nationality: '',
      checkInDate: '',
      checkOutDate: '',
      roomType: '',
      numberOfGuests: 1,
      specialRequests: '',
      signature: '',
      idPhoto: '',
      saveDetails: false,
      restrictions: DEFAULT_RESTRICTIONS,
    });
    setTouched({});
    setErrors({});
    setDuplicateWarning('');
    setNotification(null);
    setGuestProfileLoaded(false);
    sessionStorage.removeItem('checkin_step');
    sessionStorage.removeItem('checkin_form');
  }, []);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isSubmitting.current || loading) return;
    if (!validateStep(4)) {
      setNotification({ type: 'error', message: t('error_complete_all_fields') });
      return;
    }
    if (!businessId) {
      setNotification({ type: 'error', message: t('error_unexpected') });
      return;
    }

    isSubmitting.current = true;
    setLoading(true);
    setNotification(null);
    setDuplicateWarning('');

    try {
      const fullName = formatFullName(formData.firstName, formData.lastName);
      const nights = Math.max(1, Math.ceil(
        (new Date(formData.checkOutDate).getTime() - new Date(formData.checkInDate).getTime()) / (1000 * 60 * 60 * 24)
      ));
      const totalAmount = await checkinService.calculateTotalAmount(businessId, nights);

      const dbBooking = {
        business_id: businessId,
        guest_name: fullName,
        guest_first_name: formData.firstName,
        guest_last_name: formData.lastName,
        email: formData.email.toLowerCase().trim(),
        phone: formData.phone,
        passport_or_id: formData.passportOrId,
        nationality: formData.nationality,
        check_in_date: formData.checkInDate,
        check_out_date: formData.checkOutDate,
        room_type: formData.roomType,
        number_of_guests: formData.numberOfGuests,
        special_requests: formData.specialRequests || null,
        total_amount: totalAmount,
        nights,
        status: 'confirmed',
        restrictions: formData.restrictions,
        id_photo_url: formData.idPhoto || null,
        business_name: branding?.trading_name || 'our establishment',
      };

      console.log('🔍 submitBooking: Saving booking...');
      const result = await checkinService.saveBooking(dbBooking);

      if (!result.success) {
        console.error('🔴 submitBooking: Booking save failed');
        alert(t('error_booking_failed'));
        setLoading(false);
        isSubmitting.current = false;
        return;
      }

      if (result.isDuplicate) {
        console.log('⚠️ submitBooking: Duplicate booking detected');
        setDuplicateWarning(t('warning_duplicate_booking'));
      }

      console.log('🔍 submitBooking: Saving indemnity record...');
      const indemnityText = buildIndemnityPlainText({
        businessName: branding?.trading_name || 'our establishment',
        guestName: fullName,
        passportOrId: formData.passportOrId,
        includeGuestDetails: true,
      });

      const accessToken = await checkinService.saveIndemnityRecord(
        result.bookingId!,
        businessId!,
        fullName,
        formData.firstName,
        formData.lastName,
        formData.passportOrId,
        formData.signature,
        indemnityText
      );

      if (!accessToken) {
        console.error('🔴 submitBooking: Indemnity record save failed');
        setNotification({ type: 'error', message: t('error_unexpected') });
        setLoading(false);
        isSubmitting.current = false;
        return;
      }
      console.log('🔍 submitBooking: Indemnity record saved');

      console.log('🔍 submitBooking: Sending confirmation email...');
      checkinService.sendConfirmationEmail(dbBooking, accessToken);
      
      if (formData.saveDetails) {
        console.log('🔍 submitBooking: Saving guest profile...');
        saveGuestProfile();
      }

      const newBooking: Booking = {
        id: result.bookingId || Math.random().toString(36).substr(2, 9),
        guestName: fullName,
        email: formData.email.toLowerCase().trim(),
        phone: formData.phone,
        passportOrId: formData.passportOrId,
        nationality: formData.nationality,
        checkInDate: formData.checkInDate,
        checkOutDate: formData.checkOutDate,
        roomType: formData.roomType,
        numberOfGuests: formData.numberOfGuests,
        specialRequests: formData.specialRequests,
        totalAmount,
        nights,
        status: 'confirmed',
        businessId: businessId!,
        businessName: branding?.trading_name || '',
        createdAt: new Date().toISOString(),
      };

      console.log('🔍 submitBooking: Completing check-in...');
      onComplete(newBooking, accessToken || undefined);
      resetForm();
    } catch (error) {
      console.error('🔴 submitBooking error:', error);
      setNotification({ type: 'error', message: t('error_unexpected') });
    } finally {
      setLoading(false);
      isSubmitting.current = false;
    }
  }, [formData, businessId, branding, loading, t, validateStep, onComplete, resetForm, saveGuestProfile]);

  return {
    step,
    formData,
    touched,
    errors,
    loading,
    branding,
    duplicateWarning,
    notification,
    setNotification,
    updateField,
    nextStep,
    prevStep,
    handleRestrictionsSave,
    handleSubmit,
    resetForm,
    updateFullName,
    getErrorClass,
  };
}
