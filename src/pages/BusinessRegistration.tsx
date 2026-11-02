import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from '../i18n/useTranslation';
import { PACKAGES, PLAN_ORDER, type PlanType } from '../config/packages';
import { calculateSubscriptionMonthlyPrice, calculateSubscriptionAnnualPrice, calculateEnterprisePortfolioMonthlyPrice, convertZarToRegionalPrice, getRegionalPricing, MARKETING_DOWNLOAD_MONTHLY_PRICE, MARKETING_DOWNLOAD_VOUCHER_PRICE } from '../config/pricing';
import PricingComingSoonModal from '../components/PricingComingSoonModal';
import { useMarket } from '../context/MarketContext';

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

// Establishment Types
const ESTABLISHMENT_TYPES = [
  'Hotel',
  'Bed & Breakfast (B&B)',
  'Guest House',
  'Campsite',
  'Resort',
  'Lodge',
  'Self-Catering'
];

// TGSA Grading Options
const TGSA_GRADING = [
  'NA',
  '1★',
  '2★',
  '3★',
  '4★',
  '5★'
];

// Regions/Provinces by Country (FULL DATA FOR ALL SADC COUNTRIES)
const REGIONS_BY_COUNTRY: Record<string, string[]> = {
  'South Africa': [
    'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal',
    'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape'
  ],
  'Angola': [
    'Bengo', 'Benguela', 'Bié', 'Cabinda', 'Cuando Cubango', 'Cuanza Norte',
    'Cuanza Sul', 'Cunene', 'Huambo', 'Huíla', 'Luanda', 'Lunda Norte',
    'Lunda Sul', 'Malanje', 'Moxico', 'Namibe', 'Uíge', 'Zaire'
  ],
  'Botswana': [
    'Central', 'Chobe', 'Francistown', 'Gaborone', 'Ghanzi', 'Jwaneng',
    'Kgalagadi', 'Kgatleng', 'Kweneng', 'Lobatse', 'Ngamiland', 'North-East',
    'Orapa', 'Selibe Phikwe', 'South-East', 'Southern', 'Sowa Town'
  ],
  'Comoros': [
    'Anjouan', 'Grande Comore', 'Mohéli'
  ],
  'Democratic Republic of Congo': [
    'Bandundu', 'Bas-Congo', 'Équateur', 'Kasai-Occidental', 'Kasai-Oriental',
    'Katanga', 'Kinshasa', 'Maniema', 'Nord-Kivu', 'Orientale', 'Sud-Kivu'
  ],
  'Eswatini': [
    'Hhohho', 'Lubombo', 'Manzini', 'Shiselweni'
  ],
  'Lesotho': [
    'Berea', 'Butha-Buthe', 'Leribe', 'Mafeteng', 'Maseru',
    'Mohale\'s Hoek', 'Mokhotlong', 'Qacha\'s Nek', 'Quthing', 'Thaba-Tseka'
  ],
  'Madagascar': [
    'Antananarivo', 'Antsiranana', 'Fianarantsoa', 'Mahajanga', 'Toamasina', 'Toliara'
  ],
  'Malawi': [
    'Central Region', 'Northern Region', 'Southern Region'
  ],
  'Mauritius': [
    'Black River', 'Flacq', 'Grand Port', 'Moka', 'Pamplemousses', 'Plaines Wilhems',
    'Port Louis', 'Rivière du Rempart', 'Savanne', 'Rodrigues'
  ],
  'Mozambique': [
    'Cabo Delgado', 'Gaza', 'Inhambane', 'Manica', 'Maputo City', 'Maputo Province',
    'Nampula', 'Niassa', 'Sofala', 'Tete', 'Zambezia'
  ],
  'Namibia': [
    'Erongo', 'Hardap', 'Karas', 'Kavango East', 'Kavango West', 'Khomas',
    'Kunene', 'Ohangwena', 'Omaheke', 'Omusati', 'Oshana', 'Oshikoto', 'Otjozondjupa', 'Zambezi'
  ],
  'Seychelles': [
    'Anse aux Pins', 'Anse Boileau', 'Anse Etoile', 'Anse Royale', 'Au Cap',
    'Baie Lazare', 'Baie Sainte Anne', 'Beau Vallon', 'Bel Air', 'Bel Ombre',
    'Cascade', 'English River', 'Glacis', 'Grand Anse Mahe', 'Grand Anse Praslin',
    'La Digue', 'Les Mamelles', 'Mont Buxton', 'Mont Fleuri', 'Plaisance',
    'Pointe Larue', 'Port Glaud', 'Roche Caiman', 'Saint Louis', 'Takamaka'
  ],
  'Tanzania': [
    'Arusha', 'Dar es Salaam', 'Dodoma', 'Geita', 'Iringa', 'Kagera', 'Katavi',
    'Kigoma', 'Kilimanjaro', 'Lindi', 'Manyara', 'Mara', 'Mbeya', 'Morogoro',
    'Mtwara', 'Mwanza', 'Njombe', 'Pemba North', 'Pemba South', 'Pwani', 'Rukwa',
    'Ruvuma', 'Shinyanga', 'Simiyu', 'Singida', 'Songwe', 'Tabora', 'Tanga',
    'Zanzibar North', 'Zanzibar South', 'Zanzibar West'
  ],
  'Zambia': [
    'Central', 'Copperbelt', 'Eastern', 'Luapula', 'Lusaka', 'Muchinga',
    'Northern', 'North-Western', 'Southern', 'Western'
  ],
  'Zimbabwe': [
    'Bulawayo', 'Harare', 'Manicaland', 'Mashonaland Central', 'Mashonaland East',
    'Mashonaland West', 'Masvingo', 'Matabeleland North', 'Matabeleland South', 'Midlands'
  ]
};

