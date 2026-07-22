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

interface UseCheckInProps {
  businessId: string | null;
  onComplete: (booking: Booking, token?: string) => void;
}

export function useCheckIn({ businessId, onComplete }: UseCheckInProps) {
  const { t } = useTranslation();
  
  // State
  const [step, setStep] = useState(1);
  const [branding, setBranding] = useState<BusinessBranding | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingBranding, setLoadingBranding] = useState(!!businessId);
  const [loginLoading, setLoginLoading] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  
  // Food restrictions
  const [foodRestrictions, setFoodRestrictions] = useState<FoodRestrictions>(DEFAULT_RESTRICTIONS);
  const [hasDietaryRestrictions, setHasDietaryRestrictions] = useState<boolean | null>(null);
  const [showRestrictionsPanel, setShowRestrictionsPanel] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState<CheckInFormData>({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    passportOrId: '',
    country: '',
    city: '',
    province: '',
    arrivingFrom: '',
    nextDestination: '',
    settlement: '',
    arrivalDate: new Date().toISOString().split('T')[0],
    departureDate: '',
    nights: 1,
    adults: 1,
    kids: 0,
    referral: '',
    idPhoto: '',
    signature: '',
    acceptLegal: false,
    popiaConsent: false,
    saveDetails: false,
  });

  const [touched, setTouched] = useState<TouchedFields>({
    firstName: false,
    lastName: false,
    passportOrId: false,
    phone: false,
    country: false,
    province: false,
    city: false,
    arrivalDate: false,
    nights: false,
    referral: false,
    arrivingFrom: false,
    nextDestination: false,
    settlement: false,
    idPhoto: false,
    signature: false,
    acceptLegal: false,
  });

  // Refs for camera, signature, indemnity
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const indemnityRef = useRef<HTMLDivElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Log step changes for debugging
  useEffect(() => {
    console.log('🔍 useCheckIn: step changed to', step);
  }, [step]);

  // Load business branding
  useEffect(() => {
    if (businessId) {
      const loadBranding = async () => {
        try {
          setLoadingBranding(true);
          const data = await checkinService.getBusinessBranding(businessId);
          setBranding(data);
        } catch (error) {
          console.error('Error fetching business branding:', error);
        } finally {
          setLoadingBranding(false);
        }
      };
      loadBranding();
    }
  }, [businessId]);

  // Load guest profile when email changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.email && formData.email.includes('@')) {
        loadGuestProfile(formData.email);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [formData.email]);

  const loadGuestProfile = async (email: string) => {
    if (!email || !email.includes('@')) return;
    
    try {
      const result = await checkinService.getGuestProfile(email);
      if (result?.profile) {
        const profile = result.profile;
        let firstName = profile.first_name || '';
        let lastName = profile.last_name || '';
        
        if (!firstName && profile.full_name) {
          const parts = profile.full_name.split(' ');
          firstName = parts[0] || '';
          lastName = parts.slice(1).join(' ') || '';
        }
        
        setFormData(prev => ({
          ...prev,
          firstName: firstName || prev.firstName,
          lastName: lastName || prev.lastName,
          phone: profile.phone || prev.phone,
          passportOrId: profile.passport_or_id || prev.passportOrId,
          country: profile.country || prev.country,
          city: profile.city || prev.city,
          province: profile.province || prev.province,
        }));
        setProfileLoaded(true);
        setTimeout(() => setProfileLoaded(false), 3000);
      }
    } catch (error) {
      console.error('Error loading guest profile:', error);
    }
  };

  const saveGuestProfile = async () => {
    if (!formData.saveDetails || !formData.email || !formData.email.includes('@')) return;
    
    try {
      const fullName = formatFullName(formData.firstName, formData.lastName);
      await checkinService.saveGuestProfile(formData.email.toLowerCase().trim(), {
        fullName,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        passportOrId: formData.passportOrId,
        country: formData.country,
        city: formData.city,
        province: formData.province
      });
      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  // Calculate departure date
  useEffect(() => {
    if (formData.arrivalDate && formData.nights) {
      const date = new Date(formData.arrivalDate);
      date.setDate(date.getDate() + formData.nights);
      setFormData(prev => ({ ...prev, departureDate: date.toISOString().split('T')[0] }));
    }
  }, [formData.arrivalDate, formData.nights]);

  // Update full name when firstName or lastName changes
  const updateFullName = useCallback(() => {
    return formatFullName(formData.firstName, formData.lastName);
  }, [formData.firstName, formData.lastName]);

  // Auto-dismiss notifications
  useEffect(() => {
    if (duplicateWarning) {
      const timer = setTimeout(() => setDuplicateWarning(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [duplicateWarning]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setSubmitAttempted(false);
  }, [step]);

  const markTouched = (field: keyof TouchedFields) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleIndemnityScroll = () => {
    if (indemnityRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = indemnityRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 20) {
        setHasScrolledToBottom(true);
      }
    }
  };

  const handleDietaryContinue = () => {
    if (hasDietaryRestrictions === null) {
      alert('Please select whether you have any dietary restrictions.');
      return;
    }
    if (hasDietaryRestrictions === false) {
      setStep(4);
      return;
    }
    setShowRestrictionsPanel(true);
  };

  const handleRestrictionsSave = () => {
    const hasSelected = Object.entries(foodRestrictions).some(
      ([key, val]) => val === true && key !== 'other_text'
    );
    if (!hasSelected && !foodRestrictions.other_text) {
      alert('Please select at least one dietary restriction or specify "Other".');
      return;
    }
    setShowRestrictionsPanel(false);
    setStep(4);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔍 useCheckIn: handleSubmit called, current step:', step);
    
    if (loading) return;

    // Step 1: Email
    if (step === 1) {
      console.log('🔍 useCheckIn: Processing Step 1');
      setLoginLoading(true);
      // Validate email
      if (!formData.email || !formData.email.includes('@')) {
        alert('Please enter a valid email address.');
        setLoginLoading(false);
        return;
      }
      setTimeout(() => {
        setLoginLoading(false);
        console.log('🔍 useCheckIn: Moving from Step 1 to Step 2');
        setStep(2);
      }, 500);
      return;
    }

    // Step 2: Personal Details
    if (step === 2) {
      console.log('🔍 useCheckIn: Processing Step 2');
      const errors = validateStep2();
      console.log('🔍 useCheckIn: Step 2 validation errors:', errors);
      
      if (errors.length > 0) {
        setSubmitAttempted(true);
        const allFields: (keyof TouchedFields)[] = [
          'firstName', 'lastName', 'passportOrId', 'phone', 'country',
          'province', 'city', 'arrivalDate', 'nights', 'referral',
          'arrivingFrom', 'nextDestination', 'settlement'
        ];
        allFields.forEach(field => markTouched(field));
        alert(`${t('error_required_fields')}: ${errors.join(', ')}`);
        return;
      }
      
      // ✅ FIXED: Move to Step 3 (Dietary)
      console.log('🔍 useCheckIn: Moving from Step 2 to Step 3');
      setStep(3);
      return;
    }

    // Step 4: Indemnity & Submit
    if (step === 4) {
      console.log('🔍 useCheckIn: Processing Step 4');
      const errors = validateStep3();
      if (errors.length > 0) {
        setSubmitAttempted(true);
        if (!hasScrolledToBottom) {
          alert(t('error_scroll_indemnity'));
          indemnityRef.current?.scrollIntoView({ behavior: 'smooth' });
          return;
        }
        if (!formData.signature) {
          alert(t('error_signature_required_alert'));
          return;
        }
        if (!formData.idPhoto) {
          alert(t('error_id_photo_required_alert'));
          return;
        }
        alert(`${t('error_required_fields')}: ${errors.join(', ')}`);
        return;
      }

      await submitBooking();
    }
  };

  const validateStep2 = (): string[] => {
    const errors: string[] = [];
    if (!formData.firstName.trim()) errors.push(t('checkin_first_name'));
    if (!formData.lastName.trim()) errors.push(t('checkin_last_name'));
    if (!formData.passportOrId.trim()) errors.push(t('checkin_passport'));
    if (!formData.phone.trim()) errors.push(t('checkin_phone'));
    if (!formData.country) errors.push(t('checkin_country'));
    if (!formData.province) errors.push('Province');
    if (!formData.city.trim()) errors.push(t('checkin_city'));
    if (!formData.arrivingFrom.trim()) errors.push('Arriving From');
    if (!formData.arrivalDate) errors.push(t('checkin_arrival_date'));
    if (!formData.nights || formData.nights < 1) errors.push(t('checkin_nights'));
    if (!formData.referral) errors.push(t('checkin_referral'));
    if (!formData.nextDestination.trim()) errors.push(t('checkin_next_destination'));
    if (!formData.settlement) errors.push(t('checkin_settlement'));
    return errors;
  };

  const validateStep3 = (): string[] => {
    const errors: string[] = [];
    if (!formData.idPhoto) errors.push(t('checkin_id_photo'));
    if (!formData.signature) errors.push(t('checkin_signature'));
    if (!formData.acceptLegal) errors.push(t('error_indemnity_required'));
    return errors;
  };

  const submitBooking = async () => {
    setLoading(true);
    try {
      const totalAmount = await checkinService.calculateTotalAmount(businessId, formData.nights);
      const fullName = formatFullName(formData.firstName, formData.lastName);
      const formattedCheckIn = formData.arrivalDate.split('T')[0];
      const formattedCheckOut = formData.departureDate ? formData.departureDate.split('T')[0] : '';

      const dbBooking = {
        business_id: businessId,
        guest_name: fullName,
        guest_first_name: formData.firstName,
        guest_last_name: formData.lastName,
        guest_email: formData.email.toLowerCase().trim(),
        guest_phone: formData.phone,
        guest_id_number: formData.passportOrId,
        guest_id_photo: formData.idPhoto,
        guest_signature: formData.signature,
        check_in_date: formattedCheckIn,
        check_out_date: formattedCheckOut,
        nights: formData.nights,
        adults: formData.adults,
        children: formData.kids,
        total_amount: totalAmount,
        status: 'checked_in',
        guest_province: formData.province,
        guest_city: formData.city,
        guest_country: formData.country,
        arriving_from: formData.arrivingFrom,
        next_destination: formData.nextDestination,
        booking_source: formData.referral,
        referral_source: formData.referral,
        marketing_consent: formData.popiaConsent,
        food_restrictions: foodRestrictions,
        created_at: new Date().toISOString(),
        source: 'live_checkin'
      };

      const result = await checkinService.saveBooking(dbBooking);
      if (!result.success) {
        alert(t('error_booking_failed'));
        setLoading(false);
        return;
      }

      if (result.isDuplicate) {
        setDuplicateWarning(t('warning_duplicate_booking'));
      }

      const accessToken = await checkinService.saveIndemnityRecord(
        result.bookingId!,
        businessId!,
        fullName,
        formData.firstName,
        formData.lastName,
        formData.passportOrId,
        formData.signature
      );

      checkinService.sendConfirmationEmail(dbBooking, accessToken || undefined);
      if (formData.saveDetails) {
        saveGuestProfile();
      }

      const newBooking: Booking = {
        id: result.bookingId || Math.random().toString(36).substr(2, 9),
        guestName: fullName,
        email: formData.email.toLowerCase().trim(),
        phone: formData.phone,
        country: formData.country,
        city: formData.city,
        province: formData.province,
        passportOrId: formData.passportOrId,
        arrivingFrom: formData.arrivingFrom,
        nextDestination: formData.nextDestination,
        checkInDate: formattedCheckIn,
        checkOutDate: formattedCheckOut,
        nights: formData.nights,
        adults: formData.adults,
        kids: formData.kids,
        guests: formData.adults + formData.kids,
        settlementMethod: formData.settlement as any,
        referralSource: formData.referral as any,
        roomType: 'Suite',
        totalAmount: totalAmount,
        status: 'Checked-In',
        year: new Date().getFullYear(),
        month: new Date().toLocaleString('default', { month: 'short' }),
        signatureData: formData.signature,
        idPhotoData: formData.idPhoto,
        popiaMarketingConsent: formData.popiaConsent,
        timestamp: new Date().toISOString(),
        tenantId: businessId || 'default',
        source: 'live_checkin',
        food_restrictions: foodRestrictions
      };

      onComplete(newBooking, accessToken || undefined);
      setStep(5);

    } catch (error) {
      console.error('❌ Unexpected error during check-in:', error);
      setNotification({ type: 'error', message: t('error_unexpected') });
    } finally {
      setLoading(false);
    }
  };

  // Camera functions
  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      setIsCameraActive(false);
      let message = "Camera access denied. ";
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          message += "Please grant camera permission.";
        } else if (err.name === 'NotFoundError') {
          message += "No camera found on this device.";
        } else {
          message += err.message;
        }
      }
      setCameraError(message);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && videoRef.current.videoWidth > 0) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setFormData(prev => ({ ...prev, idPhoto: dataUrl }));
        markTouched('idPhoto');
        if (cameraStream) {
          cameraStream.getTracks().forEach(track => track.stop());
          setCameraStream(null);
        }
        setIsCameraActive(false);
      }
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const retakePhoto = () => {
    setFormData(prev => ({ ...prev, idPhoto: '' }));
  };

  // Signature functions
  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      setFormData(prev => ({ ...prev, signature: '' }));
    }
  };

  const initSignaturePad = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let drawing = false;
    
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#000000';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    const getCoordinates = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height)
      };
    };
    
    const startDrawing = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      drawing = true;
      const { x, y } = getCoordinates(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };
    
    const draw = (e: MouseEvent | TouchEvent) => {
      if (!drawing) return;
      e.preventDefault();
      const { x, y } = getCoordinates(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    };
    
    const stopDrawing = () => {
      if (drawing) {
        drawing = false;
        const signatureData = canvas.toDataURL();
        setFormData(prev => ({ ...prev, signature: signatureData }));
        markTouched('signature');
      }
    };
    
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  };

  const resetForm = () => {
    setStep(1);
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      phone: '',
      passportOrId: '',
      country: '',
      city: '',
      province: '',
      arrivingFrom: '',
      nextDestination: '',
      settlement: '',
      arrivalDate: new Date().toISOString().split('T')[0],
      departureDate: '',
      nights: 1,
      adults: 1,
      kids: 0,
      referral: '',
      idPhoto: '',
      signature: '',
      acceptLegal: false,
      popiaConsent: false,
      saveDetails: false,
    });
    setHasScrolledToBottom(false);
    setSubmitAttempted(false);
    setHasDietaryRestrictions(null);
    setFoodRestrictions(DEFAULT_RESTRICTIONS);
    setShowRestrictionsPanel(false);
  };

  const getErrorClass = (field: keyof TouchedFields, validationPassed: boolean): string => {
    const isTouched = touched[field];
    const hasError = !validationPassed;
    
    if ((submitAttempted || isTouched) && hasError) {
      return 'border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500';
    }
    return 'border-stone-200 focus:ring-amber-500 focus:border-amber-500';
  };

  return {
    // State
    step,
    branding,
    loading,
    loadingBranding,
    loginLoading,
    submitAttempted,
    hasScrolledToBottom,
    profileLoaded,
    profileSaveSuccess,
    duplicateWarning,
    notification,
    formData,
    setFormData,
    touched,
    markTouched,
    foodRestrictions,
    setFoodRestrictions,
    hasDietaryRestrictions,
    setHasDietaryRestrictions,
    showRestrictionsPanel,
    setShowRestrictionsPanel,
    videoRef,
    canvasRef,
    indemnityRef,
    isCameraActive,
    cameraError,
    startCamera,
    capturePhoto,
    stopCamera,
    retakePhoto,
    clearSignature,
    initSignaturePad,
    handleIndemnityScroll,
    handleDietaryContinue,
    handleRestrictionsSave,
    handleSubmit,
    resetForm,
    updateFullName,
    getErrorClass,
  };
}
