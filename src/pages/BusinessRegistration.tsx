import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COUNTRIES } from '../constants';

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
  'South Africa',
  'Tanzania',
  'Zambia',
  'Zimbabwe'
];

// South African Provinces
const PROVINCES = [
  'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal',
  'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape'
];

interface PricingPlan {
  id: string;
  name: string;
  maxRooms: number;
  minRooms: number;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  description: string;
  color: string;
  borderColor: string;
  buttonColor: string;
  textColor: string;
}

const pricingPlans: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    minRooms: 1,
    maxRooms: 5,
    priceMonthly: 349,
    priceYearly: 3490,
    description: 'Perfect for small guesthouses starting out',
    features: [
      'Digital guest check-in forms',
      'Booking dashboard',
      'Guest data export (CSV)',
      'Basic branding',
      'Email support'
    ],
    color: 'border-green-500',
    borderColor: 'border-green-500',
    buttonColor: 'bg-green-600 hover:bg-green-700',
    textColor: 'text-green-500'
  },
  {
    id: 'growth',
    name: 'Growth',
    minRooms: 6,
    maxRooms: 10,
    priceMonthly: 649,
    priceYearly: 6490,
    description: 'Best for growing guesthouses',
    features: [
      'Everything in Starter',
      'Automated email confirmations',
      'Guest history tracking',
      'Regional data auto-fill',
      'Priority email support'
    ],
    color: 'border-amber-500',
    borderColor: 'border-amber-500',
    buttonColor: 'bg-amber-500 hover:bg-amber-600',
    textColor: 'text-amber-500'
  },
  {
    id: 'pro',
    name: 'Pro',
    minRooms: 11,
    maxRooms: 15,
    priceMonthly: 949,
    priceYearly: 9490,
    description: 'For established properties needing team access',
    features: [
      'Everything in Growth',
      'Custom branding (logo + colors)',
      'Analytics dashboard',
      'Multi-user access',
      'Export to integrations (Mailchimp-ready)'
    ],
    color: 'border-blue-500',
    borderColor: 'border-blue-500',
    buttonColor: 'bg-blue-600 hover:bg-blue-700',
    textColor: 'text-blue-500'
  },
  {
    id: 'business',
    name: 'Business',
    minRooms: 16,
    maxRooms: 20,
    priceMonthly: 1290,
    priceYearly: 12900,
    description: 'For larger operations that need insights',
    features: [
      'Everything in Pro',
      'Advanced analytics',
      'Priority support (fast response)',
      'Early access to new features',
      'Dedicated account manager'
    ],
    color: 'border-purple-500',
    borderColor: 'border-purple-500',
    buttonColor: 'bg-purple-600 hover:bg-purple-700',
    textColor: 'text-purple-500'
  }
];

