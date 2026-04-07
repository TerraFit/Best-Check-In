import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COUNTRIES, PROVINCES } from '../constants';

interface FormData {
  // Business Information
  tradingName: string;
  registeredName: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  province: string;
  country: string;
  postalCode: string;
  website?: string;
  
  // Property Details
  totalRooms: number;
  avgPrice: number;
  
  // Account Details
  password: string;
  confirmPassword: string;
  
  // Plan Selection
  selectedPlan: string;
  billingCycle: 'monthly' | 'yearly';
}

interface PricingPlan {
  id: string;
  name: string;
  maxRooms: number;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  isPopular?: boolean;
  color: string;
  bgColor: string;
  borderColor: string;
}

export default function BusinessRegistration() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    tradingName: '',
    registeredName: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    province: '',
    country: 'South Africa',
    postalCode: '',
    website: '',
    totalRooms: 5,
    avgPrice: 1500,
    password: '',
    confirmPassword: '',
    selectedPlan: 'growth',
    billingCycle: 'monthly'
  });

  const pricingPlans: PricingPlan[] = [
    {
      id: 'starter',
      name: 'Starter',
      maxRooms: 5,
      priceMonthly: 349,
      priceYearly: 3490,
      features: [
        'Digital guest check-in forms',
        'Booking dashboard',
        'Guest data export (CSV)',
        'Basic branding'
      ],
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      id: 'growth',
      name: 'Growth',
      maxRooms: 10,
      priceMonthly: 649,
      priceYearly: 6490,
      features: [
        'Everything in Starter',
        'Automated email confirmations',
        'Guest history tracking',
        'Regional data auto-fill',
        'Priority email support'
      ],
      isPopular: true,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200'
    },
    {
      id: 'pro',
      name: 'Pro',
      maxRooms: 15,
      priceMonthly: 949,
      priceYearly: 9490,
      features: [
        'Everything in Growth',
        'Custom branding (logo + colors)',
        'Analytics dashboard',
        'Multi-user access',
        'Integration-ready exports (Mailchimp)'
      ],
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      id: 'business',
      name: 'Business',
      maxRooms: 20,
      priceMonthly: 1290,
      priceYearly: 12900,
      features: [
        'Everything in Pro',
        'Advanced analytics',
        'Priority (fast) support',
        'Early access to new features'
      ],
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    }
  ];

  const getPlanPrice = (plan: PricingPlan) => {
    return formData.billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
  };

  const getPlanPriceDisplay = (plan: PricingPlan) => {
    if (formData.billingCycle === 'monthly') {
      return `R${plan.priceMonthly}/month`;
    }
    return `R${plan.priceYearly}/year`;
  };

  const getAnnualSavings = (plan: PricingPlan) => {
    const monthlyTotal = plan.priceMonthly * 12;
    const savings = monthlyTotal - plan.priceYearly;
    if (savings > 0) {
      return `Save R${savings}/year`;
    }
    return null;
  };

  const handlePlanSelect = (planId: string) => {
    setFormData({ ...formData, selectedPlan: planId });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.tradingName) {
        alert('Please enter your trading name');
        return false;
      }
      if (!formData.email) {
        alert('Please enter your email address');
        return false;
      }
      if (!formData.phone) {
        alert('Please enter your phone number');
        return false;
      }
      return true;
    }
    
    if (step === 2) {
      if (!formData.street) {
        alert('Please enter your street address');
        return false;
      }
      if (!formData.city) {
        alert('Please enter your city');
        return false;
      }
      if (!formData.province) {
        alert('Please select your province');
        return false;
      }
      if (formData.totalRooms < 1) {
        alert('Please enter the number of rooms');
        return false;
      }
      return true;
    }
    
    if (step === 3) {
      if (formData.password.length < 6) {
        alert('Password must be at least 6 characters');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        alert('Passwords do not match');
        return false;
      }
      return true;
    }
    
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setStep(step - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep()) return;
    
    setLoading(true);
    
    try {
      const selectedPlanData = pricingPlans.find(p => p.id === formData.selectedPlan);
      
      const response = await fetch('/.netlify/functions/register-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business: {
            trading_name: formData.tradingName,
            registered_name: formData.registeredName || formData.tradingName,
            email: formData.email,
            phone: formData.phone,
            physical_address: {
              street: formData.street,
              city: formData.city,
              province: formData.province,
              country: formData.country,
              postalCode: formData.postalCode
            },
            website: formData.website,
            total_rooms: formData.totalRooms,
            avg_price: formData.avgPrice,
            plan: formData.selectedPlan,
            max_rooms: selectedPlanData?.maxRooms || 5,
            billing_cycle: formData.billingCycle,
            status: 'pending'
          },
          password: formData.password
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        navigate('/registration-success', { 
          state: { 
            businessName: formData.tradingName,
            email: formData.email,
            plan: selectedPlanData?.name,
            maxRooms: selectedPlanData?.maxRooms
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

  const selectedPlanData = pricingPlans.find(p => p.id === formData.selectedPlan);

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-amber-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-2xl">F</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-stone-900">Start Your 14-Day Free Trial</h1>
          <p className="text-stone-600 mt-2">Join hundreds of South African accommodations using FastCheckin</p>
        </div>

        {/* Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                    step >= s
                      ? 'bg-amber-500 text-white shadow-md'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {s}
                </div>
                {s < 4 && (
                  <div
                    className={`w-12 h-0.5 mx-2 transition-all ${
                      step > s ? 'bg-amber-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1: Business Information */}
          {step === 1 && (
            <div className="bg-white rounded-2xl shadow-xl p-8 animate-fade-in">
              <h2 className="text-2xl font-bold text-stone-900 mb-2">Business Information</h2>
              <p className="text-stone-500 mb-6">Tell us about your accommodation</p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Trading Name *
                  </label>
                  <input
                    type="text"
                    name="tradingName"
                    value={formData.tradingName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="e.g., J-Bay Zebra Lodge"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Registered Name (Optional)
                  </label>
                  <input
                    type="text"
                    name="registeredName"
                    value={formData.registeredName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="e.g., Jeffreys Bay Zebra Sanctuary Lodge & Bike Park Pty Ltd"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="info@yourlodge.co.za"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="+27 XX XXX XXXX"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Website (Optional)
                  </label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="https://www.yourlodge.co.za"
                  />
                </div>
              </div>
              
              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Location & Property Details */}
          {step === 2 && (
            <div className="bg-white rounded-2xl shadow-xl p-8 animate-fade-in">
              <h2 className="text-2xl font-bold text-stone-900 mb-2">Location & Property</h2>
              <p className="text-stone-500 mb-6">Where are you located and how many rooms?</p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    name="street"
                    value={formData.street}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="123 Main Street"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      City / Town *
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Cape Town"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Province *
                    </label>
                    <select
                      name="province"
                      value={formData.province}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Country *
                    </label>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      {COUNTRIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="8001"
                    />
                  </div>
                </div>
                
                <div className="border-t border-stone-200 pt-6">
                  <h3 className="text-lg font-semibold text-stone-900 mb-4">Property Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        Number of Rooms *
                      </label>
                      <input
                        type="number"
                        name="totalRooms"
                        value={formData.totalRooms}
                        onChange={handleNumberChange}
                        min="1"
                        max="50"
                        className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        required
                      />
                      <p className="text-xs text-stone-400 mt-1">
                        {formData.totalRooms <= 5 && "Starter plan (up to 5 rooms)"}
                        {formData.totalRooms > 5 && formData.totalRooms <= 10 && "Growth plan (up to 10 rooms)"}
                        {formData.totalRooms > 10 && formData.totalRooms <= 15 && "Pro plan (up to 15 rooms)"}
                        {formData.totalRooms > 15 && formData.totalRooms <= 20 && "Business plan (up to 20 rooms)"}
                        {formData.totalRooms > 20 && "Contact us for enterprise pricing"}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        Average Room Price (ZAR) *
                      </label>
                      <input
                        type="number"
                        name="avgPrice"
                        value={formData.avgPrice}
                        onChange={handleNumberChange}
                        min="0"
                        step="100"
                        className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex justify-between">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-2 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Choose Your Plan */}
          {step === 3 && (
            <div className="bg-white rounded-2xl shadow-xl p-8 animate-fade-in">
              <h2 className="text-2xl font-bold text-stone-900 mb-2">Choose Your Plan</h2>
              <p className="text-stone-500 mb-6">Select the plan that fits your business</p>
              
              {/* Billing Toggle */}
              <div className="flex justify-center mb-8">
                <div className="bg-stone-100 rounded-full p-1 inline-flex">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, billingCycle: 'monthly' })}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                      formData.billingCycle === 'monthly'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, billingCycle: 'yearly' })}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                      formData.billingCycle === 'yearly'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Yearly
                  </button>
                </div>
              </div>
              
              {/* Pricing Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {pricingPlans.map((plan) => {
                  const isSelected = formData.selectedPlan === plan.id;
                  const isDisabled = formData.totalRooms > plan.maxRooms;
                  const annualSavings = getAnnualSavings(plan);
                  
                  return (
                    <div
                      key={plan.id}
                      onClick={() => !isDisabled && handlePlanSelect(plan.id)}
                      className={`
                        relative rounded-xl border-2 p-4 cursor-pointer transition-all
                        ${isDisabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:shadow-lg'}
                        ${isSelected ? `${plan.borderColor} ${plan.bgColor} ring-2 ring-amber-500` : 'border-stone-200'}
                      `}
                    >
                      {plan.isPopular && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                            Most Popular
                          </span>
                        </div>
                      )}
                      
                      <div className="text-center">
                        <h3 className={`text-xl font-bold ${plan.color}`}>{plan.name}</h3>
                        <div className="mt-2">
                          <span className="text-3xl font-bold text-stone-900">
                            {formData.billingCycle === 'monthly' ? `R${plan.priceMonthly}` : `R${plan.priceYearly}`}
                          </span>
                          <span className="text-stone-500 text-sm">
                            /{formData.billingCycle === 'monthly' ? 'month' : 'year'}
                          </span>
                        </div>
                        {annualSavings && formData.billingCycle === 'yearly' && (
                          <p className="text-xs text-green-600 font-semibold mt-1">{annualSavings}</p>
                        )}
                        <p className="text-xs text-stone-400 mt-2">Up to {plan.maxRooms} rooms</p>
                        
                        <ul className="mt-4 text-left space-y-2">
                          {plan.features.slice(0, 3).map((feature, idx) => (
                            <li key={idx} className="text-xs text-stone-600 flex items-start gap-2">
                              <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                        
                        {isDisabled && (
                          <div className="mt-3 text-xs text-red-500">
                            Requires upgrade to {plan.name}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Enterprise Note */}
              {formData.totalRooms > 20 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                  <p className="text-purple-800 text-sm">
                    You have {formData.totalRooms} rooms. For properties with 20+ rooms, please contact us for custom enterprise pricing.
                  </p>
                  <button
                    type="button"
                    onClick={() => window.location.href = 'mailto:sales@fastcheckin.co.za'}
                    className="mt-2 text-purple-600 font-semibold text-sm hover:text-purple-700"
                  >
                    Contact Sales →
                  </button>
                </div>
              )}
              
              {/* Selected Plan Summary */}
              {selectedPlanData && !(formData.totalRooms > 20) && (
                <div className={`${selectedPlanData.bgColor} rounded-lg p-4`}>
                  <p className="text-sm font-medium text-stone-700">
                    You've selected: <span className={`font-bold ${selectedPlanData.color}`}>{selectedPlanData.name}</span>
                  </p>
                  <p className="text-xs text-stone-500 mt-1">
                    {formData.billingCycle === 'monthly' 
                      ? `R${selectedPlanData.priceMonthly}/month billed monthly` 
                      : `R${selectedPlanData.priceYearly}/year billed annually`}
                  </p>
                </div>
              )}
              
              <div className="mt-8 flex justify-between">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-2 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={formData.totalRooms > 20}
                  className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Account Setup */}
          {step === 4 && (
            <div className="bg-white rounded-2xl shadow-xl p-8 animate-fade-in">
              <h2 className="text-2xl font-bold text-stone-900 mb-2">Create Your Account</h2>
              <p className="text-stone-500 mb-6">Set up your admin password</p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="At least 6 characters"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Confirm your password"
                    required
                  />
                </div>
                
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-800 mb-2">✨ Your 14-Day Free Trial Includes:</h4>
                  <ul className="space-y-1 text-sm text-amber-700">
                    <li>• Full access to the {selectedPlanData?.name} plan features</li>
                    <li>• Up to {selectedPlanData?.maxRooms} rooms</li>
                    <li>• No credit card required</li>
                    <li>• Cancel anytime during trial</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-8 flex justify-between">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-2 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Processing...
                    </>
                  ) : (
                    'Start Free Trial'
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
        
        {/* Footer */}
        <p className="text-center text-xs text-stone-400 mt-8">
          By signing up, you agree to our Terms of Service and Privacy Policy.
          <br />
          No credit card required for the 14-day trial.
        </p>
      </div>
    </div>
  );
}
