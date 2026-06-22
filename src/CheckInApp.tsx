// src/CheckInApp.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { COUNTRIES, SETTLEMENT_METHODS } from './constants';
import { Booking } from './types';
import { getRegionsForCountry, getRegionTypeLabel } from './services/countryRegionService';
import { IndemnityText } from './components/IndemnityText';
import { useTranslation } from './i18n';

interface BusinessBranding {
  id: string;
  trading_name: string;
  registered_name: string;
  slogan?: string;
  logo_url?: string;
  hero_image_url?: string;
  primary_color?: string;
  secondary_color?: string;
  welcome_message?: string;
  phone?: string;
  email?: string;
  physical_address?: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
  };
  avg_price?: number;
  service_paused?: boolean;
}

interface CheckInFormProps {
  onComplete: (booking: Booking, indemnityToken?: string) => void;
  businessId?: string;
}

interface TouchedFields {
  firstName: boolean;
  lastName: boolean;
  passportOrId: boolean;
  phone: boolean;
  country: boolean;
  province: boolean;
  city: boolean;
  arrivalDate: boolean;
  nights: boolean;
  referral: boolean;
  arrivingFrom: boolean;      // ✅ NEW
  nextDestination: boolean;
  settlement: boolean;
  idPhoto: boolean;
  signature: boolean;
  acceptLegal: boolean;
}

