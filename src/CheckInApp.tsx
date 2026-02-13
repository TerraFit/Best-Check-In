import React, { useState, useRef, useEffect } from 'react';
import { COUNTRIES, SETTLEMENT_METHODS } from '../constants';
import { Booking } from '../types';
import { getRegionsForCountry } from '../services/regionService';

interface CheckInFormProps {
  onComplete: (booking: Booking) => void;
}

const CheckInForm: React.FC<CheckInFormProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const indemnityRef = useRef<HTMLDivElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [currentBookingId, setCurrentBookingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    email: '',
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
  });

  // Dynamically fetch regions based on country selection
  const availableRegions = getRegionsForCountry(formData.country);

  useEffect(() => {
    if (formData.arrivalDate && formData.nights) {
      const date = new Date(formData.arrivalDate);
      date.setDate(date.getDate() + parseInt(formData.nights.toString()));
      setFormData(prev => ({ ...prev, departureDate: date.toISOString().split('T')[0] }));
    }
  }, [formData.arrivalDate, formData.nights]);

  const handleIndemnityScroll = () => {
    if (indemnityRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = indemnityRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 20) {
        setHasScrolledToBottom(true);
      }
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error("Camera error:", err);
      alert("Camera access is required for ID capture.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setFormData(prev => ({ ...prev, idPhoto: dataUrl }));
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  const clearCanvas = (ref: React.RefObject<HTMLCanvasElement>) => {
    const canvas = ref.current;
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
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000000';
    const getPos = (e: any) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    };
    const start = (e: any) => { drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
    const move = (e: any) => { if (!drawing) return; e.preventDefault(); const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
    const end = () => { drawing = false; setFormData(prev => ({ ...prev, signature: canvas.toDataURL() })); };
    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end);
  };

  useEffect(() => { 
    if (step === 3) {
      setTimeout(() => {
        if (canvasRef.current) initSignaturePad(canvasRef.current);
      }, 500);
    } 
  }, [step]);

  // ✅ REAL WHATSAPP INTEGRATION
  const handleWhatsAppSend = (bookingId: string) => {
    // Your lodge's WhatsApp number (include country code, no + or spaces)
    const lodgePhoneNumber = "27721234567"; // REPLACE WITH YOUR ACTUAL NUMBER
    
    // Create the message
    const message = encodeURIComponent(
      `🏨 *J-Bay Zebra Lodge - Check-In Confirmation*\n\n` +
      `Thank you for staying with us! Your indemnity form has been completed.\n\n` +
      `📄 *View your indemnity:*\n` +
      `${window.location.origin}/indemnity/${bookingId}\n\n` +
      `We hope you enjoy your stay!`
    );
    
    // Open WhatsApp
    window.open(`https://wa.me/${lodgePhoneNumber}?text=${message}`, '_blank');
    
    // Update status
    setWhatsappStatus('sent');
  };

  const [whatsappStatus, setWhatsappStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [wantsWhatsApp, setWantsWhatsApp] = useState(false);

  const handleWhatsAppToggle = (checked: boolean) => {
    setWantsWhatsApp(checked);
    if (checked && currentBookingId) {
      setWhatsappStatus('sending');
      // Small delay to show "sending" state before opening WhatsApp
      setTimeout(() => {
        handleWhatsAppSend(currentBookingId);
      }, 500);
    } else {
      setWhatsappStatus('idle');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) setStep(2);
    else if (step === 2) setStep(3);
    else if (step === 3) {
      if (!formData.signature) {
        alert("Please provide your digital signature.");
        return;
      }
      if (!formData.acceptLegal) {
        alert("Please scroll to the bottom of the indemnity and tick the box to accept the terms.");
        return;
      }
      const newBooking: Booking = {
        id: Math.random().toString(36).substr(2, 9),
        guestName: formData.fullName,
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
        totalAmount: 0,
        status: 'Checked-In',
        year: new Date().getFullYear(),
        month: new Date().toLocaleString('default', { month: 'short' }),
        signatureData: formData.signature,
        idPhotoData: formData.idPhoto,
        popiaMarketingConsent: formData.popiaConsent,
        timestamp: new Date().toISOString(),
      };
      
      // Save the booking ID for WhatsApp
      setCurrentBookingId(newBooking.id);
      onComplete(newBooking);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <div className="flex justify-center mb-8 items-center space-x-2">
        {[1, 2, 3].map(s => (
          <React.Fragment key={s}>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold transition-all ${step >= s ? 'bg-stone-900 text-white shadow-lg' : 'bg-stone-200 text-stone-500'}`}>
              {s}
            </div>
            {s < 3 && <div className={`w-16 h-0.5 ${step > s ? 'bg-stone-900' : 'bg-stone-200'}`} />}
          </React.Fragment>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow-2xl rounded-[2.5rem] overflow-hidden border border-stone-100 flex flex-col min-h-[700px]">
        {step === 1 && (
          <div className="p-10 md:p-16 text-center animate-fade-in flex flex-col flex-grow items-center justify-center">
            <h2 className="text-sm font-bold tracking-[0.3em] text-amber-700 uppercase mb-4">Statutory Registration</h2>
            <h1 className="text-5xl font-serif text-stone-900 mb-6 uppercase tracking-tight">Welcome Home</h1>
            <p className="text-xl text-stone-500 mb-12 italic font-serif opacity-80">J-Bay Zebra Lodge, Eastern Cape</p>
            
            <div className="max-w-md w-full mx-auto space-y-8 text-left">
              <div className="space-y-3">
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest">Confirm your Email *</label>
                <input 
                  required 
                  type="email" 
                  className="w-full border-b border-stone-200 py-3 outline-none focus:border-stone-900 transition-colors text-xl font-serif"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200 flex items-start gap-4">
                 <input 
                    type="checkbox" 
                    id="popia" 
                    className="mt-1 w-5 h-5 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                    checked={formData.popiaConsent}
                    onChange={e => setFormData({...formData, popiaConsent: e.target.checked})}
                 />
                 <label htmlFor="popia" className="text-xs text-stone-500 leading-relaxed cursor-pointer select-none">
                   I agree to receive marketing communications and news from J-Bay Zebra Lodge (POPIA Marketing Consent).
                 </label>
              </div>
            </div>
            
            <button type="submit" className="mt-16 bg-stone-900 text-white px-14 py-5 rounded-full font-bold hover:bg-stone-800 transition-all uppercase tracking-widest text-[10px] shadow-2xl transform hover:-translate-y-1">
              Begin Statutory Check-In
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="p-10 md:p-16 animate-fade-in flex-grow overflow-y-auto">
            <div className="border-b border-stone-100 pb-8 mb-10">
              <h2 className="text-3xl font-serif font-bold text-stone-900">Personal Registry</h2>
              <p className="text-stone-400 text-[10px] mt-2 uppercase tracking-[0.2em] font-bold">Immigration Act Requirement (Section 40)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              <div className="space-y-1 group">
                <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">Guest Full Name *</label>
                <input required type="text" className="w-full border-b border-stone-200 py-3 outline-none focus:border-stone-900 text-lg font-serif" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
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

              <div className={`space-y-1 group transition-all duration-300 ${formData.country ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest transition-colors group-focus-within:text-stone-900">
                  {availableRegions ? 'State / Province / Region *' : 'Province / Region / County *'}
                </label>
                {availableRegions ? (
                  <select 
                    required 
                    className="w-full border-b border-stone-200 py-3 outline-none focus:border-stone-900 bg-transparent text-lg" 
                    value={formData.province} 
                    onChange={e => setFormData({...formData, province: e.target.value})}
                  >
                    <option value="">Select Region</option>
                    {availableRegions.map(region => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>
                ) : (
                  <input 
                    required 
                    type="text" 
                    placeholder="Enter your region"
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
                  <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest">Children (Sharing)</label>
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
              <button type="submit" className="bg-stone-900 text-white px-12 py-5 rounded-full font-bold hover:bg-stone-800 transition-all shadow-xl text-[10px] uppercase tracking-widest">Continue to Indemnity</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="p-10 md:p-16 animate-fade-in flex flex-col flex-grow">
            <h2 className="text-3xl font-serif font-bold text-stone-900 mb-8">Indemnity & Waiver</h2>
            
            <div className="space-y-10 flex-grow">
              <div className="relative border border-stone-200 rounded-[2rem] overflow-hidden shadow-inner bg-white">
                <div 
                  ref={indemnityRef}
                  onScroll={handleIndemnityScroll}
                  className="p-10 text-[12px] leading-relaxed text-stone-700 max-h-[600px] overflow-y-auto custom-scrollbar select-none"
                >
                  <div className="space-y-8 max-w-3xl mx-auto">
                    <div className="text-center space-y-3 mb-12">
                      <p className="font-bold text-2xl text-stone-900 font-serif">J-BAY ZEBRA SANCTUARY LODGE & BIKE PARK</p>
                      <p className="font-bold text-xs tracking-widest uppercase border-y border-stone-200 py-3">GUEST ACKNOWLEDGEMENT OF INHERENT RISK, WAIVER OF CLAIMS, AND INDEMNITY AGREEMENT</p>
                    </div>
                    
                    <div className="bg-amber-50 p-8 border-l-4 border-amber-600 text-stone-900 font-bold leading-relaxed rounded-r-2xl">
                      ⚠️ WARNING: THIS IS A LEGALLY BINDING AND IMPORTANT DOCUMENT THAT LIMITS AND EXCLUDES LEGAL RIGHTS. BY SIGNING IT, YOU ASSUME RISKS AND WAIVE CERTAIN RIGHTS, INCLUDING THE RIGHT TO SUE OR CLAIM COMPENSATION UNDER CERTAIN CIRCUMSTANCES.
                    </div>

                    <div>
                      <h4 className="font-bold underline uppercase text-stone-900 mb-4">PART A: WARNING AND NOTICE</h4>
                      <p>DO NOT SIGN THIS DOCUMENT UNLESS YOU HAVE READ IT, UNDERSTOOD IT, AND VOLUNTARILY ACCEPT ITS TERMS. IF YOU ARE UNCERTAIN ABOUT ITS MEANING OR EFFECT, YOU SHOULD SEEK INDEPENDENT LEGAL ADVICE BEFORE SIGNING.</p>
                      <p className="mt-4">THIS AGREEMENT APPLIES DURING YOUR ENTIRE STAY AT J-BAY ZEBRA LODGE AND TO ALL ACTIVITIES UNDERTAKEN ON THE PROPERTY.</p>
                    </div>

                    <div>
                      <h4 className="font-bold underline uppercase text-stone-900 mb-4">PART B: DETAILED ACKNOWLEDGEMENT OF INHERENT RISKS</h4>
                      <p>I, the undersigned Guest, for myself, my heirs, executors, administrators, and assigns, hereby acknowledge and agree as follows:</p>
                      <p className="mt-4"><strong>Nature of the Environment:</strong> I understand and accept that J-Bay Zebra Lodge is situated within a natural sanctuary environment that is home to wild, dangerous, and unpredictable animals, reptiles, birds, and insects. Encounters with such wildlife, whether during organized activities or incidental to my stay, carry an inherent and unavoidable risk of serious bodily injury, permanent disability, trauma, death, and/or loss of or damage to personal property.</p>
                      <p className="mt-4"><strong>Nature of Activities:</strong> I understand that participating in activities such as, but not limited to, guided or unguided walks, hiking trails, mountain bike rides, game drives, or simply being present on the lodge grounds, involves inherent risks. These risks include, but are not limited to: terrain hazards; variable weather conditions; encounters with wildlife; the potential for collisions, falls, or equipment failure; and the possibility of becoming lost or stranded. Medical assistance may be significantly delayed in the event of an emergency.</p>
                      <p className="mt-4"><strong>Assumption of Inherent Risk:</strong> I hereby freely and voluntarily assume ALL KNOWN AND UNKNOWN INHERENT RISKS associated with my stay and participation in activities at J-Bay Zebra Lodge, whether described herein or not.</p>
                    </div>

                    <div>
                      <h4 className="font-bold underline uppercase text-stone-900 mb-4">PART C: WAIVER OF CLAIMS AND INDEMNITY</h4>
                      <p>In consideration for being permitted to enter and stay at J-Bay Zebra Lodge and to participate in its activities, I hereby agree:</p>
                      <p className="mt-4"><strong>Waiver of Claims:</strong> To the fullest extent permitted by the law of South Africa, I, on behalf of myself and my successors, hereby WAIVE, RELEASE, AND DISCHARGE J-Bay Zebra Lodge, J-Bay Zebra Sanctuary Lodge & Bike Park, their directors, officers, employees, agents, contractors, guides, landowners, and affiliated companies (collectively, the "Released Parties") from ANY AND ALL CLAIMS, DEMANDS, CAUSES OF ACTION, AND LIABILITY for personal injury, illness, death, or loss of or damage to property which I may suffer, arising out of or connected in any way with my stay or participation in activities, WHERE SUCH CLAIMS ARISE FROM THE ORDINARY NEGLIGENCE OF THE RELEASED PARTIES.</p>
                      <p className="mt-3 font-bold text-stone-900">I EXPRESSLY ACKNOWLEDGE THAT THIS WAIVER DOES NOT APPLY TO CLAIMS ARISING FROM THE GROSS NEGLIGENCE OR WILLFUL MISCONDUCT OF THE RELEASED PARTIES.</p>
                      <p className="mt-4"><strong>Indemnity:</strong> I further agree to DEFEND, INDEMNIFY, AND HOLD HARMLESS the Released Parties from and against any and all claims, demands, lawsuits, judgments, costs, and expenses (including legal fees) brought by or on behalf of: Myself; Any member of my family (including minor children); Any companion, invitee, or dependent accompanying me; or Any third party, arising from my acts, omissions, or breach of this Agreement, or my participation in any activity during my stay.</p>
                    </div>

                    <div>
                      <h4 className="font-bold underline uppercase text-stone-900 mb-4">PART D: GUEST WARRANTIES AND GENERAL TERMS</h4>
                      <p><strong>Authority and Capacity:</strong> I warrant that I am at least 18 years of age, of sound mind, and have the legal authority to enter into this Agreement. If I am signing on behalf of any minor children, I warrant that I am their parent or legal guardian and have the full authority to bind them to these terms.</p>
                      <p className="mt-4"><strong>Rules and Safety:</strong> I agree to abide by all rules, regulations, and safety instructions provided by the Lodge, its staff, or guides, whether given verbally or in writing. I accept that failure to do so may result in the termination of my stay without refund and will vitiate any protection offered by this Agreement.</p>
                      <p className="mt-4"><strong>Health and Fitness:</strong> I warrant that I am in good health, physically fit, and have no known medical, psychological, or physical condition that would prevent my safe participation in the activities I intend to undertake. I am responsible for carrying any necessary personal medication.</p>
                      <p className="mt-4"><strong>Emergency Medical Consent:</strong> In the event of a medical emergency, I authorise the Released Parties to secure, at my sole expense, such medical treatment and transport as they, in their sole discretion, deem necessary.</p>
                      <p className="mt-4"><strong>Limitation of Liability for Property:</strong> The Lodge provides a safe in each room for valuables. The Lodge’s liability for loss of or damage to guest property is strictly limited to a maximum amount of ZAR 5,000 (Five Thousand Rand), unless such loss is directly attributable to the proven gross negligence of the Lodge and the property was deposited with the front desk for safekeeping. The Lodge is not liable for loss of money, jewellery, or other high-value items kept in guest rooms.</p>
                      <p className="mt-4"><strong>Severability & Governing Law:</strong> This Agreement shall be governed by and construed in accordance with the laws of the Republic of South Africa.</p>
                    </div>

                    <div>
                      <h4 className="font-bold underline uppercase text-stone-900 mb-4">PART E: DECLARATION AND SIGNATURE</h4>
                      <p className="font-bold text-stone-900 text-sm">I HEREBY CERTIFY THAT I HAVE READ THIS ENTIRE DOCUMENT, I UNDERSTAND ITS CONTENTS COMPLETELY, AND I SIGN IT OF MY OWN FREE WILL. I UNDERSTAND THAT I AM GIVING UP SUBSTANTIAL LEGAL RIGHTS.</p>
                      
                      <p className="mt-6 font-bold text-stone-800 bg-stone-50 p-6 border border-stone-200 rounded-2xl leading-relaxed italic">
                        "We confirm that the contents of this document was explained to us, the guest, and that they were given sufficient opportunity to read and ask questions before signing."
                      </p>

                      <div className="bg-stone-50 p-8 rounded-3xl space-y-4 mt-8 border border-stone-200 shadow-sm">
                        <p className="text-sm"><strong>PRIMARY GUEST:</strong> {formData.fullName || '________________'}</p>
                        <p className="text-sm"><strong>ID/Passport Number:</strong> {formData.passportOrId || '________________'}</p>
                        <p className="text-sm"><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className={`mt-12 p-8 rounded-3xl border-2 transition-all ${hasScrolledToBottom ? 'bg-amber-50 border-amber-500 shadow-md' : 'bg-stone-50 border-stone-200 opacity-50'}`}>
                        <div className="flex items-start gap-5">
                            <input 
                                required 
                                type="checkbox" 
                                id="legalCheck" 
                                className="w-8 h-8 rounded border-stone-300 text-amber-700 focus:ring-amber-600 cursor-pointer disabled:cursor-not-allowed mt-1" 
                                disabled={!hasScrolledToBottom}
                                checked={formData.acceptLegal} 
                                onChange={e => setFormData({...formData, acceptLegal: e.target.checked})} 
                            />
                            <label htmlFor="legalCheck" className={`text-base font-bold leading-relaxed select-none ${hasScrolledToBottom ? 'text-amber-900 cursor-pointer' : 'text-stone-400'}`}>
                                I hereby certify that I have read and accepted the Terms and Conditions and the Waiver and Indemnity as displayed.
                            </label>
                        </div>
                    </div>
                  </div>
                </div>
                {!hasScrolledToBottom && (
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-amber-600 text-white px-8 py-3 rounded-full text-[10px] font-bold animate-bounce shadow-2xl pointer-events-none uppercase tracking-widest z-10">
                    Scroll to end of document to enable acceptance
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
                        <button onClick={() => setFormData(prev => ({ ...prev, idPhoto: '' }))} className="absolute top-4 right-4 bg-black/60 text-white p-2 rounded-full w-10 h-10 flex items-center justify-center backdrop-blur-sm">✕</button>
                      </>
                    ) : isCameraActive ? (
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    ) : (
                      <button type="button" onClick={startCamera} className="text-stone-500 font-bold text-xs flex flex-col items-center gap-3">
                        <span className="text-3xl opacity-50">📷</span>
                        Capture ID/Passport Photo
                      </button>
                    )}
                  </div>
                  {isCameraActive && <button type="button" onClick={capturePhoto} className="w-full bg-stone-900 text-white py-4 rounded-2xl text-[10px] uppercase font-bold tracking-widest">Take Snapshot</button>}
                </div>

                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-bold uppercase text-stone-400 tracking-widest">2. Primary Guest Signature *</h4>
                    <button type="button" onClick={() => clearCanvas(canvasRef)} className="text-[10px] font-bold text-amber-700 uppercase hover:underline">Clear</button>
                  </div>
                  <canvas 
                    ref={canvasRef} 
                    width={500} 
                    height={200} 
                    className="w-full h-40 bg-stone-50 border border-stone-200 rounded-3xl cursor-crosshair touch-none shadow-inner"
                  />
                </div>
              </div>
            </div>

            <div className="mt-20 flex justify-between pt-10 border-t border-stone-100 items-center">
              <button type="button" onClick={() => setStep(2)} className="text-stone-400 font-bold hover:text-stone-900 uppercase text-[10px] tracking-widest transition-colors">Return to Details</button>
              <button 
                type="submit" 
                disabled={!hasScrolledToBottom || !formData.acceptLegal || !formData.signature}
                className="bg-stone-900 text-white px-20 py-6 rounded-full font-bold hover:bg-black transition-all shadow-2xl text-[10px] uppercase tracking-[0.2em] disabled:opacity-20 disabled:cursor-not-allowed transform hover:-translate-y-1 active:scale-95"
              >
                Seal & Complete Registration
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default CheckInForm;