// Get region label based on country
const getRegionLabel = (country: string): string => {
  const labels: Record<string, string> = {
    'South Africa': 'Province',
    'Botswana': 'District',
    'Namibia': 'Region',
    'Zimbabwe': 'Province',
    'Mozambique': 'Province',
    'Zambia': 'Province',
    'Angola': 'Province',
    'Lesotho': 'District',
    'Eswatini': 'Region',
    'Malawi': 'Region',
    'Mauritius': 'District',
    'Tanzania': 'Region',
    'Democratic Republic of Congo': 'Province',
    'Seychelles': 'District',
    'Madagascar': 'Region',
    'Comoros': 'Island'
  };
  return labels[country] || 'Region';
};

// Package display metadata comes from the shared package registry; all amounts are calculated by the shared pricing engine.
const pricingStyles = {
  starter: { color: 'green', borderColor: 'border-green-500', textColor: 'text-green-500', buttonColor: 'bg-green-600 hover:bg-green-700', bgHover: 'hover:border-green-500' },
  growth: { color: 'blue', borderColor: 'border-blue-500', textColor: 'text-blue-500', buttonColor: 'bg-blue-600 hover:bg-blue-700', bgHover: 'hover:border-blue-500' },
  pro: { color: 'purple', borderColor: 'border-purple-500', textColor: 'text-purple-500', buttonColor: 'bg-purple-600 hover:bg-purple-700', bgHover: 'hover:border-purple-500' },
  business: { color: 'orange', borderColor: 'border-orange-500', textColor: 'text-orange-500', buttonColor: 'bg-orange-600 hover:bg-orange-700', bgHover: 'hover:border-orange-500' },
} as const;
const PLAN_MAX_ROOMS: Record<Exclude<PlanType, 'enterprise'>, number> = {
  starter: 5,
  growth: 10,
  pro: 20,
  business: Number.POSITIVE_INFINITY,
};
const pricingPlans = PLAN_ORDER.filter((id) => id !== 'enterprise').map((id) => ({
  ...PACKAGES[id],
  ...pricingStyles[id as Exclude<PlanType, 'enterprise'>],
}));

