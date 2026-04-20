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
  onComplete: (booking: Booking) => void;
  businessId?: string;
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

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const updateFullName = (firstName: string, lastName: string) => {
    return `${firstName} ${lastName}`.trim();
  };

  const availableRegions = formData.country ? getRegionsForCountry(formData.country) : null;
  const regionTypeLabel = formData.country ? getRegionTypeLabel(formData.country) : 'Region';

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

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      console.log("🧹 Cleanup: Stopping camera stream");
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const fetchBusinessBranding = async () => {
    try {
      console.log('📡 Fetching business branding for ID:', businessId);
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

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.email && formData.email.includes('@')) {
        loadGuestProfile(formData.email);
      }
    }, 800);
    
    return () => clearTimeout(timer);
  }, [formData.email]);

  const loadGuestProfile = async (email: string) => {
    try {
      const response = await fetch(`/.netlify/functions/get-guest-profile?email=${encodeURIComponent(email)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.profile) {
          const nameParts = (data.profile.full_name || '').split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
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
        }
      }
    } catch (error) {
      console.error('Error loading guest profile:', error);
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

  // ==================== CAMERA FUNCTIONS WITH DEBUG ====================
  const startCamera = async () => {
    console.log("📷 [DEBUG] startCamera called");
    setCameraError(null);
    
    try {
      if (cameraStream) {
        console.log("📷 [DEBUG] Stopping existing stream");
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
      
      console.log("📷 [DEBUG] Requesting camera permissions...");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      console.log("📷 [DEBUG] Camera stream obtained! Stream ID:", stream.id);
      console.log("📷 [DEBUG] Video tracks:", stream.getVideoTracks().length);
      setCameraStream(stream);
      
      if (videoRef.current) {
        console.log("📷 [DEBUG] videoRef.current exists, setting srcObject");
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          console.log("📷 [DEBUG] Video metadata loaded, dimensions:", 
            videoRef.current?.videoWidth, "x", videoRef.current?.videoHeight);
          videoRef.current?.play()
            .then(() => {
              console.log("📷 [DEBUG] Video playing successfully!");
              setIsCameraActive(true);
            })
            .catch(err => console.error("📷 [DEBUG] Video play error:", err));
        };
      } else {
        console.error("📷 [DEBUG] videoRef.current is NULL!");
      }
    } catch (err) {
      console.error("📷 [DEBUG] Camera error:", err);
      let errorMessage = "Camera access denied. ";
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage += "Please grant camera permission in your browser settings.";
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
    console.log("📷 [DEBUG] capturePhoto called");
    console.log("📷 [DEBUG] videoRef.current:", videoRef.current);
    console.log("📷 [DEBUG] videoRef.current?.videoWidth:", videoRef.current?.videoWidth);
    
    if (videoRef.current && videoRef.current.videoWidth > 0) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      console.log("📷 [DEBUG] Canvas size:", canvas.width, "x", canvas.height);
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        console.log("📷 [DEBUG] Photo captured, data URL length:", dataUrl.length);
        setFormData(prev => ({ ...prev, idPhoto: dataUrl }));
        
        if (cameraStream) {
          cameraStream.getTracks().forEach(track => track.stop());
          setCameraStream(null);
        }
        setIsCameraActive(false);
        console.log("📷 [DEBUG] Camera stopped, photo saved");
      } else {
        console.error("📷 [DEBUG] Could not get canvas context");
        alert("Failed to capture photo. Please try again.");
      }
    } else {
      console.error("📷 [DEBUG] Video not ready for capture");
      alert("Camera not ready. Please wait a moment and try again.");
    }
  };

  const stopCamera = () => {
    console.log("📷 [DEBUG] stopCamera called");
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
    console.log("📷 [DEBUG] retakePhoto called");
    setFormData(prev => ({ ...prev, idPhoto: '' }));
  };

  // Debug: Monitor video element visibility
  useEffect(() => {
    if (isCameraActive && videoRef.current) {
      console.log("📷 [DEBUG] Video element mounted and active");
      console.log("📷 [DEBUG] Video element dimensions:", {
        offsetWidth: videoRef.current.offsetWidth,
        offsetHeight: videoRef.current.offsetHeight,
        videoWidth: videoRef.current.videoWidth,
        videoHeight: videoRef.current.videoHeight
      });
      console.log("📷 [DEBUG] Video element style:", videoRef.current.style);
      console.log("📷 [DEBUG] Video parent element:", videoRef.current.parentElement);
      
      // Force video to be visible
      videoRef.current.style.display = 'block';
      videoRef.current.style.width = '100%';
      videoRef.current.style.height = '100%';
    }
  }, [isCameraActive]);

  // ==================== SIGNATURE PAD FUNCTIONS ====================
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
        setFormData(prev => ({ ...prev, signature: canvas.toDataURL() }));
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

  // ==================== API FUNCTIONS ====================
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

  const saveGuestProfile = async () => {
    try {
      await fetch('/.netlify/functions/save-guest-profile', {
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
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  // ==================== MAIN SUBMIT HANDLER ====================
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
      setStep(3);
      return;
    }
    
    if (step === 3) {
      if (!formData.signature) {
        alert("Please provide your digital signature.");
        return;
      }
      if (!formData.acceptLegal) {
        alert("Please scroll to the bottom of the indemnity and tick the box to accept the terms.");
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

        if (formData.saveDetails) {
          await saveGuestProfile();
        }

        onComplete(newBooking);
      } catch (error) {
        console.error('Check-in error:', error);
        alert('Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  // ==================== LOADING AND ERROR STATES ====================
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

  if (loadingBranding) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" 
             style={{ borderColor: branding?.primary_color || '#f59e0b' }}></div>
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
        {/* Business Header - only if no hero image */}
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

          {/* Step 2 - Personal Details */}
          {step === 2 && (
            <div className="p-10 md:p-16 animate-fade-in flex-grow overflow-y-auto">
              <div className="border-b border-stone-100 pb-8 mb-10">
                <h2 className="text-3xl font-serif font-bold text-stone-900">Personal Registry</h2>
                <p className="text-stone-400 text-[10px] mt-2 uppercase tracking-[0.2em] font-bold">Immigration Act Requirement (Section 40)</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                {/* First Name and Last Name - Side by side */}
                <div className="grid grid-cols-2 gap-6 col-span-full">
                  <div className="space-y-1 group">
                    <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">First Name *</label>
                    <input 
                      required 
                      type="text" 
                      className="w-full border-b border-stone-200 py-3 outline-none focus:border-stone-900 text-lg font-serif" 
                      value={formData.firstName} 
                      onChange={e => {
                        const newFirstName = e.target.value;
                        setFormData({
                          ...formData, 
                          firstName: newFirstName,
                          fullName: `${newFirstName} ${formData.lastName}`.trim()
                        });
                      }} 
                    />
                  </div>
                  <div className="space-y-1 group">
                    <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">Last Name *</label>
                    <input 
                      required 
                      type="text" 
                      className="w-full border-b border-stone-200 py-3 outline-none focus:border-stone-900 text-lg font-serif" 
                      value={formData.lastName} 
                      onChange={e => {
                        const newLastName = e.target.value;
                        setFormData({
                          ...formData, 
                          lastName: newLastName,
                          fullName: `${formData.firstName} ${newLastName}`.trim()
                        });
                      }} 
                    />
                  </div>
                </div>

                <div className="space-y-1 group">
                  <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">Passport / ID Number *</label>
                  <input required type="text" className="w-full border-b border-stone-200 py-3 outline-none focus:border-stone-900 text-lg font-mono" value={formData.passportOrId} onChange={e => setFormData({...formData, passportOrId: e.target.value})} />
                </div>
                <div className="space-y-1 group">
                  <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">Mobile Phone *</label>
                  <input required type="tel" className="w-full border-b border-stone-200 py-3 outline-none focus:border-stone-900 text-lg" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="space-y-1 group">
                  <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">Country of Origin *</label>
                  <select 
                    required 
                    className="w-full border-b border-stone-200 py-3 outline-none focus:border-stone-900 bg-transparent text-lg" 
                    value={formData.country} 
                    onChange={e => {
                      setFormData({...formData, country: e.target.value, province: ''});
                    }}
                  >
                    <option value="">Select Country</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Dynamic Region Field */}
                <div className={`space-y-1 group transition-all duration-300 ${formData.country ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                  <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">
                    {regionTypeLabel} *
                  </label>
                  {availableRegions && availableRegions.length > 0 ? (
                    <select 
                      required 
                      className="w-full border-b border-stone-200 py-3 outline-none focus:border-stone-900 bg-transparent text-lg" 
                      value={formData.province} 
                      onChange={e => setFormData({...formData, province: e.target.value})}
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
                      className="w-full border-b border-stone-200 py-3 outline-none focus:border-stone-900 text-lg font-serif" 
                      value={formData.province} 
                      onChange={e => setFormData({...formData, province: e.target.value})} 
                    />
                  )}
                </div>

                <div className="space-y-1 group">
                  <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">City / Town *</label>
                  <input required type="text" className="w-full border-b border-stone-200 py-3 outline-none focus:border-stone-900 text-lg font-serif" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                </div>

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
                    <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest">Arrival Date</label>
                    <input required type="date" className="w-full bg-transparent border-b border-stone-300 py-2 font-bold" value={formData.arrivalDate} onChange={e => setFormData({...formData, arrivalDate: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest">Duration (Nights)</label>
                    <input required type="number" min="1" className="w-full bg-transparent border-b border-stone-300 py-2 font-bold" value={formData.nights} onChange={e => setFormData({...formData, nights: parseInt(e.target.value)})} />
                  </div>
                </div>

                <div className="space-y-1 group">
                  <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">
                    How did you hear about us? *
                  </label>
                  <select 
                    required
                    value={formData.referral}
                    onChange={e => setFormData({...formData, referral: e.target.value})}
                    className="w-full border-b border-stone-200 py-3 outline-none focus:border-stone-900 bg-transparent text-lg"
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
                </div>

                <div className="space-y-1 group">
                  <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">Next Destination *</label>
                  <input required type="text" placeholder="Where is your journey continuing?" className="w-full border-b border-stone-200 py-3 outline-none focus:border-stone-900 text-lg italic" value={formData.nextDestination} onChange={e => setFormData({...formData, nextDestination: e.target.value})} />
                </div>
                <div className="space-y-1 group">
                  <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">Method of Settlement *</label>
                  <select required className="w-full border-b border-stone-200 py-3 outline-none focus:border-stone-900 bg-transparent text-lg" value={formData.settlement} onChange={e => setFormData({...formData, settlement: e.target.value})}>
                    <option value="">Select Settlement</option>
                    {SETTLEMENT_METHODS.filter(m => formData.country === 'South Africa' || m !== 'Instant EFT (RSA resident only)').map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className="mt-16 flex justify-between">
                <button type="button" onClick={() => setStep(1)} className="text-stone-400 font-bold hover:text-stone-800 uppercase text-[10px] tracking-widest">Back</button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="text-white px-12 py-5 rounded-full font-bold hover:opacity-90 transition-all shadow-xl text-[10px] uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
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
                            className="w-8 h-8 rounded border-stone-300 text-amber-700 focus:ring-amber-600 cursor-pointer disabled:cursor-not-allowed mt-1" 
                            disabled={!hasScrolledToBottom}
                            checked={formData.acceptLegal} 
                            onChange={e => setFormData({...formData, acceptLegal: e.target.checked})} 
                          />
                          <label htmlFor="legalCheck" className={`text-base font-bold leading-relaxed select-none ${hasScrolledToBottom ? 'text-amber-900 cursor-pointer' : 'text-stone-400'}`}>
                            I hereby certify that I have read and accepted the Terms and Conditions and the Waiver and Indemnity as displayed above.
                          </label>
                        </div>
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
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-bold uppercase text-stone-400 tracking-widest">1. Guest ID Verification</h4>
                    <div className="aspect-[3/2] bg-stone-50 rounded-3xl border-2 border-dashed border-stone-200 flex items-center justify-center overflow-hidden relative shadow-inner">
                      {formData.idPhoto ? (
                        <>
                          <img src={formData.idPhoto} alt="Guest ID" className="w-full h-full object-cover" />
                          <div className="absolute top-4 right-4 flex gap-2">
                            <button 
                              onClick={retakePhoto} 
                              className="bg-blue-600 text-white p-2 rounded-full w-10 h-10 flex items-center justify-center backdrop-blur-sm hover:bg-blue-700 transition-colors"
                              title="Retake photo"
                            >
                              ↻
                            </button>
                            <button 
                              onClick={() => setFormData(prev => ({ ...prev, idPhoto: '' }))} 
                              className="bg-black/60 text-white p-2 rounded-full w-10 h-10 flex items-center justify-center backdrop-blur-sm hover:bg-black/80 transition-colors"
                              title="Remove photo"
                            >
                              ✕
                            </button>
                          </div>
                        </>
                      ) : isCameraActive ? (
                        <div className="relative w-full h-full min-h-[300px] bg-black">
                          <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            muted
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 z-20">
                            <button
                              type="button"
                              onClick={capturePhoto}
                              className="bg-amber-600 text-white px-6 py-3 rounded-full font-bold shadow-lg"
                            >
                              📸 Capture Photo
                            </button>
                            <button
                              type="button"
                              onClick={stopCamera}
                              className="bg-red-600 text-white px-6 py-3 rounded-full font-bold shadow-lg"
                            >
                              ✕ Close
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <button 
                            type="button" 
                            onClick={startCamera} 
                            className="text-stone-500 font-bold text-sm flex flex-col items-center gap-3 p-8 hover:text-stone-700 transition-colors"
                          >
                            <span className="text-5xl opacity-50">📷</span>
                            <span>Tap to open camera</span>
                            <span className="text-xs text-stone-400">Take a clear photo of your ID document</span>
                          </button>
                          {cameraError && (
                            <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                              {cameraError}
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setFormData(prev => ({ ...prev, idPhoto: reader.result as string }));
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="mt-2 block w-full text-sm text-stone-500 file:mr-2 file:py-2 file:px-4 file:rounded-full file:bg-amber-50 file:text-amber-700 file:border-0"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[10px] font-bold uppercase text-stone-400 tracking-widest">2. Primary Guest Signature *</h4>
                      <button type="button" onClick={clearCanvas} className="text-[10px] font-bold text-amber-700 uppercase hover:underline">Clear</button>
                    </div>
                    <canvas 
                      ref={canvasRef} 
                      className="w-full h-40 bg-white border-2 border-stone-200 rounded-xl cursor-crosshair touch-none"
                      style={{ touchAction: 'none' }}
                    />
                    <p className="text-xs text-stone-400">Sign with your finger or mouse</p>
                  </div>
                </div>
              </div>

              <div className="mt-20 flex justify-between pt-10 border-t border-stone-100 items-center">
                <button type="button" onClick={() => setStep(2)} className="text-stone-400 font-bold hover:text-stone-900 uppercase text-[10px] tracking-widest transition-colors">Return to Details</button>
                <button 
                  type="submit" 
                  disabled={loading || !hasScrolledToBottom || !formData.acceptLegal || !formData.signature}
                  className="text-white px-20 py-6 rounded-full font-bold hover:opacity-90 transition-all shadow-2xl text-[10px] uppercase tracking-[0.2em] disabled:opacity-20 disabled:cursor-not-allowed transform hover:-translate-y-1 active:scale-95 flex items-center gap-3"
                  style={{ backgroundColor: secondaryColor }}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </>
                  ) : (
                    'Seal & Complete Registration'
                  )}
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