const CheckInForm: React.FC<CheckInFormProps> = ({ onComplete, businessId: propBusinessId }) => {
  const { t, language } = useTranslation();
  
  console.log('✅ FASTCHECKIN FORM V10.0 - WITH PROPER ERROR HANDLING');

  const { businessId: urlBusinessId } = useParams<{ businessId: string }>();
  const businessId = propBusinessId || urlBusinessId;
  
  const [branding, setBranding] = useState<BusinessBranding | null>(null);
  const [loadingBranding, setLoadingBranding] = useState(!!businessId);
  const [loading, setLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  
  const [step, setStep] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const indemnityRef = useRef<HTMLDivElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  
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
    arrivingFrom: false,        // ✅ NEW
    nextDestination: false,
    settlement: false,
    idPhoto: false,
    signature: false,
    acceptLegal: false,
  });
  
  const [submitAttempted, setSubmitAttempted] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    fullName: '',
    phone: '',
    passportOrId: '',
    country: '',
    city: '',
    province: '',
    arrivingFrom: '',           // ✅ NEW
    nextDestination: '',
    settlement: '',
    arrivalDate: new Date().toISOString().split('T')[0],
    nights: 1,
    adults: 1,
    kids: 0,
    departureDate: '',
    referral: '',
    idPhoto: '',
    signature: '',
    acceptLegal: false,
    popiaConsent: false,
    saveDetails: false,
  });

  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

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

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }, 10);
    setSubmitAttempted(false);
  }, [step]);

  const updateFullName = (firstName: string, lastName: string): string => {
    return `${firstName} ${lastName}`.trim();
  };

  const availableRegions = formData.country ? getRegionsForCountry(formData.country) : null;
  const regionTypeLabel = formData.country ? getRegionTypeLabel(formData.country) : 'Region';

  const validateStep2 = (): string[] => {
    const errors: string[] = [];
    
    if (!formData.firstName.trim()) errors.push(t('checkin_first_name'));
    if (!formData.lastName.trim()) errors.push(t('checkin_last_name'));
    if (!formData.passportOrId.trim()) errors.push(t('checkin_passport'));
    if (!formData.phone.trim()) errors.push(t('checkin_phone'));
    if (!formData.country) errors.push(t('checkin_country'));
    if (!formData.province) errors.push(regionTypeLabel);
    if (!formData.city.trim()) errors.push(t('checkin_city'));
    if (!formData.arrivingFrom.trim()) errors.push('Arriving From');    // ✅ NEW
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

  const markTouched = (field: keyof TouchedFields) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const getErrorClass = (field: keyof TouchedFields, validationPassed: boolean): string => {
    const isTouched = touched[field];
    const hasError = !validationPassed;
    
    if ((submitAttempted || isTouched) && hasError) {
      return 'border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500';
    }
    return 'border-stone-200 focus:ring-amber-500 focus:border-amber-500';
  };

  const ErrorMessage = ({ field, message }: { field: keyof TouchedFields; message: string }) => {
    const showError = submitAttempted || touched[field];
    
    if (!showError) return null;
    
    const isValid = (): boolean => {
      switch(field) {
        case 'firstName': return !!formData.firstName.trim();
        case 'lastName': return !!formData.lastName.trim();
        case 'passportOrId': return !!formData.passportOrId.trim();
        case 'phone': return !!formData.phone.trim();
        case 'country': return !!formData.country;
        case 'province': return !!formData.province;
        case 'city': return !!formData.city.trim();
        case 'arrivingFrom': return !!formData.arrivingFrom.trim();    // ✅ NEW
        case 'arrivalDate': return !!formData.arrivalDate;
        case 'nights': return formData.nights >= 1;
        case 'referral': return !!formData.referral;
        case 'nextDestination': return !!formData.nextDestination.trim();
        case 'settlement': return !!formData.settlement;
        case 'idPhoto': return !!formData.idPhoto;
        case 'signature': return !!formData.signature;
        case 'acceptLegal': return formData.acceptLegal;
        default: return true;
      }
    };
    
    if (isValid()) return null;
    
    return (
      <p className="text-red-500 text-xs mt-1 flex items-center gap-1 animate-fade-in">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {message}
      </p>
    );
  };

  const calculateTotalAmount = async (nights: number): Promise<number> => {
    try {
      if (businessId) {
        const response = await fetch(`/.netlify/functions/get-business-branding?id=${businessId}`);
        const businessData = await response.json();
        const roomPrice = businessData.avg_price || 1500;
        return nights * roomPrice;
      }
      return nights * 1500;
    } catch (error) {
      console.error('Error getting room price:', error);
      return nights * 1500;
    }
  };

  useEffect(() => {
    if (businessId) {
      fetchBusinessBranding();
    }
  }, [businessId]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const fetchBusinessBranding = async () => {
    try {
      console.log('📡 Fetching business branding for ID:', businessId);
      setLoadingBranding(true);
      
      const response = await fetch(`/.netlify/functions/get-business-branding?id=${businessId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Business branding received');
        console.log('✅ Trading name:', data.trading_name);
        console.log('✅ Logo URL exists:', !!data.logo_url);
        setBranding(data);
      } else {
        console.error('❌ Failed to fetch branding:', response.status);
      }
    } catch (error) {
      console.error('Error fetching business branding:', error);
    } finally {
      setLoadingBranding(false);
    }
  };

  useEffect(() => {
    if (formData.arrivalDate && formData.nights) {
      const date = new Date(formData.arrivalDate);
      date.setDate(date.getDate() + parseInt(formData.nights.toString()));
      setFormData(prev => ({ ...prev, departureDate: date.toISOString().split('T')[0] }));
    }
  }, [formData.arrivalDate, formData.nights]);

  // Load guest profile when email is entered
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.email && formData.email.includes('@')) {
        loadGuestProfile(formData.email);
      }
    }, 800);
    
    return () => clearTimeout(timer);
  }, [formData.email]);

  const loadGuestProfile = async (email: string) => {
    if (!email || !email.includes('@')) {
      console.log('ℹ️ Invalid email, skipping profile load');
      return;
    }
    
    try {
      const normalizedEmail = email.toLowerCase().trim();
      console.log('🔍 Loading guest profile for email:', normalizedEmail);
      
      const response = await fetch(`/.netlify/functions/get-guest-profile?email=${encodeURIComponent(normalizedEmail)}`);
      const data = await response.json();
      console.log('📡 Profile API response:', response.status);
      
      if (response.ok && data.profile) {
        console.log('✅ Profile found');
        
        let firstName = data.profile.first_name || '';
        let lastName = data.profile.last_name || '';
        
        if (!firstName && data.profile.full_name) {
          const nameParts = data.profile.full_name.split(' ');
          firstName = nameParts[0] || '';
          lastName = nameParts.slice(1).join(' ') || '';
        }
        
        setFormData(prev => ({
          ...prev,
          firstName: firstName,
          lastName: lastName,
          phone: data.profile.phone || prev.phone,
          passportOrId: data.profile.passport_or_id || prev.passportOrId,
          country: data.profile.country || prev.country,
          city: data.profile.city || prev.city,
          province: data.profile.province || prev.province,
        }));
        
        setProfileLoaded(true);
        setTimeout(() => setProfileLoaded(false), 3000);
      } else {
        console.log('ℹ️ No profile found for this email');
      }
    } catch (error) {
      console.error('❌ Error loading guest profile:', error);
    }
  };

  const saveGuestProfile = async (): Promise<void> => {
    if (!formData.saveDetails) {
      console.log('ℹ️ User opted not to save details');
      return;
    }
    
    if (!formData.email || !formData.email.includes('@')) {
      console.log('ℹ️ No valid email, skipping profile save');
      return;
    }
    
    try {
      const normalizedEmail = formData.email.toLowerCase().trim();
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      
      console.log('💾 Saving guest profile for email:', normalizedEmail);
      
      const response = await fetch('/.netlify/functions/save-guest-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          profileData: {
            fullName: fullName,
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            passportOrId: formData.passportOrId,
            country: formData.country,
            city: formData.city,
            province: formData.province
          }
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('✅ Guest profile saved successfully');
        setProfileSaveSuccess(true);
        setTimeout(() => setProfileSaveSuccess(false), 3000);
      } else {
        console.error('❌ Failed to save profile:', result.error);
      }
    } catch (error) {
      console.error('❌ Error saving profile (non-critical):', error);
    }
  };

  const handleIndemnityScroll = () => {
    if (indemnityRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = indemnityRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 20) {
        setHasScrolledToBottom(true);
      }
    }
  };

  // Camera functions
  const startCamera = async () => {
    console.log("📷 startCamera called");
    setCameraError(null);
    setIsCameraActive(true);
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
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
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
            .then(() => console.log("✅ Video playing successfully!"))
            .catch(err => console.error("Video play error:", err));
        };
      }
    } catch (err) {
      console.error("Camera error:", err);
      setIsCameraActive(false);
      let errorMessage = "Camera access denied. ";
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage += "Please grant camera permission.";
        } else if (err.name === 'NotFoundError') {
          errorMessage += "No camera found on this device.";
        } else {
          errorMessage += err.message;
        }
      }
      setCameraError(errorMessage);
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
        console.log("Photo captured and saved");
      }
    } else {
      alert("Camera not ready. Please try again.");
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

  // Signature pad functions
  const clearCanvas = () => {
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

  useEffect(() => { 
    if (step === 3) {
      setTimeout(() => {
        if (canvasRef.current) initSignaturePad(canvasRef.current);
      }, 500);
    } 
  }, [step]);

  const saveBookingToDatabase = async (booking: any) => {
    console.log('🔗 saveBookingToDatabase called');
    console.log('📤 Booking data being sent:', booking);
    
    try {
      const response = await fetch('/.netlify/functions/create-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(booking)
      });
      
      console.log('📡 Response status:', response.status);
      const result = await response.json();
      console.log('📡 Response body:', JSON.stringify(result, null, 2));
      
      if (!response.ok) {
        console.error('❌ HTTP error:', response.status);
        return { success: false, error: `HTTP ${response.status}` };
      }
      
      if (result.success === true) {
        return { 
          success: true, 
          bookingId: result.booking?.id,
          isDuplicate: result.duplicate === true
        };
      }
      
      if (result.booking?.id) {
        return { 
          success: true, 
          bookingId: result.booking.id,
          isDuplicate: false
        };
      }
      
      console.error('❌ Unexpected response format:', result);
      return { success: false, error: result.error || 'Unexpected response format' };
      
    } catch (error) {
      console.error('❌ Network error saving booking:', error);
      return { success: false, error };
    }
  };

  const saveIndemnityRecord = async (bookingId: string) => {
    try {
      const response = await fetch('/.netlify/functions/create-indemnity-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          business_id: businessId,
          guest_name: updateFullName(formData.firstName, formData.lastName),
          guest_first_name: formData.firstName,
          guest_last_name: formData.lastName,
          passport_or_id: formData.passportOrId,
          signature_data: formData.signature,
          signed_at: new Date().toISOString()
        })
      });
      
      const result = await response.json();
      console.log('📡 Indemnity response:', result);
      return result.access_token;
    } catch (error) {
      console.error('Error saving indemnity record:', error);
      return null;
    }
  };

  const sendConfirmationEmail = async (booking: any, indemnityToken?: string): Promise<void> => {
    try {
      const response = await fetch('/.netlify/functions/send-confirmation-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...booking,
          business_name: branding?.trading_name || 'our establishment',
          indemnity_token: indemnityToken
        })
      });
      
      if (response.ok) {
        console.log('✅ Confirmation email sent');
        setNotification({ type: 'success', message: t('success_email_sent') });
      } else {
        console.warn('⚠️ Email sending failed with status:', response.status);
        setNotification({ type: 'error', message: t('error_email_failed') });
      }
    } catch (error) {
      console.warn('⚠️ Email error (non-critical):', error);
      setNotification({ type: 'error', message: t('error_email_failed') });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔵 handleSubmit called, step:', step);
    
    if (loading) return;
    
    if (step === 1) {
      console.log('🔵 Step 1: Moving to step 2');
      setLoginLoading(true);
      setTimeout(() => setLoginLoading(false), 500);
      setStep(2);
      return;
    }
    
    if (step === 2) {
      console.log('🔵 Step 2: Validating personal details');
      const errors = validateStep2();
      if (errors.length > 0) {
        console.log('🔵 Validation errors:', errors);
        setSubmitAttempted(true);
        
        const allFields: (keyof TouchedFields)[] = [
          'firstName', 'lastName', 'passportOrId', 'phone', 'country', 
          'province', 'city', 'arrivalDate', 'nights', 'referral', 
          'arrivingFrom', 'nextDestination', 'settlement'
        ];
        allFields.forEach(field => markTouched(field));
        
        const firstErrorField = document.querySelector('.border-red-500');
        if (firstErrorField) {
          firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        alert(`${t('error_required_fields')}: ${errors.join(', ')}`);
        return;
      }
      console.log('🔵 Validation passed, moving to step 3');
      setStep(3);
      return;
    }
    
    if (step === 3) {
      console.log('🔵 Step 3: Validating indemnity and submitting');
      const errors = validateStep3();
      if (errors.length > 0) {
        console.log('🔵 Indemnity validation errors:', errors);
        setSubmitAttempted(true);
        setTouched(prev => ({
          ...prev,
          idPhoto: true,
          signature: true,
          acceptLegal: true,
        }));
        
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

      setLoading(true);
      console.log('🔵 Starting booking submission...');

      try {
        const totalAmount = await calculateTotalAmount(formData.nights);
        const formattedCheckInDate = formData.arrivalDate.split('T')[0];
        const formattedCheckOutDate = formData.departureDate ? formData.departureDate.split('T')[0] : '';
        const fullName = updateFullName(formData.firstName, formData.lastName);
        
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
          check_in_date: formattedCheckInDate,
          check_out_date: formattedCheckOutDate,
          nights: formData.nights,
          adults: formData.adults,
          children: formData.kids,
          total_amount: totalAmount,
          status: 'checked_in',
          guest_province: formData.province,
          guest_city: formData.city,
          guest_country: formData.country,
          arriving_from: formData.arrivingFrom,               // ✅ NEW
          next_destination: formData.nextDestination,
          booking_source: formData.referral,
          referral_source: formData.referral,
          marketing_consent: formData.popiaConsent,
          created_at: new Date().toISOString(),
          source: 'live_checkin'
        };

        console.log('🔗 Saving booking to database...');
        const saveResult = await saveBookingToDatabase(dbBooking);
        
        if (!saveResult.success) {
          console.error('❌ Booking save failed:', saveResult.error);
          alert(t('error_booking_failed'));
          setLoading(false);
          return;
        }

        const bookingId = saveResult.bookingId;
        console.log('✅ Booking saved with ID:', bookingId);
        
        if (saveResult.isDuplicate) {
          console.log('⚠️ Duplicate booking detected');
          setDuplicateWarning(t('warning_duplicate_booking'));
        }

        console.log('🔗 Saving indemnity record...');
        const accessToken = await saveIndemnityRecord(bookingId);
        console.log('✅ Indemnity token:', accessToken);

        console.log('🔗 Starting non-critical tasks (email, profile)...');
        sendConfirmationEmail(dbBooking, accessToken);
        
        if (formData.saveDetails) {
          saveGuestProfile();
        }

        const newBooking: Booking = {
          id: bookingId || Math.random().toString(36).substr(2, 9),
          guestName: fullName,
          email: formData.email.toLowerCase().trim(),
          phone: formData.phone,
          country: formData.country,
          city: formData.city,
          province: formData.province,
          passportOrId: formData.passportOrId,
          arrivingFrom: formData.arrivingFrom,              // ✅ NEW
          nextDestination: formData.nextDestination,
          checkInDate: formattedCheckInDate,
          checkOutDate: formattedCheckOutDate,
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
        };

        console.log('✅ Check-in complete! Calling onComplete...');

        if (onComplete && typeof onComplete === 'function') {
          try {
            onComplete(newBooking, accessToken);
          } catch (callbackError) {
            console.warn('⚠️ onComplete callback error (non-critical):', callbackError);
          }
        } else {
          console.warn('⚠️ onComplete is not a function or undefined, skipping callback');
        }

        sendConfirmationEmail(dbBooking, accessToken).catch(e => console.warn('Email error:', e));

        if (formData.saveDetails) {
          saveGuestProfile().catch(e => console.warn('Profile save error:', e));
        }

        setStep(4);
        setLoading(false);
        return;

      } catch (error) {
        console.error('❌ Unexpected error during check-in:', error);
        setNotification({ type: 'error', message: t('error_unexpected') });
      } finally {
        setLoading(false);
      }
    }
  };

  const primaryColor = branding?.primary_color || '#f59e0b';
  const secondaryColor = branding?.secondary_color || '#1e1e1e';
  const businessName = branding?.trading_name || 'our establishment';
  const welcomeMessage = branding?.welcome_message || 'Welcome to our establishment';
  const businessSlogan = branding?.slogan || '';
  const heroImage = branding?.hero_image_url;
  const businessLocation = branding?.physical_address 
    ? `${branding.physical_address.city}, ${branding.physical_address.province}`
    : '';

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Duplicate Warning Toast */}
      {duplicateWarning && (
        <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
          <div className="bg-yellow-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{duplicateWarning}</span>
          </div>
        </div>
      )}

      {/* General Notification Toast */}
      {notification && (
        <div className="fixed bottom-4 left-4 z-50 animate-fade-in">
          <div className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
            notification.type === 'success' ? 'bg-green-500 text-white' :
            notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
          }`}>
            {notification.type === 'success' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {notification.type === 'error' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto py-10 px-4">
        {/* Business Header */}
        {businessId && branding && (
          <div className="text-center mb-8">
            {branding.logo_url ? (
              <div className="flex justify-center mb-4">
                <img 
                  src={branding.logo_url} 
                  alt={businessName}
                  className="logo-high-res"
                  style={{
                    maxHeight: '120px',
                    maxWidth: '280px',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                    imageRendering: 'auto'
                  }}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    console.error('Logo failed to load - image may be too large');
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent && !parent.querySelector('.logo-fallback')) {
                      const fallback = document.createElement('h1');
                      fallback.className = 'text-3xl font-bold mb-2 logo-fallback';
                      fallback.style.color = secondaryColor;
                      fallback.textContent = businessName;
                      parent.appendChild(fallback);
                    }
                  }}
                  onLoad={() => console.log('Logo loaded successfully')}
                />
              </div>
            ) : (
              <h1 className="text-3xl font-bold mb-2" style={{ color: secondaryColor }}>
                {businessName}
              </h1>
            )}
            {branding.logo_url && (
              <h1 
                className="text-3xl font-bold mb-2 logo-fallback-hidden" 
                style={{ color: secondaryColor, display: 'none' }}
              >
                {businessName}
              </h1>
            )}
            {businessSlogan && (
              <p className="text-stone-500 italic text-lg">{businessSlogan}</p>
            )}
            {businessLocation && (
              <p className="text-stone-400 text-sm mt-1 flex items-center justify-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {businessLocation}
              </p>
            )}
            <p className="text-stone-500 italic mt-2">{welcomeMessage}</p>
          </div>
        )}

        {/* Progress Steps - Hide on success screen */}
        {step !== 4 && (
          <div className="flex justify-center mb-8 items-center space-x-2">
            {[1, 2, 3].map(s => (
              <React.Fragment key={s}>
                <div 
                  className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold transition-all ${
                    step >= s 
                      ? 'text-white shadow-lg' 
                      : 'bg-stone-200 text-stone-500'
                  }`}
                  style={step >= s ? { backgroundColor: primaryColor } : {}}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div 
                    className={`w-16 h-0.5 transition-all ${
                      step > s ? 'bg-stone-900' : 'bg-stone-200'
                    }`}
                    style={step > s ? { backgroundColor: secondaryColor } : {}}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Success Screen - Step 4 */}
        {step === 4 && (
          <div className="bg-white shadow-2xl rounded-[2.5rem] overflow-hidden border border-stone-100 p-10 md:p-16 text-center animate-fade-in flex flex-col items-center justify-center min-h-[700px]">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-3xl font-serif font-bold text-stone-900 mb-4">
              {t('success_checkin_complete')}
            </h2>
            
            <p className="text-lg text-stone-600 mb-2">
              {t('success_welcome', { businessName })}
            </p>
            
            <p className="text-stone-500 mb-8">
              {t('success_email_sent', { email: formData.email })}
            </p>
            
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 max-w-md mx-auto mb-8 text-left">
              <h3 className="font-bold text-amber-800 mb-2">{t('success_next_steps')}</h3>
              <ul className="text-sm text-amber-700 space-y-2">
                <li>✓ {t('success_step_checkin_recorded')}</li>
                <li>✓ {t('success_step_email_sent')}</li>
                <li>✓ {t('success_step_keys')}</li>
              </ul>
            </div>
            
            <button
              onClick={() => {
                setStep(1);
                setFormData({
                  email: '',
                  firstName: '',
                  lastName: '',
                  fullName: '',
                  phone: '',
                  passportOrId: '',
                  country: '',
                  city: '',
                  province: '',
                  arrivingFrom: '',           // ✅ NEW
                  nextDestination: '',
                  settlement: '',
                  arrivalDate: new Date().toISOString().split('T')[0],
                  nights: 1,
                  adults: 1,
                  kids: 0,
                  departureDate: '',
                  referral: '',
                  idPhoto: '',
                  signature: '',
                  acceptLegal: false,
                  popiaConsent: false,
                  saveDetails: false,
                });
                setHasScrolledToBottom(false);
                setSubmitAttempted(false);
              }}
              className="bg-amber-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-amber-700 transition-all shadow-md text-sm uppercase tracking-wider"
            >
              {t('success_new_guest_button')}
            </button>
          </div>
        )}

        {/* Main Form - Hide on success screen */}
        {step !== 4 && (
          <form onSubmit={handleSubmit} className="bg-white shadow-2xl rounded-[2.5rem] overflow-hidden border border-stone-100 flex flex-col min-h-[700px]">
            
            {/* Step 1 - Email Entry */}
            {step === 1 && (
              <div className="p-10 md:p-16 text-center animate-fade-in flex flex-col flex-grow items-center justify-center">
                <h2 className="text-sm font-bold tracking-[0.3em] text-amber-700 uppercase mb-4">
                  {t('checkin_title')}
                </h2>
                <h1 className="text-5xl font-serif text-stone-900 mb-6 uppercase tracking-tight">
                  {t('common_welcome_home')}
                </h1>
                {businessSlogan && !heroImage && (
                  <p className="text-xl text-stone-500 mb-8 italic font-serif">{businessSlogan}</p>
                )}
                <p className="text-xl text-stone-500 mb-12 italic font-serif opacity-80">{businessName}</p>
                
                <div className="max-w-md w-full mx-auto space-y-8 text-left">
                  <div className="space-y-3">
                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                      {t('checkin_email_label')}
                    </label>
                    <input 
                      required 
                      type="email" 
                      className="w-full border-b border-stone-200 py-3 outline-none focus:border-stone-900 transition-colors text-xl font-serif"
                      style={{ focusBorderColor: secondaryColor }}
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                    
                    {profileLoaded && (
                      <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm animate-fade-in">
                        ✓ {t('checkin_profile_loaded')}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-3 p-4 bg-stone-50 rounded-xl border border-stone-200">
                    <input
                      type="checkbox"
                      id="saveDetails"
                      className="w-5 h-5 rounded border-stone-300 focus:ring-stone-900"
                      style={{ accentColor: primaryColor }}
                      checked={formData.saveDetails}
                      onChange={e => setFormData({...formData, saveDetails: e.target.checked})}
                    />
                    <label htmlFor="saveDetails" className="text-sm text-stone-700 cursor-pointer">
                      <span className="font-bold">{t('checkin_save_details')}</span>
                      <span className="text-xs text-stone-500 block">{t('checkin_save_details_sub')}</span>
                    </label>
                  </div>
                  
                  {profileSaveSuccess && (
                    <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50 animate-fade-in">
                      ✓ {t('checkin_profile_saved')}
                    </div>
                  )}

                  <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200 flex items-start gap-4">
                    <input 
                      type="checkbox" 
                      id="popia" 
                      className="mt-1 w-5 h-5 rounded border-stone-300 focus:ring-stone-900"
                      style={{ accentColor: primaryColor }}
                      checked={formData.popiaConsent}
                      onChange={e => setFormData({...formData, popiaConsent: e.target.checked})}
                    />
                    <label htmlFor="popia" className="text-xs text-stone-500 leading-relaxed cursor-pointer select-none">
                      {t('checkin_popia_consent', { businessName })}
                    </label>
                  </div>
                </div>
                
                <button 
                  type="submit" 
                  disabled={loginLoading}
                  className="mt-16 text-white px-14 py-5 rounded-full font-bold hover:opacity-90 transition-all uppercase tracking-widest text-[10px] shadow-2xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  style={{ backgroundColor: secondaryColor }}
                >
                  {loginLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {t('common_processing')}
                    </>
                  ) : (
                    t('checkin_begin_button')
                  )}
                </button>
              </div>
            )}

            {/* Step 2 - Personal Details */}
            {step === 2 && (
              <div className="p-10 md:p-16 animate-fade-in flex-grow overflow-y-auto">
                {submitAttempted && validateStep2().length > 0 && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl animate-fade-in">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="font-semibold text-red-800 text-sm">{t('error_complete_fields')}</p>
                        <ul className="text-red-700 text-xs mt-1 list-disc list-inside">
                          {validateStep2().map(err => (
                            <li key={err}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-b border-stone-100 pb-8 mb-10">
                  <h2 className="text-3xl font-serif font-bold text-stone-900">{t('checkin_personal_details')}</h2>
                  <p className="text-stone-400 text-[10px] mt-2 uppercase tracking-[0.2em] font-bold">{t('checkin_immigration_act')}</p>
                  <p className="text-red-500 text-xs mt-2">* {t('error_all_required')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                  {/* First Name and Last Name */}
                  <div className="grid grid-cols-2 gap-6 col-span-full">
                    <div className="space-y-1 group">
                      <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">
                        {t('checkin_first_name')} <span className="text-red-500">*</span>
                      </label>
                      <input 
                        required 
                        type="text" 
                        className={`w-full border-b py-3 outline-none focus:border-stone-900 text-lg font-serif transition-colors ${getErrorClass('firstName', !!formData.firstName.trim())}`}
                        value={formData.firstName} 
                        onFocus={() => markTouched('firstName')}
                        onChange={e => {
                          const newFirstName = e.target.value;
                          setFormData({
                            ...formData, 
                            firstName: newFirstName,
                            fullName: `${newFirstName} ${formData.lastName}`.trim()
                          });
                        }} 
                      />
                      <ErrorMessage field="firstName" message={t('error_first_name_required')} />
                    </div>
                    
                    <div className="space-y-1 group">
                      <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">
                        {t('checkin_last_name')} <span className="text-red-500">*</span>
                      </label>
                      <input 
                        required 
                        type="text" 
                        className={`w-full border-b py-3 outline-none focus:border-stone-900 text-lg font-serif transition-colors ${getErrorClass('lastName', !!formData.lastName.trim())}`}
                        value={formData.lastName} 
                        onFocus={() => markTouched('lastName')}
                        onChange={e => {
                          const newLastName = e.target.value;
                          setFormData({
                            ...formData, 
                            lastName: newLastName,
                            fullName: `${formData.firstName} ${newLastName}`.trim()
                          });
                        }} 
                      />
                      <ErrorMessage field="lastName" message={t('error_last_name_required')} />
                    </div>
                  </div>

                  {/* Passport/ID */}
                  <div className="space-y-1 group">
                    <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">
                      {t('checkin_passport')} <span className="text-red-500">*</span>
                    </label>
                    <input 
                      required 
                      type="text" 
                      className={`w-full border-b py-3 outline-none focus:border-stone-900 text-lg font-mono transition-colors ${getErrorClass('passportOrId', !!formData.passportOrId.trim())}`} 
                      value={formData.passportOrId} 
                      onFocus={() => markTouched('passportOrId')}
                      onChange={e => setFormData({...formData, passportOrId: e.target.value})} 
                    />
                    <ErrorMessage field="passportOrId" message={t('error_passport_required')} />
                  </div>
                  
                  {/* Phone */}
                  <div className="space-y-1 group">
                    <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">
                      {t('checkin_phone')} <span className="text-red-500">*</span>
                    </label>
                    <input 
                      required 
                      type="tel" 
                      className={`w-full border-b py-3 outline-none focus:border-stone-900 text-lg transition-colors ${getErrorClass('phone', !!formData.phone.trim())}`} 
                      value={formData.phone} 
                      onFocus={() => markTouched('phone')}
                      onChange={e => setFormData({...formData, phone: e.target.value})} 
                    />
                    <ErrorMessage field="phone" message={t('error_phone_required')} />
                  </div>
                  
                  {/* Country */}
                  <div className="space-y-1 group">
                    <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">
                      {t('checkin_country')} <span className="text-red-500">*</span>
                    </label>
                    <select 
                      required 
                      className={`w-full border-b py-3 outline-none focus:border-stone-900 bg-transparent text-lg transition-colors ${getErrorClass('country', !!formData.country)}`}
                      value={formData.country} 
                      onFocus={() => markTouched('country')}
                      onChange={e => {
                        setFormData({...formData, country: e.target.value, province: ''});
                      }}
                    >
                      <option value="">{t('checkin_select_country')}</option>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ErrorMessage field="country" message={t('error_country_required')} />
                  </div>

                  {/* Province/Region */}
                  <div className={`space-y-1 group transition-all duration-300 ${formData.country ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                    <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">
                      {regionTypeLabel} <span className="text-red-500">*</span>
                    </label>
                    {availableRegions && availableRegions.length > 0 ? (
                      <select 
                        required 
                        className={`w-full border-b py-3 outline-none focus:border-stone-900 bg-transparent text-lg transition-colors ${getErrorClass('province', !!formData.province)}`}
                        value={formData.province} 
                        onFocus={() => markTouched('province')}
                        onChange={e => setFormData({...formData, province: e.target.value})}
                        disabled={!formData.country}
                      >
                        <option value="">{t('checkin_select_province')}</option>
                        {availableRegions.map(region => (
                          <option key={region} value={region}>{region}</option>
                        ))}
                      </select>
                    ) : (
                      <input 
                        required 
                        type="text" 
                        placeholder={`${t('checkin_enter_province')}`}
                        className={`w-full border-b py-3 outline-none focus:border-stone-900 text-lg font-serif transition-colors ${getErrorClass('province', !!formData.province)}`}
                        value={formData.province} 
                        onFocus={() => markTouched('province')}
                        onChange={e => setFormData({...formData, province: e.target.value})} 
                        disabled={!formData.country}
                      />
                    )}
                    <ErrorMessage field="province" message={`${regionTypeLabel} ${t('error_is_required')}`} />
                  </div>

                  {/* City */}
                  <div className="space-y-1 group">
                    <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">
                      {t('checkin_city')} <span className="text-red-500">*</span>
                    </label>
                    <input 
                      required 
                      type="text" 
                      className={`w-full border-b py-3 outline-none focus:border-stone-900 text-lg font-serif transition-colors ${getErrorClass('city', !!formData.city.trim())}`} 
                      value={formData.city} 
                      onFocus={() => markTouched('city')}
                      onChange={e => setFormData({...formData, city: e.target.value})} 
                    />
                    <ErrorMessage field="city" message={t('error_city_required')} />
                  </div>

                  {/* ✅ NEW: Arriving From - Where the guest traveled from */}
                  <div className="space-y-1 group col-span-full">
                    <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">
                      Arriving From <span className="text-red-500">*</span>
                    </label>
                    <input 
                      required 
                      type="text" 
                      placeholder="e.g., Johannesburg, Cape Town, Gaborone..."
                      className={`w-full border-b border-stone-200 py-3 outline-none focus:border-stone-900 text-lg italic transition-colors ${getErrorClass('arrivingFrom', !!formData.arrivingFrom.trim())}`}
                      value={formData.arrivingFrom} 
                      onFocus={() => markTouched('arrivingFrom')}
                      onChange={e => setFormData({...formData, arrivingFrom: e.target.value})} 
                    />
                    <p className="text-xs text-stone-400">Where did you travel from to reach us?</p>
                    <ErrorMessage field="arrivingFrom" message="Arriving from location is required" />
                  </div>

                  {/* Stay Details */}
                  <div className="grid grid-cols-2 gap-8 col-span-full bg-stone-50 p-8 rounded-3xl border border-stone-200">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest">{t('checkin_adults')}</label>
                      <input required type="number" min="1" className="w-full bg-transparent border-b border-stone-300 py-2 font-bold" value={formData.adults} onChange={e => setFormData({...formData, adults: parseInt(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest">{t('checkin_children')}</label>
                      <input required type="number" min="0" className="w-full bg-transparent border-b border-stone-300 py-2 font-bold" value={formData.kids} onChange={e => setFormData({...formData, kids: parseInt(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest">{t('checkin_arrival_date')} <span className="text-red-500">*</span></label>
                      <input 
                        required 
                        type="date" 
                        className={`w-full bg-transparent border-b py-2 font-bold transition-colors ${getErrorClass('arrivalDate', !!formData.arrivalDate)}`}
                        value={formData.arrivalDate} 
                        onFocus={() => markTouched('arrivalDate')}
                        onChange={e => setFormData({...formData, arrivalDate: e.target.value})} 
                      />
                      <ErrorMessage field="arrivalDate" message={t('error_arrival_date_required')} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest">{t('checkin_nights')} <span className="text-red-500">*</span></label>
                      <input 
                        required 
                        type="number" 
                        min="1" 
                        className={`w-full bg-transparent border-b py-2 font-bold transition-colors ${getErrorClass('nights', formData.nights >= 1)}`}
                        value={formData.nights} 
                        onFocus={() => markTouched('nights')}
                        onChange={e => setFormData({...formData, nights: parseInt(e.target.value)})} 
                      />
                      <ErrorMessage field="nights" message={t('error_nights_required')} />
                    </div>
                  </div>

                  {/* Referral Source */}
                  <div className="space-y-1 group col-span-full">
                    <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">
                      {t('checkin_referral')} <span className="text-red-500">*</span>
                    </label>
                    <select 
                      required
                      value={formData.referral}
                      onFocus={() => markTouched('referral')}
                      onChange={e => setFormData({...formData, referral: e.target.value})}
                      className={`w-full border-b border-stone-200 py-3 outline-none focus:border-stone-900 bg-transparent text-lg transition-colors ${getErrorClass('referral', !!formData.referral)}`}
                    >
                      <option value="">{t('checkin_select_referral')}</option>
                      <option value="Word of mouth">{t('checkin_referral_word_of_mouth')}</option>
                      <option value="Booking.com">Booking.com</option>
                      <option value="Google">Google</option>
                      <option value="Facebook / Instagram">Facebook / Instagram</option>
                      <option value="Travel Agency">{t('checkin_referral_travel_agency')}</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="YouTube">YouTube</option>
                      <option value="Research engine">{t('checkin_referral_research')}</option>
                      <option value="TikTok">TikTok</option>
                    </select>
                    <ErrorMessage field="referral" message={t('error_referral_required')} />
                  </div>

                  {/* Next Destination - Existing field */}
                  <div className="space-y-1 group col-span-full">
                    <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">
                      {t('checkin_next_destination')} <span className="text-red-500">*</span>
                    </label>
                    <input 
                      required 
                      type="text" 
                      placeholder={t('checkin_next_destination_placeholder')}
                      className={`w-full border-b border-stone-200 py-3 outline-none focus:border-stone-900 text-lg italic transition-colors ${getErrorClass('nextDestination', !!formData.nextDestination.trim())}`}
                      value={formData.nextDestination} 
                      onFocus={() => markTouched('nextDestination')}
                      onChange={e => setFormData({...formData, nextDestination: e.target.value})} 
                    />
                    <ErrorMessage field="nextDestination" message={t('error_next_destination_required')} />
                  </div>
                  
                  {/* Settlement Method */}
                  <div className="space-y-1 group col-span-full">
                    <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">
                      {t('checkin_settlement')} <span className="text-red-500">*</span>
                    </label>
                    <select 
                      required 
                      className={`w-full border-b border-stone-200 py-3 outline-none focus:border-stone-900 bg-transparent text-lg transition-colors ${getErrorClass('settlement', !!formData.settlement)}`}
                      value={formData.settlement} 
                      onFocus={() => markTouched('settlement')}
                      onChange={e => setFormData({...formData, settlement: e.target.value})}
                    >
                      <option value="">{t('checkin_select_settlement')}</option>
                      {SETTLEMENT_METHODS.filter(m => formData.country === 'South Africa' || m !== 'Instant EFT (RSA resident only)').map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <ErrorMessage field="settlement" message={t('error_settlement_required')} />
                  </div>
                </div>

                <div className="mt-16 flex justify-between">
                  <button type="button" onClick={() => setStep(1)} className="text-stone-400 font-bold hover:text-stone-800 uppercase text-[10px] tracking-widest">{t('common_back')}</button>
                  <button 
                    type="submit" 
                    className="text-white px-12 py-5 rounded-full font-bold hover:opacity-90 transition-all shadow-xl text-[10px] uppercase tracking-widest"
                    style={{ backgroundColor: secondaryColor }}
                  >
                    {t('checkin_continue_indemnity')}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3 - Indemnity & Signature */}
            {step === 3 && (
              <div className="p-10 md:p-16 animate-fade-in flex flex-col flex-grow">
                <h2 className="text-3xl font-serif font-bold text-stone-900 mb-8">{t('checkin_indemnity')}</h2>
                
                {submitAttempted && validateStep3().length > 0 && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl animate-fade-in">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="font-semibold text-red-800 text-sm">{t('error_complete_before_submit')}</p>
                        <ul className="text-red-700 text-xs mt-1 list-disc list-inside">
                          {!formData.idPhoto && <li>{t('error_id_photo_required')}</li>}
                          {!formData.signature && <li>{t('error_signature_required')}</li>}
                          {!formData.acceptLegal && <li>{t('error_indemnity_scroll')}</li>}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-10 flex-grow">
                  <div className="relative border border-stone-200 rounded-[2rem] overflow-hidden shadow-inner bg-white">
                    <div 
                      ref={indemnityRef}
                      onScroll={handleIndemnityScroll}
                      className="p-10 text-[12px] leading-relaxed text-stone-700 max-h-[500px] overflow-y-auto custom-scrollbar select-none"
                    >
                      {/* Indemnity Text Component - Already translated via props */}
                      <IndemnityText 
                        businessName={branding?.trading_name || 'our establishment'} 
                        showWarning={true}
                        showGuestDetails={true}
                        guestName={updateFullName(formData.firstName, formData.lastName)}
                        passportOrId={formData.passportOrId}
                      />

                      {/* Checkbox Section */}
                      <div className={`mt-12 p-8 rounded-3xl border-2 transition-all ${hasScrolledToBottom ? 'bg-amber-50 border-amber-500' : 'bg-stone-50 border-stone-200 opacity-50'}`}>
                        <div className="flex items-start gap-5">
                          <input 
                            type="checkbox" 
                            id="legalCheck" 
                            className={`w-8 h-8 rounded border-stone-300 focus:ring-amber-600 cursor-pointer disabled:cursor-not-allowed mt-1 ${getErrorClass('acceptLegal', formData.acceptLegal)}`}
                            disabled={!hasScrolledToBottom}
                            checked={formData.acceptLegal} 
                            onChange={e => {
                              setFormData({...formData, acceptLegal: e.target.checked});
                              markTouched('acceptLegal');
                            }} 
                          />
                          <label htmlFor="legalCheck" className={`text-base font-bold leading-relaxed select-none ${hasScrolledToBottom ? 'text-amber-900 cursor-pointer' : 'text-stone-400'}`}>
                            {t('indemnity_accept')}
                          </label>
                        </div>
                        <ErrorMessage field="acceptLegal" message={t('error_indemnity_required')} />
                      </div>

                      <div className="text-center text-stone-400 text-xs pt-4">
                        {t('indemnity_scroll_bottom')}
                      </div>
                    </div>
                    
                    {!hasScrolledToBottom && (
                      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-amber-600 text-white px-8 py-3 rounded-full text-[10px] font-bold animate-bounce shadow-2xl pointer-events-none uppercase tracking-widest z-10">
                        {t('indemnity_scroll_to_accept')}
                      </div>
                    )}
                  </div>

                  {/* Camera and Signature Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-4">
                    {/* LEFT COLUMN - CAMERA */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold uppercase text-stone-400 tracking-widest">
                        {t('checkin_id_photo')} <span className="text-red-500">*</span>
                      </h4>
                      
                      <div className={`aspect-[3/2] bg-stone-100 rounded-xl overflow-hidden border-2 transition-colors ${submitAttempted && !formData.idPhoto ? 'border-red-500' : 'border-dashed border-stone-300'}`}>
                        {formData.idPhoto ? (
                          <div className="relative w-full h-full">
                            <img src={formData.idPhoto} alt="Guest ID" className="w-full h-full object-cover" />
                            <div className="absolute top-2 right-2 flex gap-1">
                              <button 
                                onClick={retakePhoto} 
                                className="bg-blue-600 text-white p-1.5 rounded-full text-xs hover:bg-blue-700 transition-colors"
                                title="Retake photo"
                              >
                                ↻
                              </button>
                            </div>
                          </div>
                        ) : isCameraActive ? (
                          <div className="w-full h-full bg-black">
                            <video 
                              ref={videoRef} 
                              autoPlay 
                              playsInline 
                              muted
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-stone-100">
                            <svg className="w-12 h-12 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      {submitAttempted && !formData.idPhoto && (
                        <p className="text-red-500 text-xs flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {t('error_id_photo_required')}
                        </p>
                      )}

                      <div className="space-y-2">
                        {!formData.idPhoto && (
                          <>
                            {!isCameraActive ? (
                              <button 
                                type="button" 
                                onClick={startCamera} 
                                className="w-full bg-amber-500 text-white py-2.5 rounded-lg font-medium hover:bg-amber-600 transition-colors flex items-center justify-center gap-2 text-sm"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {t('common_open_camera')}
                              </button>
                            ) : (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={capturePhoto}
                                  className="flex-1 bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  {t('common_capture')}
                                </button>
                                <button
                                  type="button"
                                  onClick={stopCamera}
                                  className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2 text-sm"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  {t('common_cancel')}
                                </button>
                              </div>
                            )}
                            
                            <div className="text-center">
                              <label className="text-xs text-stone-500 cursor-pointer hover:text-amber-600 transition-colors">
                                📁 {t('common_upload_from_gallery')}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onloadend = () => {
                                        setFormData(prev => ({ ...prev, idPhoto: reader.result as string }));
                                        markTouched('idPhoto');
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                              </label>
                            </div>
                            
                            {cameraError && (
                              <div className="mt-2 p-2 bg-red-50 text-red-600 rounded-lg text-xs">
                                {cameraError}
                              </div>
                            )}
                          </>
                        )}
                        
                        {formData.idPhoto && (
                          <button
                            type="button"
                            onClick={retakePhoto}
                            className="w-full bg-stone-200 text-stone-700 py-2.5 rounded-lg font-medium hover:bg-stone-300 transition-colors flex items-center justify-center gap-2 text-sm"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {t('common_take_new_photo')}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* RIGHT COLUMN - SIGNATURE */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-[10px] font-bold uppercase text-stone-400 tracking-widest">
                          {t('checkin_signature')} <span className="text-red-500">*</span>
                        </h4>
                        <button type="button" onClick={clearCanvas} className="text-[10px] font-bold text-amber-700 uppercase hover:underline">{t('common_clear')}</button>
                      </div>
                      <canvas 
                        ref={canvasRef} 
                        className={`w-full h-32 bg-white border-2 rounded-xl cursor-crosshair touch-none transition-colors ${submitAttempted && !formData.signature ? 'border-red-500' : 'border-stone-200'}`}
                        style={{ touchAction: 'none' }}
                      />
                      {submitAttempted && !formData.signature && (
                        <p className="text-red-500 text-xs flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {t('error_signature_required')}
                        </p>
                      )}
                      <p className="text-xs text-stone-400">{t('checkin_signature_instruction')}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-between pt-6 border-t border-stone-100 items-center">
                  <button type="button" onClick={() => setStep(2)} className="text-stone-500 font-medium hover:text-stone-800 uppercase text-[10px] tracking-widest transition-colors">{t('common_back_to_details')}</button>
                  <button 
                    type="submit" 
                    disabled={loading || !hasScrolledToBottom}
                    className="bg-amber-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-amber-700 transition-all shadow-md text-sm uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? t('common_processing') : t('checkin_complete_button')}
                  </button>
                </div>
              </div>
            )}
          </form>
        )}
      </div>

      {/* Powered by FastCheckin Footer - Hide on success screen */}
      {step !== 4 && (
        <div className="text-center py-6 border-t border-stone-200 mt-8">
          <div className="flex items-center justify-center gap-2 text-stone-400 text-xs">
            <span>{t('common_powered_by')}</span>
            <img 
              src="/fastcheckin-logo.png" 
              alt="FastCheckin" 
              className="h-4 w-auto object-contain"
            />
            <span>FastCheckin</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckInForm;
