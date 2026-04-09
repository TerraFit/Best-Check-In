import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// SADC Countries only
const SADC_COUNTRIES = [
  'South Africa',
  'Angola',
  'Botswana',
  'Comoros',
  'Democratic Republic of Congo',
  'Eswatini',
  'Lesotho',
  'Madagascar',
  'Malawi',
  'Mauritius',
  'Mozambique',
  'Namibia',
  'Seychelles',
  'Tanzania',
  'Zambia',
  'Zimbabwe'
];

// South African Provinces
const PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
  'Western Cape'
];

// Pricing Plans Data
const pricingPlans = [
  {
    id: 'starter',
    name: 'Starter',
    maxRooms: 5,
    priceMonthly: 349,
    priceYearly: 3490,
    color: 'green',
    borderColor: 'border-green-500',
    textColor: 'text-green-500',
    buttonColor: 'bg-green-600 hover:bg-green-700',
    bgHover: 'hover:border-green-500'
  },
  {
    id: 'growth',
    name: 'Growth',
    maxRooms: 10,
    priceMonthly: 649,
    priceYearly: 6490,
    color: 'blue',
    borderColor: 'border-blue-500',
    textColor: 'text-blue-500',
    buttonColor: 'bg-blue-600 hover:bg-blue-700',
    bgHover: 'hover:border-blue-500',
    mostPopular: true
  },
  {
    id: 'pro',
    name: 'Pro',
    maxRooms: 15,
    priceMonthly: 949,
    priceYearly: 9490,
    color: 'purple',
    borderColor: 'border-purple-500',
    textColor: 'text-purple-500',
    buttonColor: 'bg-purple-600 hover:bg-purple-700',
    bgHover: 'hover:border-purple-500'
  },
  {
    id: 'business',
    name: 'Business',
    maxRooms: 20,
    priceMonthly: 1290,
    priceYearly: 12900,
    color: 'orange',
    borderColor: 'border-orange-500',
    textColor: 'text-orange-500',
    buttonColor: 'bg-orange-600 hover:bg-orange-700',
    bgHover: 'hover:border-orange-500'
  }
];