export default function BusinessRegistration() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { region, isSouthAfricanMarket, fxRates } = useMarket();
  const regionalPricing = getRegionalPricing(region, isSouthAfricanMarket, fxRates);
  const currencySymbol = regionalPricing.currency === 'ZAR' ? 'R' : regionalPricing.currency === 'EUR' ? '€' : '$';
  const marketingDownloadMonthlyPrice = convertZarToRegionalPrice(MARKETING_DOWNLOAD_MONTHLY_PRICE, region, isSouthAfricanMarket, fxRates);
  const marketingDownloadVoucherPrice = convertZarToRegionalPrice(MARKETING_DOWNLOAD_VOUCHER_PRICE, region, isSouthAfricanMarket, fxRates);
  
  // 🚀 SCROLL TO TOP ON PAGE LOAD (Global fix)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);
  
  // Phase Management
  const [phase, setPhase] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Plan Selection State
  const [selectedPlanId, setSelectedPlanId] = useState('starter');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [propertyCount, setPropertyCount] = useState(1);
  const [roomsCount, setRoomsCount] = useState(5);
  const [showRoomError, setShowRoomError] = useState(false);
  const [enterpriseInquiryOpen, setEnterpriseInquiryOpen] = useState(false);
  
  // Get selected plan data
  const selectedPlanBase = pricingPlans.find(p => p.id === selectedPlanId);
  const selectedPlan = selectedPlanBase ? {
    ...selectedPlanBase,
    priceMonthly: calculateSubscriptionMonthlyPrice(Math.max(roomsCount, selectedPlanBase.minRooms), selectedPlanBase.id),
    priceYearly: calculateSubscriptionAnnualPrice(Math.max(roomsCount, selectedPlanBase.minRooms), selectedPlanBase.id),
  } : undefined;
  
  // Determine recommended plan based on room count
  const getRecommendedPlanId = (): PlanType => {
    // A qualifying multi-establishment portfolio should be guided to Enterprise,
    // even when the combined room count would otherwise recommend Business.
    if (propertyCount >= 2 && roomsCount >= 21) return 'enterprise';
    if (roomsCount < 6) return 'starter';
    if (roomsCount < 11) return 'growth';
    if (roomsCount < 21) return 'pro';
    return 'business';
  };
  const recommendedPlanId = getRecommendedPlanId();
  
  // Phase 1: Business Information (ADDED establishmentType and tgsaGrading)
  const [businessData, setBusinessData] = useState({
    legalName: '',
    registrationNumber: '',
    vatNumber: '',
    tradingName: '',
    establishmentType: '',
    tgsaGrading: 'NA',
    physicalStreet: '',
    physicalCity: '',
    physicalProvince: '',
    physicalCountry: 'South Africa',
    physicalPostalCode: '',
    sameAsPhysical: false,
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

  // Get available provinces for selected country
  const availableProvinces = REGIONS_BY_COUNTRY[businessData.physicalCountry] || [];
  const translateRegionLabel = (country: string): string => {
    switch (getRegionLabel(country)) {
      case 'Province': return t('reg_region_province');
      case 'District': return t('reg_region_district');
      case 'Region': return t('reg_region_region');
      case 'Island': return t('reg_region_island');
      default: return t('reg_region_region');
    }
  };
  const regionLabel = translateRegionLabel(businessData.physicalCountry);
  const postalRegionLabel = translateRegionLabel(businessData.postalCountry);

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
    if (rooms < 6) setSelectedPlanId('starter');
    else if (rooms < 11) setSelectedPlanId('growth');
    else if (rooms < 21) setSelectedPlanId('pro');
    else setSelectedPlanId('business');
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
    if (plan && roomsCount > PLAN_MAX_ROOMS[planId as Exclude<PlanType, 'enterprise'>]) {
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
      alert(t('error_upload_image'));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert(t('reg_file_size_limit'));
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

  // Validate Phase 1 (UPDATED to include establishmentType)
  const validatePhase1 = (): boolean => {
    if (!businessData.legalName) {
      alert(t('error_required', { field: t('login_legal_name') }));
      return false;
    }
    if (!businessData.tradingName) {
      alert(t('error_required', { field: t('dashboard_trading_name') }));
      return false;
    }
    if (!businessData.establishmentType) {
      alert(t('reg_select_establishment'));
      return false;
    }
    if (!businessData.physicalStreet) {
      alert(t('error_required', { field: t('login_physical_address') }));
      return false;
    }
    if (!businessData.physicalCity) {
      alert(t('error_city_required'));
      return false;
    }
    if (!businessData.physicalCountry) {
      alert(t('error_country_required'));
      return false;
    }
    if (!businessData.physicalProvince) {
      alert(t('reg_region_required', { region: regionLabel }));
      return false;
    }
    if (!businessData.email) {
      alert(t('error_invalid_email'));
      return false;
    }
    if (businessData.email !== businessData.confirmEmail) {
      alert(t('error_passwords_mismatch'));
      return false;
    }
    if (!businessData.mobilePhone) {
      alert(t('error_phone_required'));
      return false;
    }
    return true;
  };

  // Validate Phase 2
  const validatePhase2 = (): boolean => {
    if (!directorData.name) {
      alert(t('error_first_name_required'));
      return false;
    }
    if (!directorData.surname) {
      alert(t('error_last_name_required'));
      return false;
    }
    if (!directorData.idNumber) {
      alert(t('error_passport_required'));
      return false;
    }
    if (!directorData.idPhoto) {
      alert(t('error_photo_required'));
      return false;
    }
    if (!directorData.email) {
      alert(t('error_invalid_email'));
      return false;
    }
    if (directorData.email !== directorData.confirmEmail) {
      alert(t('error_passwords_mismatch'));
      return false;
    }
    if (!directorData.acknowledgeCorrect) {
      alert(t('error_required', { field: t('login_acknowledgement') }));
      return false;
    }
    return true;
  };

  // Phase 1 Submit
  const handlePhase1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validatePhase1()) {
      setPhase(2);
      setTimeout(() => {
        document.getElementById('registration-form')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  // Phase 2 Submit
  const handlePhase2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validatePhase2()) {
      setPhase(3);
      setTimeout(() => {
        document.getElementById('registration-form')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  // Final Submit (UPDATED to include registered_name and establishment_type and tgsa_grading)
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (captchaInput.toUpperCase() !== captchaText) {
      alert(t('error_unexpected'));
      generateCaptcha();
      setCaptchaInput('');
      return;
    }
    
    if (!waiverAccepted) {
      alert(t('error_indemnity_required'));
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/.netlify/functions/register-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business: {
            // REQUIRED FIELDS
            registered_name: businessData.legalName,  // ← CRITICAL: This is the NOT NULL column
            legal_name: businessData.legalName,
            trading_name: businessData.tradingName,
            email: businessData.email,
            mobile_phone: businessData.mobilePhone,
            
            // Optional fields
            registration_number: businessData.registrationNumber,
            vat_number: businessData.vatNumber,
            establishment_type: businessData.establishmentType,
            tgsa_grading: businessData.tgsaGrading,
            fixed_phone: businessData.fixedPhone,
            website: businessData.website,
            
            // Addresses
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
            
            // Director info
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
            
            // Plan details
            total_rooms: roomsCount,
            plan: selectedPlanId === 'enterprise' ? 'enterprise' : selectedPlanId,
            max_rooms: null,
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
      alert(t('error_unexpected'));
    } finally {
      setLoading(false);
    }
  };

  // Scroll to registration form
  const scrollToRegistration = () => {
    document.getElementById('registration-form')?.scrollIntoView({ behavior: 'smooth' });
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
                <p className="text-sm text-stone-400">{t('login_selected_plan')}</p>
                <p className="font-bold text-white">
                  {selectedPlanId === 'enterprise' ? 'Enterprise' : selectedPlan?.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-stone-400">{t('login_rooms_label')}</p>
                <p className="text-white">
                  {roomsCount} {t('landing_plan_room_plural')}
                </p>
              </div>
              <div>
                <p className="text-sm text-stone-400">{t('login_price_label')}</p>
                <p className="text-white">
                  {selectedPlanId === 'enterprise'
                    ? `${currencySymbol}${(convertZarToRegionalPrice(propertyCount >= 2 && roomsCount >= 21 ? calculateEnterprisePortfolioMonthlyPrice(roomsCount, propertyCount) : 0, region, isSouthAfricanMarket, fxRates) * (billingCycle === 'monthly' ? 1 : 11)).toLocaleString('en-US')}${billingCycle === 'monthly' ? t('landing_plan_per_month') : t('landing_plan_per_year')}`
                    : (billingCycle === 'monthly'
                      ? `${currencySymbol}${convertZarToRegionalPrice(selectedPlan?.priceMonthly || 0, region, isSouthAfricanMarket, fxRates)}/month`
                      : `${currencySymbol}${convertZarToRegionalPrice(selectedPlan?.priceMonthly || 0, region, isSouthAfricanMarket, fxRates) * 11}/year`)}
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
              {t('login_change_plan')}
            </button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto py-12 px-4">
        {/* Header with Logo */}
        <div id="form-top" className="text-center mb-8">
          <img
            src="/fastcheckin-logo.png"
            alt="FastCheckin"
            className="h-16 w-auto mx-auto mb-4 object-contain"
          />
          <h1 className="text-4xl font-bold text-white">{t('reg_register_business')}</h1>
          <p className="text-stone-400 mt-2">{t('reg_register_intro')}</p>
          <p className="text-stone-500 text-xs mt-3">{t('landing_plan_region_pricing_note', { currency: regionalPricing.currency })}</p>
        </div>

        {/* ============================================================ */}
        {/* PRICING SECTION - MUST APPEAR FIRST */}
        {/* ============================================================ */}
        <div id="pricing-section" className="mb-12">
          
          {/* Property count comes first because Enterprise pricing includes portfolio fees. */}
          <div className="max-w-md mx-auto mb-6 text-center">
            <label className="block text-lg font-medium text-stone-300 mb-3">
              {t('login_property_count_question')}
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={propertyCount}
              onChange={(e) => {
                const nextPropertyCount = Math.max(1, Math.floor(parseInt(e.target.value, 10) || 1));
                setPropertyCount(nextPropertyCount);
                if (nextPropertyCount >= 2 && roomsCount < 21) {
                  setRoomsCount(21);
                  setShowRoomError(false);
                }
              }}
              className="w-full px-4 py-3 bg-stone-800 border border-stone-600 rounded-xl focus:ring-2 focus:ring-amber-500 text-white text-center text-2xl font-semibold"
            />
            <p className="text-stone-500 text-sm mt-2">
              {t('login_property_count_help')}
            </p>
          </div>

          <div className="max-w-md mx-auto mb-10 text-center">
            <label className="block text-lg font-medium text-stone-300 mb-3">
              {t('login_rooms_count_question')}
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={roomsCount}
              onChange={(e) => handleRoomsChange(Math.max(1, Math.floor(parseInt(e.target.value, 10) || 1)))}
              className="w-full px-4 py-3 bg-stone-800 border border-stone-600 rounded-xl focus:ring-2 focus:ring-amber-500 text-white text-center text-2xl font-semibold"
            />
            <p className="text-stone-500 text-sm mt-2">
              {t('login_rooms_count_help')}
            </p>
          </div>

          {showRoomError && (
            <div className="max-w-md mx-auto mb-6 bg-red-500/20 border border-red-500 rounded-lg p-3 text-center">
              <p className="text-red-400 text-sm">
                ⚠️ {t('billing_min_plan_rooms')}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {pricingPlans.map((plan) => {
              const pricingRooms = Math.max(roomsCount, plan.minRooms);
              const displayMonthlyPrice = calculateSubscriptionMonthlyPrice(pricingRooms, plan.id);
              const isRecommended = recommendedPlanId === plan.id;
              const isSelected = selectedPlanId === plan.id;
              const isDisabled = roomsCount > PLAN_MAX_ROOMS[plan.id as Exclude<PlanType, 'enterprise'>];
              
              return (
                <div
                  key={plan.id}
                  onClick={() => !isDisabled && handleSelectPlan(plan.id)}
                  className={`
                    relative rounded-xl border-2 p-5 cursor-pointer transition-all
                    ${isRecommended
                      ? `${plan.borderColor} bg-stone-800 scale-105 shadow-lg ring-2 ring-green-500/50`
                      : 'border-stone-700 bg-stone-800/50'}
                    ${isDisabled ? 'cursor-not-allowed' : 'hover:scale-105 hover:shadow-xl'}
                  `}
                >
                  {isRecommended && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        {t('landing_plan_recommended')}
                      </span>
                    </div>
                  )}

                  <div className="text-center">
                    <h3 className={`text-xl font-bold ${plan.textColor}`}>
                      {plan.name}
                    </h3>
                    <p className="text-xs text-stone-400 mt-1">
                      {plan.minRooms}+ {t('landing_plan_room_plural')} · {t('landing_plan_capacity_note')}
                    </p>
                    {(plan.id === 'starter' || plan.id === 'growth') && <p className="text-xs text-stone-400 mt-1">{t('reg_marketing_download_offer', { monthlyPrice: `${currencySymbol}${marketingDownloadMonthlyPrice}`, voucherPrice: `${currencySymbol}${marketingDownloadVoucherPrice}` })}</p>}
                    <div className="mt-3">
                      {!isDisabled ? (
                        <>
                          <span className="text-2xl font-bold text-white">
                            {billingCycle === 'monthly' ? `${currencySymbol}${convertZarToRegionalPrice(displayMonthlyPrice, region, isSouthAfricanMarket, fxRates)}` : `${currencySymbol}${convertZarToRegionalPrice(displayMonthlyPrice, region, isSouthAfricanMarket, fxRates) * 11}`}
                          </span>
                          <span className="text-stone-400 text-sm">
                            {billingCycle === 'monthly' ? t('landing_plan_per_month') : t('landing_plan_per_year')}
                          </span>
                        </>
                      ) : (
                        <p className="text-sm text-stone-300">{t('reg_plan_requires_rooms', { count: plan.minRooms })}</p>
                      )}
                    </div>
                    <div className="mt-4 text-left space-y-2">
                      {plan.id === 'starter' && (
                        <>
                          <p className="text-xs text-stone-300 flex items-center gap-2"><span className="text-green-500">✓</span> {t('checkin_title')}</p>
                          <p className="text-xs text-stone-300 flex items-center gap-2"><span className="text-green-500">✓</span> {t('landing_plan_starter_f1')}</p>
                          <p className="text-xs text-stone-300 flex items-center gap-2"><span className="text-green-500">✓</span> {t('landing_plan_growth_f2')}</p>
                          <p className="text-xs text-stone-300 flex items-center gap-2"><span className="text-green-500">✓</span> {t('reg_basic_dashboard')}</p>
                        </>
                      )}
                      {plan.id === 'growth' && (
                        <>
                          <p className="text-xs text-stone-300 flex items-center gap-2"><span className="text-green-500">✓</span> <span className="font-semibold">{t('landing_plan_growth_f1')}</span></p>
                          <p className="text-xs text-stone-300 flex items-center gap-2"><span className="text-green-500">✓</span> {t('login_multi_room_management')}</p>
                          <p className="text-xs text-stone-300 flex items-center gap-2"><span className="text-green-500">✓</span> {t('landing_plan_growth_f3')}</p>
                          <p className="text-xs text-stone-300 flex items-center gap-2"><span className="text-green-500">✓</span> {t('login_basic_reporting')}</p>
                          <p className="text-xs text-stone-300 flex items-center gap-2"><span className="text-green-500">✓</span> {t('landing_plan_business_f3')}</p>
                        </>
                      )}
                      {plan.id === 'pro' && (
                        <>
                          <p className="text-xs text-stone-300 flex items-center gap-2"><span className="text-green-500">✓</span> <span className="font-semibold">{t('landing_plan_pro_f1')}</span></p>
                          <p className="text-xs text-stone-300 flex items-center gap-2"><span className="text-green-500">✓</span> {t('login_advanced_reporting')}</p>
                          <p className="text-xs text-stone-300 flex items-center gap-2"><span className="text-green-500">✓</span> {t('landing_plan_pro_f2')}</p>
                          <p className="text-xs text-stone-300 flex items-center gap-2"><span className="text-green-500">✓</span> {t('landing_plan_starter_f3')}</p>
                        </>
                      )}
                      {plan.id === 'business' && (
                        <>
                          <p className="text-xs text-stone-300 flex items-center gap-2"><span className="text-green-500">✓</span> <span className="font-semibold">{t('landing_plan_business_f1')}</span></p>
                          <p className="text-xs text-stone-300 flex items-center gap-2"><span className="text-green-500">✓</span> {t('landing_plan_pro_f4')}</p>
                          <p className="text-xs text-stone-300 flex items-center gap-2"><span className="text-green-500">✓</span> {t('login_staff_permissions')}</p>
                          <p className="text-xs text-stone-300 flex items-center gap-2"><span className="text-green-500">✓</span> {t('login_api_integrations')}</p>
                        </>
                      )}
                    </div>
                    {isDisabled && (
                      <p className="text-xs text-red-400 mt-2">
                        {t('billing_min_plan_rooms')}
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
                      {t('login_select_plan')}
                    </button>
                  </div>
                </div>
              );
            })}

            <div
              className={`relative rounded-xl border-2 p-5 transition-all bg-stone-800/50
                ${recommendedPlanId === 'enterprise'
                  ? 'border-purple-500 ring-2 ring-green-500/50 scale-105 shadow-lg'
                  : 'border-stone-700'}`}
            >
              {recommendedPlanId === 'enterprise' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {t('landing_plan_recommended')}
                  </span>
                </div>
              )}
              <div className="text-center">
                <h3 className="text-xl font-bold text-purple-400">
                  Enterprise
                </h3>
                <p className="text-xs text-stone-400 mt-1">
                  {t('reg_enterprise_portfolio_scope')}
                </p>
                <div className="mt-3">
                  {propertyCount >= 2 && roomsCount >= 21 ? (
                    <>
                      <span className="text-2xl font-bold text-white">
                        {currencySymbol}{convertZarToRegionalPrice(calculateEnterprisePortfolioMonthlyPrice(roomsCount, propertyCount), region, isSouthAfricanMarket, fxRates) * (billingCycle === 'monthly' ? 1 : 11)}
                      </span>
                      <span className="text-stone-400 text-sm">
                        /{billingCycle === 'monthly' ? t('landing_plan_per_month') : t('landing_plan_per_year')}
                      </span>
                    </>
                  ) : (
                    <p className="text-sm text-stone-300">{t('reg_enterprise_requires_eligibility')}</p>
                  )}
                </div>
                <p className="text-xs text-stone-400 mt-1">
                  {propertyCount > 2 ? t(propertyCount - 2 === 1 ? 'reg_enterprise_additional_property_one' : 'reg_enterprise_additional_property_many', { count: propertyCount - 2 }) : t('reg_enterprise_includes_two')}
                </p>
                <div className="mt-4 text-left space-y-2">
                  <p className="text-xs text-stone-300 flex items-center gap-2"><span className="text-purple-500">✓</span> <span className="font-semibold">{t('landing_plan_enterprise_f1')}</span></p>
                  <p className="text-xs text-stone-300 flex items-center gap-2"><span className="text-purple-500">✓</span> {t('login_enterprise_features')}</p>
                </div>
                <button type="button" onClick={() => setEnterpriseInquiryOpen(true)} className="mt-4 w-full py-2 rounded-lg font-semibold text-center bg-stone-700 text-amber-300 border border-stone-600 hover:bg-stone-600 transition-colors">
                  {t('reg_enterprise_notify')}
                </button>
                <p className="text-xs text-stone-500 mt-2">
                  {t('reg_enterprise_billing_note')}
                </p>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-12 animate-bounce">
            <button 
              onClick={scrollToRegistration}
              className="text-stone-500 text-sm flex items-center justify-center gap-2 hover:text-stone-400 transition-colors group"
            >
              <span>{t('reg_register_here')}</span>
              <svg className="w-4 h-4 group-hover:translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
          </div>
        </div>

        {selectedPlanId && (
          <div id="registration-form" className="mt-8">
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

            {phase === 1 && (
              <form onSubmit={handlePhase1Submit} className="bg-stone-800 rounded-2xl shadow-xl p-8 border border-stone-700">
                <h2 className="text-2xl font-bold text-white mb-6">
                  {t('dashboard_business_info')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">{t('login_legal_name')} *</label>
                    <input type="text" value={businessData.legalName} onChange={(e) => setBusinessData({ ...businessData, legalName: e.target.value })} className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">{t('login_registration_number')}</label>
                    <input type="text" value={businessData.registrationNumber} onChange={(e) => setBusinessData({ ...businessData, registrationNumber: e.target.value })} className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">{t('login_vat_number')}</label>
                    <input type="text" value={businessData.vatNumber} onChange={(e) => setBusinessData({ ...businessData, vatNumber: e.target.value })} className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">{t('dashboard_trading_name')} *</label>
                    <input type="text" value={businessData.tradingName} onChange={(e) => setBusinessData({ ...businessData, tradingName: e.target.value })} className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">{t('login_establishment_type')} *</label>
                    <select value={businessData.establishmentType} onChange={(e) => setBusinessData({ ...businessData, establishmentType: e.target.value })} className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white" required>
                      <option value="">{t('reg_select_establishment')}</option>
                      {ESTABLISHMENT_TYPES.map(type => <option key={type} value={type}>{t(type === 'Hotel' ? 'reg_establishment_hotel' : type === 'Bed & Breakfast (B&B)' ? 'reg_establishment_bnb' : type === 'Guest House' ? 'reg_establishment_guest_house' : type === 'Campsite' ? 'reg_establishment_campsite' : type === 'Resort' ? 'reg_establishment_resort' : type === 'Lodge' ? 'reg_establishment_lodge' : 'reg_establishment_self_catering')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">{t('login_tgsa_grading')}</label>
                    <select value={businessData.tgsaGrading} onChange={(e) => setBusinessData({ ...businessData, tgsaGrading: e.target.value })} className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white">
                      {TGSA_GRADING.map(grade => <option key={grade} value={grade}>{grade}</option>)}
                    </select>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-white mt-6 mb-4 border-b border-stone-700 pb-2">{t('login_physical_address')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-stone-300 mb-1">{t('login_street_address')} *</label>
                    <input type="text" value={businessData.physicalStreet} onChange={(e) => { setBusinessData({ ...businessData, physicalStreet: e.target.value }); if (businessData.sameAsPhysical) setBusinessData(prev => ({ ...prev, postalStreet: e.target.value })); }} className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">{t('reg_city_town')} *</label>
                    <input type="text" value={businessData.physicalCity} onChange={(e) => { setBusinessData({ ...businessData, physicalCity: e.target.value }); if (businessData.sameAsPhysical) setBusinessData(prev => ({ ...prev, postalCity: e.target.value })); }} className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">{t('reg_country')} *</label>
                    <select value={businessData.physicalCountry} onChange={(e) => { const newCountry = e.target.value; setBusinessData({ ...businessData, physicalCountry: newCountry, physicalProvince: '' }); if (businessData.sameAsPhysical) setBusinessData(prev => ({ ...prev, postalCountry: newCountry, postalProvince: '' })); }} className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white" required>
                      <option value="">{t('reg_select_country')}</option>
                      {SADC_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">{regionLabel} *</label>
                    {availableProvinces.length > 0 ? (
                      <select value={businessData.physicalProvince} onChange={(e) => { setBusinessData({ ...businessData, physicalProvince: e.target.value }); if (businessData.sameAsPhysical) setBusinessData(prev => ({ ...prev, postalProvince: e.target.value })); }} className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white" required>
                        <option value="">{t('reg_select_region', { region: regionLabel })}</option>
                        {availableProvinces.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    ) : (
                      <input type="text" value={businessData.physicalProvince} onChange={(e) => { setBusinessData({ ...businessData, physicalProvince: e.target.value }); if (businessData.sameAsPhysical) setBusinessData(prev => ({ ...prev, postalProvince: e.target.value })); }} placeholder={t('reg_enter_region', { region: regionLabel.toLowerCase() })} className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white" required />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">{t('reg_postal_code')}</label>
                    <input type="text" value={businessData.physicalPostalCode} onChange={(e) => { setBusinessData({ ...businessData, physicalPostalCode: e.target.value }); if (businessData.sameAsPhysical) setBusinessData(prev => ({ ...prev, postalPostalCode: e.target.value })); }} className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white" />
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-white mt-6 mb-4 border-b border-stone-700 pb-2">{t('login_postal_address')}</h3>
                <div className="mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={businessData.sameAsPhysical} onChange={(e) => { const isChecked = e.target.checked; setBusinessData(prev => ({ ...prev, sameAsPhysical: isChecked })); if (isChecked) setBusinessData(prev => ({ ...prev, postalStreet: prev.physicalStreet, postalCity: prev.physicalCity, postalProvince: prev.physicalProvince, postalCountry: prev.physicalCountry, postalPostalCode: prev.physicalPostalCode })); }} className="w-4 h-4 rounded border-stone-600 bg-stone-700" />
                    <span className="text-stone-300">{t('login_same_as_physical')}</span>
                  </label>
                </div>
                {!businessData.sameAsPhysical && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2"><label className="block text-sm font-medium text-stone-300 mb-1">{t('login_street_address')}</label><input type="text" value={businessData.postalStreet} onChange={(e) => setBusinessData({ ...businessData, postalStreet: e.target.value })} className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white" /></div>
                    <div><label className="block text-sm font-medium text-stone-300 mb-1">{t('reg_city_town')}</label><input type="text" value={businessData.postalCity} onChange={(e) => setBusinessData({ ...businessData, postalCity: e.target.value })} className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white" /></div>
                    <div><label className="block text-sm font-medium text-stone-300 mb-1">{t('reg_country')}</label><select value={businessData.postalCountry} onChange={(e) => { const newCountry = e.target.value; setBusinessData({ ...businessData, postalCountry: newCountry, postalProvince: '' }); }} className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white"><option value="">{t('reg_select_country')}</option>{SADC_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                    <div><label className="block text-sm font-medium text-stone-300 mb-1">{postalRegionLabel}</label>{REGIONS_BY_COUNTRY[businessData.postalCountry]?.length > 0 ? (<select value={businessData.postalProvince} onChange={(e) => setBusinessData({ ...businessData, postalProvince: e.target.value })} className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white"><option value="">{t('reg_select_region', { region: postalRegionLabel })}</option>{REGIONS_BY_COUNTRY[businessData.postalCountry].map(p => <option key={p} value={p}>{p}</option>)}</select>) : (<input type="text" value={businessData.postalProvince} onChange={(e) => setBusinessData({ ...businessData, postalProvince: e.target.value })} placeholder={t('reg_enter_region', { region: postalRegionLabel.toLowerCase() })} className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white" />)}</div>
                    <div><label className="block text-sm font-medium text-stone-300 mb-1">{t('reg_postal_code')}</label><input type="text" value={businessData.postalPostalCode} onChange={(e) => setBusinessData({ ...businessData, postalPostalCode: e.target.value })} className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white" /></div>
                  </div>
                )}

                <h3 className="text-lg font-semibold text-white mt-6 mb-4 border-b border-stone-700 pb-2">{t('login_contact_information')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div><label className="block text-sm font-medium text-stone-300 mb-1">{t('login_email_label')} *</label><input type="email" value={businessData.email} onChange={(e) => setBusinessData({ ...businessData, email: e.target.value })} className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white" required /></div>
                  <div><label className="block text-sm font-medium text-stone-300 mb-1">{t('login_confirm_email')} *</label><input type="email" value={businessData.confirmEmail} onChange={(e) => setBusinessData({ ...businessData, confirmEmail: e.target.value })} className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white" required /></div>
                  <div><label className="block text-sm font-medium text-stone-300 mb-1">{t('login_fixed_phone')}</label><input type="tel" value={businessData.fixedPhone} onChange={(e) => setBusinessData({ ...businessData, fixedPhone: e.target.value })} className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white" /></div>
                  <div><label className="block text-sm font-medium text-stone-300 mb-1">{t('login_mobile_phone')} *</label><input type="tel" value={businessData.mobilePhone} onChange={(e) => setBusinessData({ ...businessData, mobilePhone: e.target.value })} className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white" required /></div>
                  <div className="md:col-span-2"><label className="block text-sm font-medium text-stone-300 mb-1">{t('reg_website_url')}</label><input type="url" value={businessData.website} onChange={(e) => setBusinessData({ ...businessData, website: e.target.value })} className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white" placeholder="https://example.com" /></div>
                </div>
                <div className="mt-8 flex justify-end"><button type="submit" className="px-6 py-2 bg-amber-500 text-stone-900 rounded-lg font-semibold hover:bg-amber-600">{t('common_next')} →</button></div>
              </form>
            )}

            {phase === 2 && (
              <form onSubmit={handlePhase2Submit} className="bg-stone-800 rounded-2xl shadow-xl p-8 border border-stone-700">
                <h2 className="text-2xl font-bold text-white mb-6">{t('login_director_owner_information')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div><label className="block text-sm font-medium text-stone-300 mb-1">{t('checkin_first_name')} *</label><input type="text" value={directorData.name} onChange={(e) => setDirectorData({ ...directorData, name: e.target.value })} className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white" required /></div>
                  <div><label className="block text-sm font-medium text-stone-300 mb-1">{t('checkin_last_name')} *</label><input type="text" value={directorData.surname} onChange={(e) => setDirectorData({ ...directorData, surname: e.target.value })} className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white" required /></div>
                  <div><label className="block text-sm font-medium text-stone-300 mb-1">{t('checkin_passport')} *</label><input type="text" value={directorData.idNumber} onChange={(e) => setDirectorData({ ...directorData, idNumber: e.target.value })} className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white" required /></div>
                  <div><label className="block text-sm font-medium text-stone-300 mb-1">{t('reg_upload_id_photo')} *</label><input type="file" accept="image/*" onChange={handleDirectorIdUpload} className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white file:mr-2 file:py-1 file:px-3 file:rounded-full file:bg-amber-500 file:text-white file:border-0" required />{directorData.idPhotoPreview && <div className="mt-2"><img src={directorData.idPhotoPreview} alt={t('reg_id_preview')} className="h-20 w-auto rounded border border-stone-600" /></div>}</div>
                </div>
                <h3 className="text-lg font-semibold text-white mt-6 mb-4 border-b border-stone-700 pb-2">{t('reg_address')}</h3>
                <div className="mb-4"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={directorData.sameAddress} onChange={(e) => setDirectorData({ ...directorData, sameAddress: e.target.checked })} className="w-4 h-4 rounded border-stone-600 bg-stone-700" /><span className="text-stone-300">{t('login_same_as_business')}</span></label></div>
                {!directorData.sameAddress && <div><label className="block text-sm font-medium text-stone-300 mb-1">{t('login_residential_address')}</label><textarea rows={3} value={directorData.address} onChange={(e) => setDirectorData({ ...directorData, address: e.target.value })} className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white" /></div>}
                <h3 className="text-lg font-semibold text-white mt-6 mb-4 border-b border-stone-700 pb-2">{t('login_contact_information')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div><label className="block text-sm font-medium text-stone-300 mb-1">{t('login_email_label')} *</label><input type="email" value={directorData.email} onChange={(e) => setDirectorData({ ...directorData, email: e.target.value })} className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white" required /></div>
                  <div><label className="block text-sm font-medium text-stone-300 mb-1">{t('login_confirm_email')} *</label><input type="email" value={directorData.confirmEmail} onChange={(e) => setDirectorData({ ...directorData, confirmEmail: e.target.value })} className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white" required /></div>
                  <div><label className="block text-sm font-medium text-stone-300 mb-1">{t('login_fixed_phone')}</label><input type="tel" value={directorData.fixedPhone} onChange={(e) => setDirectorData({ ...directorData, fixedPhone: e.target.value })} className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white" /></div>
                  <div><label className="block text-sm font-medium text-stone-300 mb-1">{t('login_mobile_phone')} *</label><input type="tel" value={directorData.mobilePhone} onChange={(e) => setDirectorData({ ...directorData, mobilePhone: e.target.value })} className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white" required /></div>
                </div>
                <div className="mt-6 p-4 bg-stone-700/30 rounded-lg border border-stone-600"><label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={directorData.acknowledgeCorrect} onChange={(e) => setDirectorData({ ...directorData, acknowledgeCorrect: e.target.checked })} className="mt-1 w-4 h-4 rounded border-stone-600 bg-stone-700" /><span className="text-stone-300 text-sm">{t('login_acknowledgement')}</span></label></div>
                <div className="mt-8 flex justify-between"><button type="button" onClick={() => setPhase(1)} className="px-6 py-2 bg-stone-700 text-white rounded-lg font-semibold hover:bg-stone-600">← {t('common_back')}</button><button type="submit" className="px-6 py-2 bg-amber-500 text-stone-900 rounded-lg font-semibold hover:bg-amber-600">{t('common_next')} →</button></div>
              </form>
            )}

            {phase === 3 && (
              <form onSubmit={handleFinalSubmit} className="bg-stone-800 rounded-2xl shadow-xl p-8 border border-stone-700">
                <h2 className="text-2xl font-bold text-white mb-6">{t('login_waiver_agreement')}</h2>
                <div className="bg-stone-700/30 rounded-lg p-6 mb-6 border border-stone-600 max-h-80 overflow-y-auto">
                  <h3 className="text-lg font-bold text-white mb-4">{t('reg_waiver_heading')}</h3>
                  <div className="whitespace-pre-line text-stone-300 text-sm">{t('reg_waiver_terms')}</div>
                </div>
                <div className="mb-6 p-4 bg-stone-700/30 rounded-lg border border-stone-600"><label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={waiverAccepted} onChange={(e) => setWaiverAccepted(e.target.checked)} className="mt-1 w-4 h-4 rounded border-stone-600 bg-stone-700" /><span className="text-stone-300 text-sm">{t('reg_waiver_acceptance')}</span></label></div>
                <div className="bg-stone-700/20 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-white mb-2">{t('login_application_summary')}</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm text-stone-400">
                    <p>{t('dashboard_trading_name')}: <span className="text-white">{businessData.tradingName}</span></p>
                    <p>{t('login_legal_name')}: <span className="text-white">{businessData.legalName}</span></p>
                    <p>{t('login_establishment_type')}: <span className="text-white">{businessData.establishmentType || t('common_not_set')}</span></p>
                    <p>{t('reg_tgsa_grading')}: <span className="text-white">{businessData.tgsaGrading}</span></p>
                    <p>{t('login_selected_plan')}: <span className="text-white">{selectedPlanId === 'enterprise' ? 'Enterprise' : selectedPlan?.name}</span></p>
                    <p>{t('reg_properties')}: <span className="text-white">{propertyCount}</span></p>
                    <p>{t('reg_total_rooms')}: <span className="text-white">{roomsCount}</span></p>
                    <p>{t('reg_director')}: <span className="text-white">{directorData.name} {directorData.surname}</span></p>
                    <p>{t('login_email_label')}: <span className="text-white">{businessData.email}</span></p>
                    <p>{t('login_mobile_phone')}: <span className="text-white">{businessData.mobilePhone}</span></p>
                  </div>
                </div>
                <div className="flex justify-center gap-4 mb-6">
                  <button type="button" onClick={() => setBillingCycle('monthly')} className={`px-6 py-2 rounded-lg font-semibold transition-colors ${billingCycle === 'monthly' ? 'bg-amber-500 text-stone-900' : 'bg-stone-700 text-stone-400 hover:bg-stone-600'}`}>{t('login_monthly_billing')}</button>
                  <button type="button" onClick={() => setBillingCycle('yearly')} className={`px-6 py-2 rounded-lg font-semibold transition-colors ${billingCycle === 'yearly' ? 'bg-amber-500 text-stone-900' : 'bg-stone-700 text-stone-400 hover:bg-stone-600'}`}>{t('login_yearly_billing')} <span className="text-green-400 text-xs ml-1">{t('login_annual_saving')}</span></button>
                </div>
                <div className="bg-stone-700/30 rounded-lg p-4 mb-6">
                  <div className="text-center mb-4"><p className="text-2xl font-mono tracking-wider text-white">{captchaText}</p></div>
                  <input type="text" value={captchaInput} onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())} placeholder={t('login_enter_captcha')} className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white" required />
                  <button type="button" onClick={generateCaptcha} className="text-sm text-amber-500 hover:text-amber-400 mt-2">{t('login_refresh_captcha')}</button>
                </div>
                <div className="mt-8 flex justify-between"><button type="button" onClick={() => setPhase(2)} className="px-6 py-2 bg-stone-700 text-white rounded-lg font-semibold hover:bg-stone-600">← {t('common_back')}</button><button type="submit" disabled={loading} className="px-8 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50">{loading ? t('common_processing') : `${t('login_submit_application')} →`}</button></div>
              </form>
            )}
          </div>
        )}
      </div>
      <PricingComingSoonModal open={enterpriseInquiryOpen} onClose={() => setEnterpriseInquiryOpen(false)} />
    </div>
  );
}
