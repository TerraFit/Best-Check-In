import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { COUNTRIES, SETTLEMENT_METHODS } from '../constants';
import { Booking } from '../types';
import { getRegionsForCountry, getRegionTypeLabel } from '../services/countryRegionService';

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

// Track which fields have been touched for validation
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
  nextDestination: boolean;
  settlement: boolean;
  idPhoto: boolean;
  signature: boolean;
  acceptLegal: boolean;
}

const CheckInForm: React.FC<CheckInFormProps> = ({ onComplete, businessId: propBusinessId }) => {
  const { businessId: urlBusinessId } = useParams<{ businessId: string }>();
  const businessId = propBusinessId || urlBusinessId;
  
  const [branding, setBranding] = useState<BusinessBranding | null>(null);
  const [loadingBranding, setLoadingBranding] = useState(!!businessId);
  const [loading, setLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  
  const [step, setStep] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const indemnityRef = useRef<HTMLDivElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  
  // Track which fields have been touched for validation
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
    nextDestination: false,
    settlement: false,
    idPhoto: false,
    signature: false,
    acceptLegal: false,
  });
  
  // Track form submission attempts to show all errors at once
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

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }, 10);
    setSubmitAttempted(false);
  }, [step]);

  const updateFullName = (firstName: string, lastName: string) => {
    return `${firstName} ${lastName}`.trim();
  };

  const availableRegions = formData.country ? getRegionsForCountry(formData.country) : null;
  const regionTypeLabel = formData.country ? getRegionTypeLabel(formData.country) : 'Region';

  // Validation functions for Step 2
  const validateStep2 = () => {
    const errors: string[] = [];
    
    if (!formData.firstName.trim()) errors.push('First Name');
    if (!formData.lastName.trim()) errors.push('Last Name');
    if (!formData.passportOrId.trim()) errors.push('ID/Passport Number');
    if (!formData.phone.trim()) errors.push('Mobile Phone');
    if (!formData.country) errors.push('Country of Origin');
    if (!formData.province) errors.push(regionTypeLabel);
    if (!formData.city.trim()) errors.push('City/Town');
    if (!formData.arrivalDate) errors.push('Arrival Date');
    if (!formData.nights || formData.nights < 1) errors.push('Nights');
    if (!formData.referral) errors.push('Referral Source');
    if (!formData.nextDestination.trim()) errors.push('Next Destination');
    if (!formData.settlement) errors.push('Settlement Method');
    
    return errors;
  };

  // Validation for Step 3
  const validateStep3 = () => {
    const errors: string[] = [];
    
    if (!formData.idPhoto) errors.push('ID Photo');
    if (!formData.signature) errors.push('Digital Signature');
    if (!formData.acceptLegal) errors.push('Indemnity Acceptance');
    
    return errors;
  };

  // Mark a field as touched when user interacts with it
  const markTouched = (field: keyof TouchedFields) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  // Get error class for a field
  const getErrorClass = (field: keyof TouchedFields, validationPassed: boolean) => {
    const isTouched = touched[field];
    const hasError = !validationPassed;
    
    if (submitAttempted && hasError) {
      return 'border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500';
    }
    if (isTouched && hasError) {
      return 'border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500';
    }
    return 'border-stone-200 focus:ring-amber-500 focus:border-amber-500';
  };

  // Error message component
  const ErrorMessage = ({ field, message }: { field: keyof TouchedFields; message: string }) => {
    const showError = submitAttempted || touched[field];
    
    if (!showError) return null;
    
    const isValid = () => {
      switch(field) {
        case 'firstName': return formData.firstName.trim();
        case 'lastName': return formData.lastName.trim();
        case 'passportOrId': return formData.passportOrId.trim();
        case 'phone': return formData.phone.trim();
        case 'country': return formData.country;
        case 'province': return formData.province;
        case 'city': return formData.city.trim();
        case 'arrivalDate': return formData.arrivalDate;
        case 'nights': return formData.nights >= 1;
        case 'referral': return formData.referral;
        case 'nextDestination': return formData.nextDestination.trim();
        case 'settlement': return formData.settlement;
        case 'idPhoto': return formData.idPhoto;
        case 'signature': return formData.signature;
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

  // In src/components/CheckInForm.tsx, around line 320-340

const fetchBusinessBranding = async () => {
  try {
    console.log('📡 Fetching business branding for ID:', businessId);
    setLoadingBranding(true);
    
    const response = await fetch(`/.netlify/functions/get-business-branding?id=${businessId}`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Business branding received');
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
      console.log('🔍 Loading guest profile for email:', email);
      const response = await fetch(`/.netlify/functions/get-guest-profile?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      
      if (response.ok && data.profile) {
        console.log('✅ Profile found:', data.profile);
        
        // Extract first and last name
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
          fullName: data.profile.full_name || '',
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

  const saveGuestProfile = async () => {
    if (!formData.saveDetails) {
      console.log('ℹ️ User opted not to save details');
      return;
    }
    
    try {
      console.log('💾 Saving guest profile for email:', formData.email);
      
      const response = await fetch('/.netlify/functions/save-guest-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          profileData: {
            fullName: updateFullName(formData.firstName, formData.lastName),
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
      console.error('❌ Error saving profile:', error);
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

  // API functions
  const saveBookingToDatabase = async (booking: any) => {
    try {
      const response = await fetch('/.netlify/functions/create-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(booking)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        return { success: true, bookingId: result.booking?.id || result.id };
      } else {
        return { success: false, error: result };
      }
    } catch (error) {
      console.error('Error saving booking:', error);
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
      return result.access_token;
    } catch (error) {
      console.error('Error saving indemnity record:', error);
      return null;
    }
  };

  const sendConfirmationEmail = async (booking: any, indemnityToken?: string) => {
    try {
      const response = await fetch('/.netlify/functions/send-confirmation-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...booking,
          business_name: branding?.trading_name || businessName,
          indemnity_token: indemnityToken
        })
      });
      
      if (response.ok) {
        console.log('✅ Confirmation email sent');
      }
    } catch (error) {
      console.error('❌ Email error:', error);
    }
  };

  // Main submit handler with validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) return;
    
    if (step === 1) {
      setLoginLoading(true);
      setTimeout(() => setLoginLoading(false), 500);
      setStep(2);
      return;
    }
    
    if (step === 2) {
      const errors = validateStep2();
      if (errors.length > 0) {
        setSubmitAttempted(true);
        setTouched({
          firstName: true,
          lastName: true,
          passportOrId: true,
          phone: true,
          country: true,
          province: true,
          city: true,
          arrivalDate: true,
          nights: true,
          referral: true,
          nextDestination: true,
          settlement: true,
          idPhoto: false,
          signature: false,
          acceptLegal: false,
        });
        
        const firstErrorField = document.querySelector('.border-red-500');
        if (firstErrorField) {
          firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        alert(`Please complete the following required fields:\n\n• ${errors.join('\n• ')}`);
        return;
      }
      setStep(3);
      return;
    }
    
    if (step === 3) {
      const errors = validateStep3();
      if (errors.length > 0) {
        setSubmitAttempted(true);
        setTouched(prev => ({
          ...prev,
          idPhoto: true,
          signature: true,
          acceptLegal: true,
        }));
        
        if (!hasScrolledToBottom) {
          alert("Please scroll to the bottom of the indemnity agreement to enable acceptance.");
          indemnityRef.current?.scrollIntoView({ behavior: 'smooth' });
        } else if (!formData.signature) {
          alert("Please provide your digital signature.");
        } else if (!formData.idPhoto) {
          alert("Please take a photo of your ID/passport.");
        } else {
          alert(`Please complete the following:\n\n• ${errors.join('\n• ')}`);
        }
        return;
      }

      setLoading(true);

      try {
        const totalAmount = await calculateTotalAmount(formData.nights);
        const fullName = updateFullName(formData.firstName, formData.lastName);

        const dbBooking = {
          business_id: businessId,
          guest_name: fullName,
          guest_first_name: formData.firstName,
          guest_last_name: formData.lastName,
          guest_email: formData.email,
          guest_phone: formData.phone,
          guest_id_number: formData.passportOrId,
          guest_id_photo: formData.idPhoto,
          guest_signature: formData.signature,
          check_in_date: formData.arrivalDate,
          check_out_date: formData.departureDate,
          nights: formData.nights,
          adults: formData.adults,
          children: formData.kids,
          total_amount: totalAmount,
          status: 'checked_in',
          guest_province: formData.province,
          guest_city: formData.city,
          guest_country: formData.country,
          booking_source: formData.referral,
          referral_source: formData.referral,
          marketing_consent: formData.popiaConsent,
          created_at: new Date().toISOString()
        };

        const saveResult = await saveBookingToDatabase(dbBooking);
        
        if (!saveResult.success) {
          alert('Failed to save booking. Please try again.');
          setLoading(false);
          return;
        }

        const bookingId = saveResult.bookingId;
        const accessToken = await saveIndemnityRecord(bookingId);
        
        await sendConfirmationEmail(dbBooking, accessToken);

        const newBooking: Booking = {
          id: bookingId || Math.random().toString(36).substr(2, 9),
          guestName: fullName,
          email: formData.email,
          phone: formData.phone,
          country: formData.country,
          city: formData.city,
          province: formData.province,
          passportOrId: formData.passportOrId,
          nextDestination: formData.nextDestination,
          checkInDate: formData.arrivalDate,
          checkOutDate: formData.departureDate,
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

        // Save guest profile if they opted in
        if (formData.saveDetails) {
          await saveGuestProfile();
        }

        onComplete(newBooking, accessToken);
      } catch (error) {
        console.error('Check-in error:', error);
        alert('Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Loading and error states
  if (branding?.service_paused) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-900 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-serif font-bold text-stone-900 mb-2">Temporarily Unavailable</h2>
          <p className="text-stone-600 mb-6">
            {branding.trading_name} is currently not accepting online check-ins. 
            Please contact reception directly for assistance.
          </p>
          {branding.phone && (
            <a 
              href={`tel:${branding.phone}`}
              className="inline-block bg-amber-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-amber-600 transition-colors"
            >
              Call {branding.phone}
            </a>
          )}
        </div>
      </div>
    );
  }

  // Better loading state with message
if (loadingBranding) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4" 
             style={{ borderColor: branding?.primary_color || '#f59e0b' }} />
        <p className="text-stone-600 text-sm">Loading check-in form...</p>
        <p className="text-stone-400 text-xs mt-2">Please wait while we prepare your secure check-in</p>
      </div>
    </div>
  );
}

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
      <div className="max-w-5xl mx-auto py-10 px-4">
        {/* Business Header */}
        {!heroImage && businessId && branding && (
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
                />
              </div>
            ) : (
              <h1 className="text-3xl font-bold mb-2" style={{ color: secondaryColor }}>
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

        {/* Progress Steps */}
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

        <form onSubmit={handleSubmit} className="bg-white shadow-2xl rounded-[2.5rem] overflow-hidden border border-stone-100 flex flex-col min-h-[700px]">
          
          {/* Step 1 - Email Entry */}
          {step === 1 && (
            <div className="p-10 md:p-16 text-center animate-fade-in flex flex-col flex-grow items-center justify-center">
              <h2 className="text-sm font-bold tracking-[0.3em] text-amber-700 uppercase mb-4">Statutory Registration</h2>
              <h1 className="text-5xl font-serif text-stone-900 mb-6 uppercase tracking-tight">Welcome Home</h1>
              {businessSlogan && !heroImage && (
                <p className="text-xl text-stone-500 mb-8 italic font-serif">{businessSlogan}</p>
              )}
              <p className="text-xl text-stone-500 mb-12 italic font-serif opacity-80">{businessName}</p>
              
              <div className="max-w-md w-full mx-auto space-y-8 text-left">
                <div className="space-y-3">
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest">Confirm your Email *</label>
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
                      ✓ Your saved details have been loaded
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
                    <span className="font-bold">Save my details for next time</span>
                    <span className="text-xs text-stone-500 block">Your information will be securely stored for faster check-ins</span>
                  </label>
                </div>
                
                {profileSaveSuccess && (
                  <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50 animate-fade-in">
                    ✓ Your details have been saved for next time
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
                    Get exclusive offers and updates from <span className="font-medium text-stone-700">{businessName}</span>. 
                    Unsubscribe anytime.
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
                    Processing...
                  </>
                ) : (
                  'Begin Statutory Check-In'
                )}
              </button>
            </div>
          )}

          {/* Step 2 - Personal Details with Validation */}
          {step === 2 && (
            <div className="p-10 md:p-16 animate-fade-in flex-grow overflow-y-auto">
              {/* Error Summary Bar */}
              {submitAttempted && validateStep2().length > 0 && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl animate-fade-in">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-red-800 text-sm">Please complete all required fields:</p>
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
                <h2 className="text-3xl font-serif font-bold text-stone-900">Personal Registry</h2>
                <p className="text-stone-400 text-[10px] mt-2 uppercase tracking-[0.2em] font-bold">Immigration Act Requirement (Section 40)</p>
                <p className="text-red-500 text-xs mt-2">* All fields marked with asterisk are required</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                {/* First Name and Last Name */}
                <div className="grid grid-cols-2 gap-6 col-span-full">
                  <div className="space-y-1 group">
                    <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">
                      First Name <span className="text-red-500">*</span>
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
                    <ErrorMessage field="firstName" message="First name is required" />
                  </div>
                  
                  <div className="space-y-1 group">
                    <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">
                      Last Name <span className="text-red-500">*</span>
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
                    <ErrorMessage field="lastName" message="Last name is required" />
                  </div>
                </div>

                {/* Passport/ID */}
                <div className="space-y-1 group">
                  <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">
                    Passport / ID Number <span className="text-red-500">*</span>
                  </label>
                  <input 
                    required 
                    type="text" 
                    className={`w-full border-b py-3 outline-none focus:border-stone-900 text-lg font-mono transition-colors ${getErrorClass('passportOrId', !!formData.passportOrId.trim())}`} 
                    value={formData.passportOrId} 
                    onFocus={() => markTouched('passportOrId')}
                    onChange={e => setFormData({...formData, passportOrId: e.target.value})} 
                  />
                  <ErrorMessage field="passportOrId" message="ID/Passport number is required" />
                </div>
                
                {/* Phone */}
                <div className="space-y-1 group">
                  <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">
                    Mobile Phone <span className="text-red-500">*</span>
                  </label>
                  <input 
                    required 
                    type="tel" 
                    className={`w-full border-b py-3 outline-none focus:border-stone-900 text-lg transition-colors ${getErrorClass('phone', !!formData.phone.trim())}`} 
                    value={formData.phone} 
                    onFocus={() => markTouched('phone')}
                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                  />
                  <ErrorMessage field="phone" message="Mobile phone number is required" />
                </div>
                
                {/* Country */}
                <div className="space-y-1 group">
                  <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">
                    Country of Origin <span className="text-red-500">*</span>
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
                    <option value="">Select Country</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ErrorMessage field="country" message="Country of origin is required" />
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
                      <option value="">Select {regionTypeLabel}</option>
                      {availableRegions.map(region => (
                        <option key={region} value={region}>{region}</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      required 
                      type="text" 
                      placeholder={`Enter your ${regionTypeLabel.toLowerCase()}`}
                      className={`w-full border-b py-3 outline-none focus:border-stone-900 text-lg font-serif transition-colors ${getErrorClass('province', !!formData.province)}`}
                      value={formData.province} 
                      onFocus={() => markTouched('province')}
                      onChange={e => setFormData({...formData, province: e.target.value})} 
                      disabled={!formData.country}
                    />
                  )}
                  <ErrorMessage field="province" message={`${regionTypeLabel} is required`} />
                </div>

                {/* City */}
                <div className="space-y-1 group">
                  <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">
                    City / Town <span className="text-red-500">*</span>
                  </label>
                  <input 
                    required 
                    type="text" 
                    className={`w-full border-b py-3 outline-none focus:border-stone-900 text-lg font-serif transition-colors ${getErrorClass('city', !!formData.city.trim())}`} 
                    value={formData.city} 
                    onFocus={() => markTouched('city')}
                    onChange={e => setFormData({...formData, city: e.target.value})} 
                  />
                  <ErrorMessage field="city" message="City/Town is required" />
                </div>

                {/* Stay Details */}
                <div className="grid grid-cols-2 gap-8 col-span-full bg-stone-50 p-8 rounded-3xl border border-stone-200">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest">Adults (Sharing)</label>
                    <input required type="number" min="1" className="w-full bg-transparent border-b border-stone-300 py-2 font-bold" value={formData.adults} onChange={e => setFormData({...formData, adults: parseInt(e.target.value)})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest">Children (Under 16 sharing with adults)</label>
                    <input required type="number" min="0" className="w-full bg-transparent border-b border-stone-300 py-2 font-bold" value={formData.kids} onChange={e => setFormData({...formData, kids: parseInt(e.target.value)})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest">Arrival Date <span className="text-red-500">*</span></label>
                    <input 
                      required 
                      type="date" 
                      className={`w-full bg-transparent border-b py-2 font-bold transition-colors ${getErrorClass('arrivalDate', !!formData.arrivalDate)}`}
                      value={formData.arrivalDate} 
                      onFocus={() => markTouched('arrivalDate')}
                      onChange={e => setFormData({...formData, arrivalDate: e.target.value})} 
                    />
                    <ErrorMessage field="arrivalDate" message="Arrival date is required" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest">Duration (Nights) <span className="text-red-500">*</span></label>
                    <input 
                      required 
                      type="number" 
                      min="1" 
                      className={`w-full bg-transparent border-b py-2 font-bold transition-colors ${getErrorClass('nights', formData.nights >= 1)}`}
                      value={formData.nights} 
                      onFocus={() => markTouched('nights')}
                      onChange={e => setFormData({...formData, nights: parseInt(e.target.value)})} 
                    />
                    <ErrorMessage field="nights" message="Number of nights is required" />
                  </div>
                </div>

                {/* Referral Source */}
                <div className="space-y-1 group col-span-full">
                  <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">
                    How did you hear about us? <span className="text-red-500">*</span>
                  </label>
                  <select 
                    required
                    value={formData.referral}
                    onFocus={() => markTouched('referral')}
                    onChange={e => setFormData({...formData, referral: e.target.value})}
                    className={`w-full border-b border-stone-200 py-3 outline-none focus:border-stone-900 bg-transparent text-lg transition-colors ${getErrorClass('referral', !!formData.referral)}`}
                  >
                    <option value="">Select referral source</option>
                    <option value="Word of mouth">Word of mouth</option>
                    <option value="Booking.com">Booking.com</option>
                    <option value="Google">Google</option>
                    <option value="Facebook / Instagram">Facebook / Instagram</option>
                    <option value="Travel Agency">Travel Agency</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="YouTube">YouTube</option>
                    <option value="Research engine">Research engine</option>
                    <option value="TikTok">TikTok</option>
                  </select>
                  <ErrorMessage field="referral" message="Please select how you heard about us" />
                </div>

                {/* Next Destination */}
                <div className="space-y-1 group col-span-full">
                  <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">
                    Next Destination <span className="text-red-500">*</span>
                  </label>
                  <input 
                    required 
                    type="text" 
                    placeholder="Where is your journey continuing?"
                    className={`w-full border-b border-stone-200 py-3 outline-none focus:border-stone-900 text-lg italic transition-colors ${getErrorClass('nextDestination', !!formData.nextDestination.trim())}`}
                    value={formData.nextDestination} 
                    onFocus={() => markTouched('nextDestination')}
                    onChange={e => setFormData({...formData, nextDestination: e.target.value})} 
                  />
                  <ErrorMessage field="nextDestination" message="Next destination is required" />
                </div>
                
                {/* Settlement Method */}
                <div className="space-y-1 group col-span-full">
                  <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">
                    Method of Settlement <span className="text-red-500">*</span>
                  </label>
                  <select 
                    required 
                    className={`w-full border-b border-stone-200 py-3 outline-none focus:border-stone-900 bg-transparent text-lg transition-colors ${getErrorClass('settlement', !!formData.settlement)}`}
                    value={formData.settlement} 
                    onFocus={() => markTouched('settlement')}
                    onChange={e => setFormData({...formData, settlement: e.target.value})}
                  >
                    <option value="">Select Settlement</option>
                    {SETTLEMENT_METHODS.filter(m => formData.country === 'South Africa' || m !== 'Instant EFT (RSA resident only)').map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <ErrorMessage field="settlement" message="Please select payment method" />
                </div>
              </div>

              <div className="mt-16 flex justify-between">
                <button type="button" onClick={() => setStep(1)} className="text-stone-400 font-bold hover:text-stone-800 uppercase text-[10px] tracking-widest">Back</button>
                <button 
                  type="submit" 
                  className="text-white px-12 py-5 rounded-full font-bold hover:opacity-90 transition-all shadow-xl text-[10px] uppercase tracking-widest"
                  style={{ backgroundColor: secondaryColor }}
                >
                  Continue to Indemnity
                </button>
              </div>
            </div>
          )}

          {/* Step 3 - Indemnity & Signature */}
          {step === 3 && (
            <div className="p-10 md:p-16 animate-fade-in flex flex-col flex-grow">
              <h2 className="text-3xl font-serif font-bold text-stone-900 mb-8">Indemnity & Waiver</h2>
              
              {/* Error Summary Bar */}
              {submitAttempted && validateStep3().length > 0 && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl animate-fade-in">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-red-800 text-sm">Please complete before submitting:</p>
                      <ul className="text-red-700 text-xs mt-1 list-disc list-inside">
                        {!formData.idPhoto && <li>Take a photo of your ID/passport</li>}
                        {!formData.signature && <li>Provide your digital signature</li>}
                        {!formData.acceptLegal && <li>Scroll to the bottom and accept the indemnity terms</li>}
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
                    <div className="space-y-8 max-w-3xl mx-auto">
                      <div className="text-center space-y-3 mb-12">
                        <p className="font-bold text-2xl text-stone-900 font-serif">{businessName}</p>
                        <p className="font-bold text-xs tracking-widest uppercase border-y border-stone-200 py-3">GUEST ACKNOWLEDGEMENT OF INHERENT RISK, WAIVER OF CLAIMS, AND INDEMNITY AGREEMENT</p>
                      </div>
                      
                      <div className="bg-amber-50 p-8 border-l-4 border-amber-600 text-stone-900 font-bold leading-relaxed rounded-r-2xl">
                        ⚠️ WARNING: THIS IS A LEGALLY BINDING AND IMPORTANT DOCUMENT THAT LIMITS AND EXCLUDES LEGAL RIGHTS. BY SIGNING IT, YOU ASSUME RISKS AND WAIVE CERTAIN RIGHTS, INCLUDING THE RIGHT TO SUE OR CLAIM COMPENSATION UNDER CERTAIN CIRCUMSTANCES.
                      </div>

                      <div>
                        <h4 className="font-bold underline uppercase text-stone-900 mb-4">PART A: WARNING AND NOTICE</h4>
                        <p className="mb-4">
                          DO NOT SIGN THIS DOCUMENT UNLESS YOU HAVE READ IT, UNDERSTOOD IT, AND VOLUNTARILY ACCEPT ITS TERMS. 
                          IF YOU ARE UNCERTAIN ABOUT ITS MEANING OR EFFECT, YOU SHOULD SEEK INDEPENDENT LEGAL ADVICE BEFORE SIGNING.
                        </p>
                        <p className="mb-4">
                          THIS AGREEMENT APPLIES DURING YOUR ENTIRE STAY AT {businessName.toUpperCase()} AND TO ALL ACTIVITIES 
                          UNDERTAKEN ON THE PROPERTY.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-bold underline uppercase text-stone-900 mb-4">PART B: DETAILED ACKNOWLEDGEMENT OF INHERENT RISKS</h4>
                        <p className="mb-4">
                          I, the undersigned Guest, for myself, my heirs, executors, administrators, and assigns, hereby acknowledge and agree as follows:
                        </p>
                        <p className="mb-4">
                          <strong>Nature of the Environment:</strong> I understand and accept that {businessName} is situated within a natural 
                          sanctuary environment that is home to wild, dangerous, and unpredictable animals, reptiles, birds, and insects. 
                          Encounters with such wildlife, whether during organized activities or incidental to my stay, carry an inherent 
                          and unavoidable risk of serious bodily injury, permanent disability, trauma, death, and/or loss of or damage to 
                          personal property.
                        </p>
                        <p className="mb-4">
                          <strong>Nature of Activities:</strong> I understand that participating in activities such as, but not limited to, 
                          guided or unguided walks, hiking trails, mountain bike rides, game drives, or simply being present on the lodge grounds, 
                          involves inherent risks. These risks include, but are not limited to: terrain hazards; variable weather conditions; 
                          encounters with wildlife; the potential for collisions, falls, or equipment failure; and the possibility of becoming 
                          lost or stranded. Medical assistance may be significantly delayed in the event of an emergency.
                        </p>
                        <p className="mb-4">
                          <strong>Assumption of Inherent Risk:</strong> I hereby freely and voluntarily assume ALL KNOWN AND UNKNOWN INHERENT RISKS 
                          associated with my stay and participation in activities at {businessName}, whether described herein or not.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-bold underline uppercase text-stone-900 mb-4">PART C: WAIVER OF CLAIMS AND INDEMNITY</h4>
                        <p className="mb-4">
                          In consideration for being permitted to enter and stay at {businessName} and to participate in its activities, I hereby agree:
                        </p>
                        <p className="mb-4">
                          <strong>Waiver of Claims:</strong> To the fullest extent permitted by the law of South Africa, I, on behalf of myself 
                          and my successors, hereby WAIVE, RELEASE, AND DISCHARGE {businessName}, its directors, officers, employees, agents, 
                          contractors, guides, landowners, and affiliated companies (collectively, the "Released Parties") from ANY AND ALL 
                          CLAIMS, DEMANDS, CAUSES OF ACTION, AND LIABILITY for personal injury, illness, death, or loss of or damage to property 
                          which I may suffer, arising out of or connected in any way with my stay or participation in activities, WHERE SUCH 
                          CLAIMS ARISE FROM THE ORDINARY NEGLIGENCE OF THE RELEASED PARTIES.
                        </p>
                        <p className="mb-4 font-bold text-stone-900">
                          I EXPRESSLY ACKNOWLEDGE THAT THIS WAIVER DOES NOT APPLY TO CLAIMS ARISING FROM THE GROSS NEGLIGENCE OR WILLFUL 
                          MISCONDUCT OF THE RELEASED PARTIES.
                        </p>
                        <p className="mb-4">
                          <strong>Indemnity:</strong> I further agree to DEFEND, INDEMNIFY, AND HOLD HARMLESS the Released Parties from and 
                          against any and all claims, demands, lawsuits, judgments, costs, and expenses (including legal fees) brought by or on 
                          behalf of: Myself; Any member of my family (including minor children); Any companion, invitee, or dependent accompanying 
                          me; or Any third party, arising from my acts, omissions, or breach of this Agreement, or my participation in any activity 
                          during my stay.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-bold underline uppercase text-stone-900 mb-4">PART D: GUEST WARRANTIES AND GENERAL TERMS</h4>
                        <p className="mb-4">
                          <strong>Authority and Capacity:</strong> I warrant that I am at least 18 years of age, of sound mind, and have the legal 
                          authority to enter into this Agreement. If I am signing on behalf of any minor children, I warrant that I am their parent 
                          or legal guardian and have the full authority to bind them to these terms.
                        </p>
                        <p className="mb-4">
                          <strong>Rules and Safety:</strong> I agree to abide by all rules, regulations, and safety instructions provided by the 
                          Lodge, its staff, or guides, whether given verbally or in writing. I accept that failure to do so may result in the 
                          termination of my stay without refund and will vitiate any protection offered by this Agreement.
                        </p>
                        <p className="mb-4">
                          <strong>Health and Fitness:</strong> I warrant that I am in good health, physically fit, and have no known medical, 
                          psychological, or physical condition that would prevent my safe participation in the activities I intend to undertake. 
                          I am responsible for carrying any necessary personal medication.
                        </p>
                        <p className="mb-4">
                          <strong>Emergency Medical Consent:</strong> In the event of a medical emergency, I authorise the Released Parties to 
                          secure, at my sole expense, such medical treatment and transport as they, in their sole discretion, deem necessary.
                        </p>
                        <p className="mb-4">
                          <strong>Limitation of Liability for Property:</strong> The Lodge provides a safe in each room for valuables. The Lodge's 
                          liability for loss of or damage to guest property is strictly limited to a maximum amount of ZAR 5,000 (Five Thousand Rand), 
                          unless such loss is directly attributable to the proven gross negligence of the Lodge and the property was deposited with 
                          the front desk for safekeeping. The Lodge is not liable for loss of money, jewellery, or other high-value items kept in 
                          guest rooms.
                        </p>
                        <p className="mb-4">
                          <strong>Severability & Governing Law:</strong> This Agreement shall be governed by and construed in accordance with the 
                          laws of the Republic of South Africa.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-bold underline uppercase text-stone-900 mb-4">PART E: DECLARATION AND SIGNATURE</h4>
                        <p className="font-bold text-stone-900 text-sm mb-6">
                          I HEREBY CERTIFY THAT I HAVE READ THIS ENTIRE DOCUMENT, I UNDERSTAND ITS CONTENTS COMPLETELY, AND I SIGN IT OF MY 
                          OWN FREE WILL. I UNDERSTAND THAT I AM GIVING UP SUBSTANTIAL LEGAL RIGHTS.
                        </p>
                        
                        <p className="mb-6 font-bold text-stone-800 bg-stone-50 p-6 border border-stone-200 rounded-2xl leading-relaxed italic">
                          "We confirm that the contents of this document was explained to us, the guest, and that they were given sufficient 
                          opportunity to read and ask questions before signing."
                        </p>

                        <div className="bg-stone-50 p-8 rounded-3xl space-y-4 mt-8 border border-stone-200 shadow-sm">
                          <p className="text-sm"><strong>PRIMARY GUEST:</strong> {updateFullName(formData.firstName, formData.lastName) || '________________'}</p>
                          <p className="text-sm"><strong>ID/Passport Number:</strong> {formData.passportOrId || '________________'}</p>
                          <p className="text-sm"><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                        </div>
                      </div>

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
                            I hereby certify that I have read and accepted the Terms and Conditions and the Waiver and Indemnity as displayed above.
                          </label>
                        </div>
                        <ErrorMessage field="acceptLegal" message="You must accept the indemnity terms to continue" />
                      </div>

                      <div className="text-center text-stone-400 text-xs pt-4">
                        — End of Document —
                      </div>
                    </div>
                  </div>
                  
                  {!hasScrolledToBottom && (
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-amber-600 text-white px-8 py-3 rounded-full text-[10px] font-bold animate-bounce shadow-2xl pointer-events-none uppercase tracking-widest z-10">
                      ↓ Scroll to end of document to enable acceptance ↓
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-4">
                  {/* LEFT COLUMN - CAMERA */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase text-stone-400 tracking-widest">
                      1. Guest ID Verification <span className="text-red-500">*</span>
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
                        ID photo is required
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
                              Open Camera
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
                                Capture
                              </button>
                              <button
                                type="button"
                                onClick={stopCamera}
                                className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2 text-sm"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Cancel
                              </button>
                            </div>
                          )}
                          
                          <div className="text-center">
                            <label className="text-xs text-stone-500 cursor-pointer hover:text-amber-600 transition-colors">
                              📁 Or upload from gallery
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
                          Take New Photo
                        </button>
                      )}
                    </div>
                  </div>

                  {/* RIGHT COLUMN - SIGNATURE */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[10px] font-bold uppercase text-stone-400 tracking-widest">
                        2. Primary Guest Signature <span className="text-red-500">*</span>
                      </h4>
                      <button type="button" onClick={clearCanvas} className="text-[10px] font-bold text-amber-700 uppercase hover:underline">Clear</button>
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
                        Digital signature is required
                      </p>
                    )}
                    <p className="text-xs text-stone-400">Sign with your finger or mouse</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-between pt-6 border-t border-stone-100 items-center">
                <button type="button" onClick={() => setStep(2)} className="text-stone-500 font-medium hover:text-stone-800 uppercase text-[10px] tracking-widest transition-colors">← Return to Details</button>
                <button 
                  type="submit" 
                  disabled={loading || !hasScrolledToBottom}
                  className="bg-amber-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-amber-700 transition-all shadow-md text-sm uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : 'Complete Registration'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Powered by FastCheckin Footer */}
      <div className="text-center py-6 border-t border-stone-200 mt-8">
        <div className="flex items-center justify-center gap-2 text-stone-400 text-xs">
          <span>Powered by</span>
          <img 
            src="/fastcheckin-logo.png" 
            alt="FastCheckin" 
            className="h-4 w-auto object-contain"
          />
          <span>FastCheckin</span>
        </div>
      </div>
    </div>
  );
};

export default CheckInForm;