export default function BusinessRegistration() {
  const navigate = useNavigate();
  
  // Phase Management
  const [phase, setPhase] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Plan Selection State
  const [selectedPlanId, setSelectedPlanId] = useState('growth');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [roomsCount, setRoomsCount] = useState(5);
  const [showRoomError, setShowRoomError] = useState(false);
  
  // Get selected plan data
  const selectedPlan = pricingPlans.find(p => p.id === selectedPlanId);
  
  // Determine recommended plan based on room count
  const getRecommendedPlanId = () => {
    if (roomsCount <= 5) return 'starter';
    if (roomsCount <= 10) return 'growth';
    if (roomsCount <= 15) return 'pro';
    if (roomsCount <= 20) return 'business';
    return 'enterprise';
  };
  const recommendedPlanId = getRecommendedPlanId();
  
  // Phase 1: Business Information
  const [businessData, setBusinessData] = useState({
    legalName: '',
    registrationNumber: '',
    vatNumber: '',
    tradingName: '',
    physicalStreet: '',
    physicalCity: '',
    physicalProvince: '',
    physicalCountry: 'South Africa',
    physicalPostalCode: '',
    sameAsPhysical: true,
    postalStreet: '',
    postalCity: '',
    postalProvince: '',
    postalCountry: 'South Africa',
    postalPostalCode: '',
    email: '',
    confirmEmail: '',
    fixedPhone: '',
    mobilePhone: '',
    website: ''
  });

  // Phase 2: Director Details
  const [directorData, setDirectorData] = useState({
    name: '',
    surname: '',
    idNumber: '',
    idPhoto: '',
    idPhotoPreview: '',
    sameAddress: true,
    address: '',
    email: '',
    confirmEmail: '',
    fixedPhone: '',
    mobilePhone: '',
    acknowledgeCorrect: false
  });

  // Phase 3: Waiver
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [captchaText, setCaptchaText] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');

  // Generate CAPTCHA
  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaText(result);
  };

  React.useEffect(() => {
    generateCaptcha();
  }, []);

  // Handle room count change - auto recommends plan
  const handleRoomsChange = (rooms: number) => {
    setRoomsCount(rooms);
    setShowRoomError(false);
    if (rooms <= 5) setSelectedPlanId('starter');
    else if (rooms <= 10) setSelectedPlanId('growth');
    else if (rooms <= 15) setSelectedPlanId('pro');
    else if (rooms <= 20) setSelectedPlanId('business');
  };

  // Handle plan selection with validation
  const handleSelectPlan = (planId: string) => {
    if (planId === 'enterprise') {
      setSelectedPlanId('enterprise');
      setShowRoomError(false);
      document.getElementById('registration-form')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    const plan = pricingPlans.find(p => p.id === planId);
    if (plan && roomsCount > plan.maxRooms) {
      setShowRoomError(true);
      return;
    }
    setShowRoomError(false);
    setSelectedPlanId(planId);
    document.getElementById('registration-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle director ID photo upload
  const handleDirectorIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, etc.)');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('File must be less than 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setDirectorData(prev => ({
        ...prev,
        idPhoto: reader.result as string,
        idPhotoPreview: reader.result as string
      }));
    };
    reader.readAsDataURL(file);
  };

  // Validate Phase 1
  const validatePhase1 = (): boolean => {
    if (!businessData.legalName) {
      alert('Legal name is required');
      return false;
    }
    if (!businessData.tradingName) {
      alert('Trading name is required');
      return false;
    }
    if (!businessData.physicalStreet) {
      alert('Physical address is required');
      return false;
    }
    if (!businessData.physicalCity) {
      alert('City is required');
      return false;
    }
    if (!businessData.physicalProvince) {
      alert('Province is required');
      return false;
    }
    if (!businessData.email) {
      alert('Email is required');
      return false;
    }
    if (businessData.email !== businessData.confirmEmail) {
      alert('Emails do not match');
      return false;
    }
    if (!businessData.mobilePhone) {
      alert('Mobile phone is required');
      return false;
    }
    return true;
  };

  // Validate Phase 2
  const validatePhase2 = (): boolean => {
    if (!directorData.name) {
      alert('Director name is required');
      return false;
    }
    if (!directorData.surname) {
      alert('Director surname is required');
      return false;
    }
    if (!directorData.idNumber) {
      alert('ID/Passport number is required');
      return false;
    }
    if (!directorData.idPhoto) {
      alert('ID photo is required');
      return false;
    }
    if (!directorData.email) {
      alert('Director email is required');
      return false;
    }
    if (directorData.email !== directorData.confirmEmail) {
      alert('Director emails do not match');
      return false;
    }
    if (!directorData.acknowledgeCorrect) {
      alert('Please acknowledge that the information is correct');
      return false;
    }
    return true;
  };

  // Phase 1 Submit
  const handlePhase1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validatePhase1()) {
      setPhase(2);
    }
  };

  // Phase 2 Submit
  const handlePhase2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validatePhase2()) {
      setPhase(3);
    }
  };

  // Final Submit
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (captchaInput.toUpperCase() !== captchaText) {
      alert('CAPTCHA verification failed. Please try again.');
      generateCaptcha();
      setCaptchaInput('');
      return;
    }
    
    if (!waiverAccepted) {
      alert('Please accept the waiver agreement to continue');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/.netlify/functions/register-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business: {
            legal_name: businessData.legalName,
            registration_number: businessData.registrationNumber,
            vat_number: businessData.vatNumber,
            trading_name: businessData.tradingName,
            physical_address: {
              street: businessData.physicalStreet,
              city: businessData.physicalCity,
              province: businessData.physicalProvince,
              country: businessData.physicalCountry,
              postalCode: businessData.physicalPostalCode
            },
            postal_address: businessData.sameAsPhysical ? null : {
              street: businessData.postalStreet,
              city: businessData.postalCity,
              province: businessData.postalProvince,
              country: businessData.postalCountry,
              postalCode: businessData.postalPostalCode
            },
            email: businessData.email,
            fixed_phone: businessData.fixedPhone,
            mobile_phone: businessData.mobilePhone,
            website: businessData.website,
            director: {
              name: directorData.name,
              surname: directorData.surname,
              id_number: directorData.idNumber,
              id_photo: directorData.idPhoto,
              address: directorData.sameAddress ? null : directorData.address,
              email: directorData.email,
              fixed_phone: directorData.fixedPhone,
              mobile_phone: directorData.mobilePhone
            },
            total_rooms: roomsCount,
            plan: selectedPlanId === 'enterprise' ? 'enterprise' : selectedPlanId,
            max_rooms: selectedPlan?.maxRooms || 999,
            billing_cycle: billingCycle,
            status: 'pending'
          }
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        navigate('/registration-pending', {
          state: {
            businessName: businessData.tradingName,
            email: businessData.email
          }
        });
      } else {
        alert(data.error || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-900">
      {/* Sticky Plan Banner - Shows after plan selection */}
      {(phase > 1 || selectedPlanId) && (
        <div className="sticky top-0 z-50 bg-stone-800 border-b border-stone-700 shadow-lg py-3 px-4">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src="/fastcheckin-logo.png"
                alt="FastCheckin"
                className="h-8 w-auto"
              />
              <div>
                <p className="text-sm text-stone-400">Selected Plan</p>
                <p className="font-bold text-white">
                  {selectedPlanId === 'enterprise' ? 'Enterprise' : selectedPlan?.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-stone-400">Rooms</p>
                <p className="text-white">
                  {roomsCount} / {selectedPlanId === 'enterprise' ? '∞' : selectedPlan?.maxRooms}
                </p>
              </div>
              <div>
                <p className="text-sm text-stone-400">Price</p>
                <p className="text-white">
                  {selectedPlanId === 'enterprise'
                    ? 'Custom'
                    : (billingCycle === 'monthly'
                      ? `R${selectedPlan?.priceMonthly}/month`
                      : `R${selectedPlan?.priceYearly}/year`)}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setPhase(1);
                document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-sm text-amber-500 hover:text-amber-400"
            >
              Change Plan
            </button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto py-12 px-4">
        {/* Header with Logo */}
        <div className="text-center mb-8">
          <img
            src="/fastcheckin-logo.png"
            alt="FastCheckin"
            className="h-16 w-auto mx-auto mb-4 object-contain"
          />
          <h1 className="text-4xl font-bold text-white">Register Your Business</h1>
          <p className="text-stone-400 mt-2">Choose the right plan based on your property size</p>
        </div>

        {/* ============================================================ */}
        {/* PRICING SECTION - MUST APPEAR FIRST */}
        {/* ============================================================ */}
        <div id="pricing-section" className="mb-12">
          
          {/* Room Input - Decision Driver */}
          <div className="max-w-md mx-auto mb-10 text-center">
            <label className="block text-lg font-medium text-stone-300 mb-3">
              How many rooms does your property have?
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={roomsCount}
              onChange={(e) => handleRoomsChange(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-3 bg-stone-800 border border-stone-600 rounded-xl focus:ring-2 focus:ring-amber-500 text-white text-center text-2xl font-semibold"
            />
            <p className="text-stone-500 text-sm mt-2">
              Enter the number of rooms to get a recommendation
            </p>
          </div>

          {/* Room Limit Error Message */}
          {showRoomError && (
            <div className="max-w-md mx-auto mb-6 bg-red-500/20 border border-red-500 rounded-lg p-3 text-center">
              <p className="text-red-400 text-sm">
                ⚠️ Your property exceeds this plan's room limit. Please upgrade to continue.
              </p>
            </div>
          )}

          {/* Pricing Cards - All Packages Displayed */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* Starter, Growth, Pro, Business Cards */}
            {pricingPlans.map((plan) => {
              const isRecommended = recommendedPlanId === plan.id;
              const isSelected = selectedPlanId === plan.id;
              const isDisabled = roomsCount > plan.maxRooms;
              
              return (
                <div
                  key={plan.id}
                  onClick={() => !isDisabled && handleSelectPlan(plan.id)}
                  className={`
                    relative rounded-xl border-2 p-5 cursor-pointer transition-all
                    ${isSelected
                      ? `${plan.borderColor} ring-2 ring-amber-500 bg-stone-800`
                      : 'border-stone-700 bg-stone-800/50'}
                    ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:shadow-xl'}
                    ${isRecommended ? 'scale-105 shadow-lg ring-2 ring-green-500/50' : ''}
                  `}
                >
                  {/* ✅ Recommended Badge (Dynamic - Green) */}
                  {isRecommended && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        Recommended
                      </span>
                    </div>
                  )}
                  
                  {/* ⭐ Most Popular Badge (Static - Amber) - Only on Growth when not recommended */}
                  {plan.mostPopular && !isRecommended && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-amber-500 text-stone-900 text-xs font-bold px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}
                  
                  <div className="text-center">
                    <h3 className={`text-xl font-bold ${plan.textColor}`}>
                      {plan.name}
                    </h3>
                    <p className="text-xs text-stone-400 mt-1">
                      Up to {plan.maxRooms} rooms
                    </p>
                    <div className="mt-3">
                      <span className="text-2xl font-bold text-white">
                        {billingCycle === 'monthly' ? `R${plan.priceMonthly}` : `R${plan.priceYearly}`}
                      </span>
                      <span className="text-stone-400 text-sm">
                        /{billingCycle === 'monthly' ? 'month' : 'year'}
                      </span>
                    </div>
                    {isDisabled && (
                      <p className="text-xs text-red-400 mt-2">
                        Requires upgrade
                      </p>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectPlan(plan.id);
                      }}
                      disabled={isDisabled}
                      className={`mt-4 w-full py-2 rounded-lg font-semibold transition-colors ${plan.buttonColor} text-white disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      Select Plan
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Enterprise Card - 20+ rooms / Custom Pricing */}
            <div
              onClick={() => handleSelectPlan('enterprise')}
              className={`
                relative rounded-xl border-2 p-5 cursor-pointer transition-all bg-stone-800/50 border-stone-700
                hover:scale-105 hover:shadow-xl
                ${selectedPlanId === 'enterprise' ? 'border-purple-500 ring-2 ring-amber-500 bg-stone-800' : ''}
                ${recommendedPlanId === 'enterprise' ? 'scale-105 shadow-lg ring-2 ring-green-500/50' : ''}
              `}
            >
              {recommendedPlanId === 'enterprise' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Recommended
                  </span>
                </div>
              )}
              <div className="text-center">
                <h3 className="text-xl font-bold text-purple-400">
                  Enterprise
                </h3>
                <p className="text-xs text-stone-400 mt-1">
                  20+ rooms
                </p>
                <div className="mt-3">
                  <span className="text-2xl font-bold text-white">
                    Custom
                  </span>
                  <span className="text-stone-400 text-sm">
                    /pricing
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectPlan('enterprise');
                  }}
                  className="mt-4 w-full py-2 rounded-lg font-semibold transition-colors bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* REGISTRATION FORM - Appears After Plan Selection */}
        {/* ============================================================ */}
        {selectedPlanId && (
          <div id="registration-form" className="mt-8">
            
            {/* Phase Indicator */}
            <div className="flex justify-center mb-8">
              <div className="flex items-center space-x-4">
                {[1, 2, 3].map((p) => (
                  <div key={p} className="flex items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                        phase >= p
                          ? 'bg-amber-500 text-stone-900'
                          : 'bg-stone-700 text-stone-400'
                      }`}
                    >
                      {p}
                    </div>
                    {p < 3 && (
                      <div
                        className={`w-16 h-0.5 mx-2 ${
                          phase > p ? 'bg-amber-500' : 'bg-stone-700'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ============================================================ */}
            {/* PHASE 1: Business Information */}
            {/* ============================================================ */}
            {phase === 1 && (
              <form onSubmit={handlePhase1Submit} className="bg-stone-800 rounded-2xl shadow-xl p-8 border border-stone-700">
                <h2 className="text-2xl font-bold text-white mb-6">
                  Business Information
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Legal Name (as per CIPC) *
                    </label>
                    <input
                      type="text"
                      value={businessData.legalName}
                      onChange={(e) => setBusinessData({ ...businessData, legalName: e.target.value })}
                      className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Registration Number (optional)
                    </label>
                    <input
                      type="text"
                      value={businessData.registrationNumber}
                      onChange={(e) => setBusinessData({ ...businessData, registrationNumber: e.target.value })}
                      className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      VAT Number (optional)
                    </label>
                    <input
                      type="text"
                      value={businessData.vatNumber}
                      onChange={(e) => setBusinessData({ ...businessData, vatNumber: e.target.value })}
                      className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Trading Name *
                    </label>
                    <input
                      type="text"
                      value={businessData.tradingName}
                      onChange={(e) => setBusinessData({ ...businessData, tradingName: e.target.value })}
                      className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white"
                      required
                    />
                  </div>
                </div>

                {/* Physical Address */}
                <h3 className="text-lg font-semibold text-white mt-6 mb-4 border-b border-stone-700 pb-2">
                  Physical Address
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      value={businessData.physicalStreet}
                      onChange={(e) => {
                        setBusinessData({ ...businessData, physicalStreet: e.target.value });
                        if (businessData.sameAsPhysical) {
                          setBusinessData(prev => ({ ...prev, postalStreet: e.target.value }));
                        }
                      }}
                      className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      City / Town *
                    </label>
                    <input
                      type="text"
                      value={businessData.physicalCity}
                      onChange={(e) => {
                        setBusinessData({ ...businessData, physicalCity: e.target.value });
                        if (businessData.sameAsPhysical) {
                          setBusinessData(prev => ({ ...prev, postalCity: e.target.value }));
                        }
                      }}
                      className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Province *
                    </label>
                    <select
                      value={businessData.physicalProvince}
                      onChange={(e) => {
                        setBusinessData({ ...businessData, physicalProvince: e.target.value });
                        if (businessData.sameAsPhysical) {
                          setBusinessData(prev => ({ ...prev, postalProvince: e.target.value }));
                        }
                      }}
                      className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white"
                      required
                    >
                      <option value="">Select Province</option>
                      {PROVINCES.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Country *
                    </label>
                    <select
                      value={businessData.physicalCountry}
                      onChange={(e) => {
                        setBusinessData({ ...businessData, physicalCountry: e.target.value });
                        if (businessData.sameAsPhysical) {
                          setBusinessData(prev => ({ ...prev, postalCountry: e.target.value }));
                        }
                      }}
                      className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white"
                    >
                      {SADC_COUNTRIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      value={businessData.physicalPostalCode}
                      onChange={(e) => {
                        setBusinessData({ ...businessData, physicalPostalCode: e.target.value });
                        if (businessData.sameAsPhysical) {
                          setBusinessData(prev => ({ ...prev, postalPostalCode: e.target.value }));
                        }
                      }}
                      className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white"
                    />
                  </div>
                </div>

                {/* Postal Address */}
                <h3 className="text-lg font-semibold text-white mt-6 mb-4 border-b border-stone-700 pb-2">
                  Postal Address
                </h3>
                <div className="mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={businessData.sameAsPhysical}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        setBusinessData(prev => ({ ...prev, sameAsPhysical: isChecked }));
                        if (isChecked) {
                          setBusinessData(prev => ({
                            ...prev,
                            postalStreet: prev.physicalStreet,
                            postalCity: prev.physicalCity,
                            postalProvince: prev.physicalProvince,
                            postalCountry: prev.physicalCountry,
                            postalPostalCode: prev.physicalPostalCode
                          }));
                        }
                      }}
                      className="w-4 h-4 rounded border-stone-600 bg-stone-700"
                    />
                    <span className="text-stone-300">Same as physical address</span>
                  </label>
                </div>
                
                {!businessData.sameAsPhysical && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-stone-300 mb-1">
                        Street Address
                      </label>
                      <input
                        type="text"
                        value={businessData.postalStreet}
                        onChange={(e) => setBusinessData({ ...businessData, postalStreet: e.target.value })}
                        className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-300 mb-1">
                        City / Town
                      </label>
                      <input
                        type="text"
                        value={businessData.postalCity}
                        onChange={(e) => setBusinessData({ ...businessData, postalCity: e.target.value })}
                        className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-300 mb-1">
                        Province
                      </label>
                      <select
                        value={businessData.postalProvince}
                        onChange={(e) => setBusinessData({ ...businessData, postalProvince: e.target.value })}
                        className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white"
                      >
                        <option value="">Select Province</option>
                        {PROVINCES.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-300 mb-1">
                        Country
                      </label>
                      <select
                        value={businessData.postalCountry}
                        onChange={(e) => setBusinessData({ ...businessData, postalCountry: e.target.value })}
                        className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white"
                      >
                        {SADC_COUNTRIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-300 mb-1">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        value={businessData.postalPostalCode}
                        onChange={(e) => setBusinessData({ ...businessData, postalPostalCode: e.target.value })}
                        className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white"
                      />
                    </div>
                  </div>
                )}

                {/* Contact Information */}
                <h3 className="text-lg font-semibold text-white mt-6 mb-4 border-b border-stone-700 pb-2">
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={businessData.email}
                      onChange={(e) => setBusinessData({ ...businessData, email: e.target.value })}
                      className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Confirm Email Address *
                    </label>
                    <input
                      type="email"
                      value={businessData.confirmEmail}
                      onChange={(e) => setBusinessData({ ...businessData, confirmEmail: e.target.value })}
                      className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Fixed Phone Number
                    </label>
                    <input
                      type="tel"
                      value={businessData.fixedPhone}
                      onChange={(e) => setBusinessData({ ...businessData, fixedPhone: e.target.value })}
                      className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Mobile Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={businessData.mobilePhone}
                      onChange={(e) => setBusinessData({ ...businessData, mobilePhone: e.target.value })}
                      className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white"
                      required
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Website URL
                    </label>
                    <input
                      type="url"
                      value={businessData.website}
                      onChange={(e) => setBusinessData({ ...businessData, website: e.target.value })}
                      className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white"
                      placeholder="https://example.com"
                    />
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-amber-500 text-stone-900 rounded-lg font-semibold hover:bg-amber-600"
                  >
                    Next →
                  </button>
                </div>
              </form>
            )}

            {/* ============================================================ */}
            {/* PHASE 2: Director Details */}
            {/* ============================================================ */}
            {phase === 2 && (
              <form onSubmit={handlePhase2Submit} className="bg-stone-800 rounded-2xl shadow-xl p-8 border border-stone-700">
                <h2 className="text-2xl font-bold text-white mb-6">
                  Director / Owner Information
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={directorData.name}
                      onChange={(e) => setDirectorData({ ...directorData, name: e.target.value })}
                      className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Last Name / Surname *
                    </label>
                    <input
                      type="text"
                      value={directorData.surname}
                      onChange={(e) => setDirectorData({ ...directorData, surname: e.target.value })}
                      className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      ID / Passport Number *
                    </label>
                    <input
                      type="text"
                      value={directorData.idNumber}
                      onChange={(e) => setDirectorData({ ...directorData, idNumber: e.target.value })}
                      className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Upload ID / Passport Photo *
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleDirectorIdUpload}
                      className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white file:mr-2 file:py-1 file:px-3 file:rounded-full file:bg-amber-500 file:text-white file:border-0"
                      required
                    />
                    {directorData.idPhotoPreview && (
                      <div className="mt-2">
                        <img
                          src={directorData.idPhotoPreview}
                          alt="ID Preview"
                          className="h-20 w-auto rounded border border-stone-600"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Address */}
                <h3 className="text-lg font-semibold text-white mt-6 mb-4 border-b border-stone-700 pb-2">
                  Address
                </h3>
                <div className="mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={directorData.sameAddress}
                      onChange={(e) => setDirectorData({ ...directorData, sameAddress: e.target.checked })}
                      className="w-4 h-4 rounded border-stone-600 bg-stone-700"
                    />
                    <span className="text-stone-300">Same as business address</span>
                  </label>
                </div>
                
                {!directorData.sameAddress && (
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Residential Address
                    </label>
                    <textarea
                      rows={3}
                      value={directorData.address}
                      onChange={(e) => setDirectorData({ ...directorData, address: e.target.value })}
                      className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white"
                    />
                  </div>
                )}

                {/* Contact Information */}
                <h3 className="text-lg font-semibold text-white mt-6 mb-4 border-b border-stone-700 pb-2">
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={directorData.email}
                      onChange={(e) => setDirectorData({ ...directorData, email: e.target.value })}
                      className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Confirm Email Address *
                    </label>
                    <input
                      type="email"
                      value={directorData.confirmEmail}
                      onChange={(e) => setDirectorData({ ...directorData, confirmEmail: e.target.value })}
                      className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Fixed Phone Number
                    </label>
                    <input
                      type="tel"
                      value={directorData.fixedPhone}
                      onChange={(e) => setDirectorData({ ...directorData, fixedPhone: e.target.value })}
                      className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Mobile Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={directorData.mobilePhone}
                      onChange={(e) => setDirectorData({ ...directorData, mobilePhone: e.target.value })}
                      className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white"
                      required
                    />
                  </div>
                </div>

                {/* Acknowledgement */}
                <div className="mt-6 p-4 bg-stone-700/30 rounded-lg border border-stone-600">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={directorData.acknowledgeCorrect}
                      onChange={(e) => setDirectorData({ ...directorData, acknowledgeCorrect: e.target.checked })}
                      className="mt-1 w-4 h-4 rounded border-stone-600 bg-stone-700"
                    />
                    <span className="text-stone-300 text-sm">
                      I hereby acknowledge that all the information provided above is true, correct,
                      and complete to the best of my knowledge.
                    </span>
                  </label>
                </div>

                <div className="mt-8 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setPhase(1)}
                    className="px-6 py-2 bg-stone-700 text-white rounded-lg font-semibold hover:bg-stone-600"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-amber-500 text-stone-900 rounded-lg font-semibold hover:bg-amber-600"
                  >
                    Next →
                  </button>
                </div>
              </form>
            )}

            {/* ============================================================ */}
            {/* PHASE 3: Waiver & Submission */}
            {/* ============================================================ */}
            {phase === 3 && (
              <form onSubmit={handleFinalSubmit} className="bg-stone-800 rounded-2xl shadow-xl p-8 border border-stone-700">
                <h2 className="text-2xl font-bold text-white mb-6">
                  Waiver & Agreement
                </h2>
                
                {/* Waiver Text */}
                <div className="bg-stone-700/30 rounded-lg p-6 mb-6 border border-stone-600 max-h-80 overflow-y-auto">
                  <h3 className="text-lg font-bold text-white mb-4">
                    FastCheckin Platform Waiver
                  </h3>
                  <div className="space-y-4 text-stone-300 text-sm">
                    <p>
                      <strong>1. Acceptance of Terms</strong>
                      <br />
                      By using the FastCheckin platform, you agree to be bound by these terms and conditions.
                    </p>
                    <p>
                      <strong>2. Platform Usage</strong>
                      <br />
                      FastCheckin provides a digital check-in solution for accommodations. The platform is provided "as is" without warranties.
                    </p>
                    <p>
                      <strong>3. Limitation of Liability</strong>
                      <br />
                      To the maximum extent permitted by law, FastCheckin shall not be liable for any indirect, incidental, special, consequential, or punitive damages.
                    </p>
                    <p>
                      <strong>4. Data Processing</strong>
                      <br />
                      You acknowledge that guest data is processed in accordance with POPIA and our Privacy Policy.
                    </p>
                    <p>
                      <strong>5. Indemnification</strong>
                      <br />
                      You agree to indemnify and hold FastCheckin harmless from any claims arising from your use of the platform.
                    </p>
                    <p>
                      <strong>6. Termination</strong>
                      <br />
                      FastCheckin reserves the right to suspend or terminate access for violation of these terms.
                    </p>
                    <p>
                      <strong>7. Governing Law</strong>
                      <br />
                      This agreement shall be governed by the laws of the Republic of South Africa.
                    </p>
                  </div>
                </div>

                {/* Waiver Acceptance */}
                <div className="mb-6 p-4 bg-stone-700/30 rounded-lg border border-stone-600">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={waiverAccepted}
                      onChange={(e) => setWaiverAccepted(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-stone-600 bg-stone-700"
                    />
                    <span className="text-stone-300 text-sm">
                      I have read, understood, and agree to the terms of this waiver and the FastCheckin platform agreement.
                    </span>
                  </label>
                </div>

                {/* Application Summary */}
                <div className="bg-stone-700/20 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-white mb-2">
                    Application Summary
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm text-stone-400">
                    <p>Business: <span className="text-white">{businessData.tradingName}</span></p>
                    <p>Plan: <span className="text-white">{selectedPlanId === 'enterprise' ? 'Enterprise' : selectedPlan?.name}</span></p>
                    <p>Rooms: <span className="text-white">{roomsCount}</span></p>
                    <p>Director: <span className="text-white">{directorData.name} {directorData.surname}</span></p>
                    <p>Email: <span className="text-white">{businessData.email}</span></p>
                    <p>Phone: <span className="text-white">{businessData.mobilePhone}</span></p>
                  </div>
                </div>

                {/* CAPTCHA */}
                <div className="bg-stone-700/30 rounded-lg p-4 mb-6">
                  <div className="text-center mb-4">
                    <p className="text-2xl font-mono tracking-wider text-white">
                      {captchaText}
                    </p>
                  </div>
                  <input
                    type="text"
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                    placeholder="Enter CAPTCHA code"
                    className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={generateCaptcha}
                    className="text-sm text-amber-500 hover:text-amber-400 mt-2"
                  >
                    Refresh CAPTCHA
                  </button>
                </div>

                <div className="mt-8 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setPhase(2)}
                    className="px-6 py-2 bg-stone-700 text-white rounded-lg font-semibold hover:bg-stone-600"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Submitting...' : 'Submit Application →'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