export default function BusinessRegistration() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('growth');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [roomsCount, setRoomsCount] = useState<number>(5);
  
  const [formData, setFormData] = useState({
    // Business Information
    registeredName: '',
    tradingName: '',
    // Director Information
    directorName: '',
    directorSurname: '',
    directorIdNumber: '',
    directorIdPhoto: '',
    // Contact Information
    email: '',
    phone: '',
    // Physical Address
    physicalStreet: '',
    physicalCity: '',
    physicalProvince: '',
    physicalCountry: 'South Africa',
    physicalPostalCode: '',
    // Postal Address (same as physical checkbox)
    sameAsPhysical: true,
    postalStreet: '',
    postalCity: '',
    postalProvince: '',
    postalCountry: 'South Africa',
    postalPostalCode: '',
    // Property Details
    totalRooms: 5,
    avgPrice: 1500
  });

  const [directorIdPreview, setDirectorIdPreview] = useState<string>('');
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaText, setCaptchaText] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');

  // Generate simple CAPTCHA
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

  const selectedPlanData = pricingPlans.find(p => p.id === selectedPlan);

  const handleRoomsChange = (rooms: number) => {
    setRoomsCount(rooms);
    setFormData({ ...formData, totalRooms: rooms });
    
    const matchedPlan = pricingPlans.find(p => rooms >= p.minRooms && rooms <= p.maxRooms);
    if (matchedPlan) {
      setSelectedPlan(matchedPlan.id);
    }
  };

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
      const base64 = reader.result as string;
      setFormData({ ...formData, directorIdPhoto: base64 });
      setDirectorIdPreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSameAsPhysical = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setFormData({ ...formData, sameAsPhysical: isChecked });
    
    if (isChecked) {
      setFormData(prev => ({
        ...prev,
        postalStreet: prev.physicalStreet,
        postalCity: prev.physicalCity,
        postalProvince: prev.physicalProvince,
        postalCountry: prev.physicalCountry,
        postalPostalCode: prev.physicalPostalCode
      }));
    }
  };

  const handlePhysicalAddressChange = () => {
    if (formData.sameAsPhysical) {
      setFormData(prev => ({
        ...prev,
        postalStreet: prev.physicalStreet,
        postalCity: prev.physicalCity,
        postalProvince: prev.physicalProvince,
        postalCountry: prev.physicalCountry,
        postalPostalCode: prev.physicalPostalCode
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate CAPTCHA
    if (captchaInput.toUpperCase() !== captchaText) {
      alert('CAPTCHA verification failed. Please try again.');
      generateCaptcha();
      setCaptchaInput('');
      return;
    }

    if (!formData.directorIdPhoto) {
      alert('Please upload a photo of the director\'s ID document');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/.netlify/functions/register-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business: {
            registered_name: formData.registeredName,
            trading_name: formData.tradingName,
            email: formData.email,
            phone: formData.phone,
            director: {
              name: formData.directorName,
              surname: formData.directorSurname,
              id_number: formData.directorIdNumber,
              id_photo: formData.directorIdPhoto
            },
            physical_address: {
              street: formData.physicalStreet,
              city: formData.physicalCity,
              province: formData.physicalProvince,
              country: formData.physicalCountry,
              postalCode: formData.physicalPostalCode
            },
            postal_address: {
              street: formData.postalStreet,
              city: formData.postalCity,
              province: formData.postalProvince,
              country: formData.postalCountry,
              postalCode: formData.postalPostalCode
            },
            total_rooms: formData.totalRooms,
            avg_price: formData.avgPrice,
            plan: selectedPlan,
            max_rooms: selectedPlanData?.maxRooms || 10,
            billing_cycle: billingCycle,
            status: 'pending'
          }
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        navigate('/registration-pending', { 
          state: { 
            businessName: formData.tradingName || formData.registeredName,
            email: formData.email
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

  const getAnnualSavings = (plan: PricingPlan) => {
    const monthlyTotal = plan.priceMonthly * 12;
    const savings = monthlyTotal - plan.priceYearly;
    return savings > 0 ? `Save R${savings}/year` : null;
  };

  return (
    <div className="min-h-screen bg-stone-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header with Logo */}
        <div className="text-center mb-8">
          <img 
            src="/fastcheckin-logo.png" 
            alt="FastCheckin" 
            className="h-16 w-auto mx-auto mb-4 object-contain"
          />
          <h1 className="text-3xl font-bold text-white">Register Your Business</h1>
          <p className="text-stone-400 mt-2">Complete the form below to start your application</p>
        </div>

        {/* Pricing Summary Banner */}
        <div className="bg-stone-800/50 rounded-2xl p-6 mb-8 border border-stone-700 text-center">
          <p className="text-stone-300">You are applying for the <span className="font-semibold text-amber-500">{selectedPlanData?.name}</span> plan</p>
          <p className="text-sm text-stone-400">Up to {selectedPlanData?.maxRooms} rooms • {billingCycle === 'monthly' ? `R${selectedPlanData?.priceMonthly}/month` : `R${selectedPlanData?.priceYearly}/year`}</p>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Business Information Section */}
          <div className="bg-stone-800 rounded-2xl shadow-xl p-8 border border-stone-700">
            <h2 className="text-xl font-bold text-white mb-6">Business Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  Registered Name (as per CIPC) *
                </label>
                <input
                  type="text"
                  value={formData.registeredName}
                  onChange={(e) => setFormData({ ...formData, registeredName: e.target.value })}
                  className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  Trading Name *
                </label>
                <input
                  type="text"
                  value={formData.tradingName}
                  onChange={(e) => setFormData({ ...formData, tradingName: e.target.value })}
                  className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white"
                  required
                />
              </div>
            </div>
          </div>

          {/* Director Information Section */}
          <div className="bg-stone-800 rounded-2xl shadow-xl p-8 border border-stone-700">
            <h2 className="text-xl font-bold text-white mb-6">Director / Owner Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  value={formData.directorName}
                  onChange={(e) => setFormData({ ...formData, directorName: e.target.value })}
                  className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  Last Name / Surname *
                </label>
                <input
                  type="text"
                  value={formData.directorSurname}
                  onChange={(e) => setFormData({ ...formData, directorSurname: e.target.value })}
                  className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  ID / Passport Number *
                </label>
                <input
                  type="text"
                  value={formData.directorIdNumber}
                  onChange={(e) => setFormData({ ...formData, directorIdNumber: e.target.value })}
                  className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white"
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
                  className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white file:mr-2 file:py-1 file:px-3 file:rounded-full file:bg-amber-500 file:text-white file:border-0"
                  required
                />
                {directorIdPreview && (
                  <div className="mt-2">
                    <img src={directorIdPreview} alt="ID Preview" className="h-20 w-auto rounded border border-stone-600" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-stone-800 rounded-2xl shadow-xl p-8 border border-stone-700">
            <h2 className="text-xl font-bold text-white mb-6">Contact Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white"
                  required
                />
              </div>
            </div>
          </div>

          {/* Physical Address */}
          <div className="bg-stone-800 rounded-2xl shadow-xl p-8 border border-stone-700">
            <h2 className="text-xl font-bold text-white mb-6">Physical Address</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  Street Address *
                </label>
                <input
                  type="text"
                  value={formData.physicalStreet}
                  onChange={(e) => {
                    setFormData({ ...formData, physicalStreet: e.target.value });
                    handlePhysicalAddressChange();
                  }}
                  className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-1">
                    City / Town *
                  </label>
                  <input
                    type="text"
                    value={formData.physicalCity}
                    onChange={(e) => {
                      setFormData({ ...formData, physicalCity: e.target.value });
                      handlePhysicalAddressChange();
                    }}
                    className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-1">
                    Province *
                  </label>
                  <select
                    value={formData.physicalProvince}
                    onChange={(e) => {
                      setFormData({ ...formData, physicalProvince: e.target.value });
                      handlePhysicalAddressChange();
                    }}
                    className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white"
                    required
                  >
                    <option value="">Select Province</option>
                    {PROVINCES.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-1">
                    Country *
                  </label>
                  <select
                    value={formData.physicalCountry}
                    onChange={(e) => {
                      setFormData({ ...formData, physicalCountry: e.target.value });
                      handlePhysicalAddressChange();
                    }}
                    className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white"
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
                    value={formData.physicalPostalCode}
                    onChange={(e) => {
                      setFormData({ ...formData, physicalPostalCode: e.target.value });
                      handlePhysicalAddressChange();
                    }}
                    className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Postal Address */}
          <div className="bg-stone-800 rounded-2xl shadow-xl p-8 border border-stone-700">
            <h2 className="text-xl font-bold text-white mb-6">Postal Address</h2>
            
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.sameAsPhysical}
                  onChange={handleSameAsPhysical}
                  className="w-4 h-4 rounded border-stone-600 bg-stone-700"
                />
                <span className="text-stone-300">Same as physical address</span>
              </label>
            </div>
            
            {!formData.sameAsPhysical && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-1">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    value={formData.postalStreet}
                    onChange={(e) => setFormData({ ...formData, postalStreet: e.target.value })}
                    className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      City / Town *
                    </label>
                    <input
                      type="text"
                      value={formData.postalCity}
                      onChange={(e) => setFormData({ ...formData, postalCity: e.target.value })}
                      className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Province *
                    </label>
                    <select
                      value={formData.postalProvince}
                      onChange={(e) => setFormData({ ...formData, postalProvince: e.target.value })}
                      className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white"
                    >
                      <option value="">Select Province</option>
                      {PROVINCES.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Country *
                    </label>
                    <select
                      value={formData.postalCountry}
                      onChange={(e) => setFormData({ ...formData, postalCountry: e.target.value })}
                      className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white"
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
                      value={formData.postalPostalCode}
                      onChange={(e) => setFormData({ ...formData, postalPostalCode: e.target.value })}
                      className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Property Details */}
          <div className="bg-stone-800 rounded-2xl shadow-xl p-8 border border-stone-700">
            <h2 className="text-xl font-bold text-white mb-6">Property Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  Number of Rooms *
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.totalRooms}
                  onChange={(e) => handleRoomsChange(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  Average Room Price (ZAR) *
                </label>
                <input
                  type="number"
                  value={formData.avgPrice}
                  onChange={(e) => setFormData({ ...formData, avgPrice: parseInt(e.target.value) || 0 })}
                  min="0"
                  step="100"
                  className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white"
                  required
                />
              </div>
            </div>
          </div>

          {/* CAPTCHA */}
          <div className="bg-stone-800 rounded-2xl shadow-xl p-8 border border-stone-700">
            <h2 className="text-xl font-bold text-white mb-6">Verification</h2>
            
            <div className="space-y-4">
              <div className="bg-stone-700 p-4 rounded-lg text-center">
                <p className="text-2xl font-mono tracking-wider text-white">{captchaText}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  Enter the code above *
                </label>
                <input
                  type="text"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 text-white"
                  required
                />
              </div>
              
              <button
                type="button"
                onClick={generateCaptcha}
                className="text-sm text-amber-500 hover:text-amber-400"
              >
                Refresh CAPTCHA
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="text-center">
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-amber-500 text-stone-900 rounded-lg font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
            <p className="text-xs text-stone-500 mt-4">
              Your application will be reviewed by our team. You will receive an email once approved.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
