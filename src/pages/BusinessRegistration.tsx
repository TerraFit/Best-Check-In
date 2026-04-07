import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COUNTRIES } from '../constants';

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

// Helper function to add days to a date
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export default function BusinessRegistration() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('growth');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [roomsCount, setRoomsCount] = useState<number>(5);
  const [isBusinessOwner, setIsBusinessOwner] = useState(false);
  
  const [formData, setFormData] = useState({
    tradingName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    street: '',
    city: '',
    province: '',
    country: 'South Africa',
    postalCode: '',
    totalRooms: 5,
    avgPrice: 1500
  });

  // Find which plan matches the room count
  const findRecommendedPlan = (rooms: number): PricingPlan | undefined => {
    return pricingPlans.find(p => rooms >= p.minRooms && rooms <= p.maxRooms);
  };

  const recommendedPlan = findRecommendedPlan(roomsCount);
  const isGrowthRecommended = recommendedPlan?.id === 'growth';
  const selectedPlanData = pricingPlans.find(p => p.id === selectedPlan);

  // Auto-select plan based on room count
  const handleRoomsChange = (rooms: number) => {
    setRoomsCount(rooms);
    setFormData({ ...formData, totalRooms: rooms });
    
    const matchedPlan = pricingPlans.find(p => rooms >= p.minRooms && rooms <= p.maxRooms);
    if (matchedPlan) {
      setSelectedPlan(matchedPlan.id);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isBusinessOwner) {
      alert('Please confirm that you run or manage an accommodation business');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    
    const trialStart = new Date();
    const trialEnd = addDays(trialStart, 14);
    
    try {
      const response = await fetch('/.netlify/functions/register-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business: {
            trading_name: formData.tradingName,
            registered_name: formData.tradingName,
            email: formData.email,
            phone: formData.phone,
            physical_address: {
              street: formData.street,
              city: formData.city,
              province: formData.province,
              country: formData.country,
              postalCode: formData.postalCode
            },
            total_rooms: formData.totalRooms,
            avg_price: formData.avgPrice,
            plan: selectedPlan,
            max_rooms: selectedPlanData?.maxRooms || 10,
            billing_cycle: billingCycle,
            status: 'trial',
            trial_start: trialStart.toISOString(),
            trial_end: trialEnd.toISOString(),
            next_billing_date: trialEnd.toISOString()
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
            maxRooms: selectedPlanData?.maxRooms,
            trialEnd: trialEnd.toLocaleDateString()
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
      <div className="max-w-6xl mx-auto">
        {/* Header with Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img 
              src="/fastcheckin-logo.png" 
              alt="FastCheckin" 
              className="h-16 w-auto object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-white">Start Your 14-Day Free Trial</h1>
          <p className="text-stone-400 mt-2">No credit card required • Cancel anytime • Setup in under 2 minutes</p>
        </div>

        {/* Trust Banner */}
        <div className="text-center mb-8">
          <p className="text-sm text-stone-400">Used by guesthouses and lodges across South Africa</p>
        </div>

        {/* Pricing Section */}
        <div className="bg-stone-800/50 rounded-2xl p-8 mb-8 border border-stone-700">
          <h2 className="text-2xl font-bold text-white text-center mb-2">Choose Your Plan</h2>
          <p className="text-stone-400 text-center mb-6">14-day free trial • No credit card required</p>
          
          {/* Billing Toggle */}
          <div className="flex justify-center mb-8">
            <div className="bg-stone-700 rounded-full p-1 inline-flex">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-amber-500 text-stone-900 shadow-sm'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  billingCycle === 'yearly'
                    ? 'bg-amber-500 text-stone-900 shadow-sm'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                Yearly <span className="text-xs ml-1 text-green-400">Save 17%</span>
              </button>
            </div>
          </div>

          {/* Room Count Suggestion */}
          <div className="max-w-md mx-auto mb-8">
            <label className="block text-sm font-medium text-stone-300 mb-2 text-center">
              How many rooms does your property have?
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={roomsCount}
              onChange={(e) => handleRoomsChange(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-white text-center"
            />
            <p className="text-xs text-stone-500 text-center mt-2">
              We'll recommend the right plan for you
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {pricingPlans.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              const isRecommended = recommendedPlan?.id === plan.id;
              // Most Popular appears ONLY on Growth plan AND when Growth is NOT recommended
              const showMostPopular = plan.id === 'growth' && !isGrowthRecommended;
              const annualSavings = getAnnualSavings(plan);
              
              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`
                    relative rounded-xl border-2 p-4 cursor-pointer transition-all bg-stone-800
                    ${isSelected ? `${plan.color} ring-2 ring-amber-500 bg-stone-700` : 'border-stone-600 hover:border-stone-500'}
                  `}
                >
                  {/* Recommended Badge - appears on plan that matches room count */}
                  {isRecommended && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                        Recommended
                      </span>
                    </div>
                  )}
                  
                  {/* Most Popular Badge - appears ONLY on Growth when NOT recommended */}
                  {showMostPopular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-amber-500 text-stone-900 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                        Most Popular
                      </span>
                    </div>
                  )}
                  
                  <div className="text-center">
                    <h3 className={`text-xl font-bold ${plan.textColor}`}>{plan.name}</h3>
                    <p className="text-xs text-stone-400 mt-1">Up to {plan.maxRooms} rooms</p>
                    <p className="text-xs text-stone-500 mt-1">{plan.description}</p>
                    <div className="mt-3">
                      <span className="text-3xl font-bold text-white">
                        {billingCycle === 'monthly' ? `R${plan.priceMonthly}` : `R${plan.priceYearly}`}
                      </span>
                      <span className="text-stone-400 text-sm">
                        /{billingCycle === 'monthly' ? 'month' : 'year'}
                      </span>
                      {annualSavings && billingCycle === 'yearly' && (
                        <p className="text-xs text-green-400 font-semibold mt-1">{annualSavings}</p>
                      )}
                    </div>
                    
                    {/* Full features list - no truncation */}
                    <ul className="mt-4 text-left space-y-1">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="text-xs text-stone-300 flex items-start gap-1">
                          <svg className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    {isSelected && (
                      <div className="mt-3 text-xs font-semibold text-amber-500">✓ Selected</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Enterprise Plan Card */}
          <div className="mt-6">
            <div className="relative rounded-xl border-2 border-purple-600 p-4 text-center bg-stone-800 hover:border-purple-500 transition-all">
              <div className="text-center">
                <h3 className="text-xl font-bold text-purple-400">Enterprise</h3>
                <p className="text-xs text-stone-400 mt-1">20+ rooms</p>
                <p className="text-xs text-stone-500 mt-1">For large properties and multi-property groups</p>
                <div className="mt-3">
                  <span className="text-3xl font-bold text-white">Custom</span>
                  <span className="text-stone-400 text-sm">/pricing</span>
                </div>
                
                <ul className="mt-4 text-left space-y-1 max-w-xs mx-auto">
                  <li className="text-xs text-stone-300 flex items-start gap-1">
                    <svg className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Multi-property support</span>
                  </li>
                  <li className="text-xs text-stone-300 flex items-start gap-1">
                    <svg className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Dedicated onboarding</span>
                  </li>
                  <li className="text-xs text-stone-300 flex items-start gap-1">
                    <svg className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>API access (coming soon)</span>
                  </li>
                </ul>
                
                <button
                  onClick={() => window.location.href = 'mailto:sales@fastcheckin.co.za'}
                  className="mt-4 w-full py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                >
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Registration Form */}
        <div className="bg-stone-800 rounded-2xl shadow-xl p-8 border border-stone-700">
          <h2 className="text-2xl font-bold text-white mb-2">Create Your Account</h2>
          <p className="text-stone-400 mb-6">
            You are starting with the <span className="font-semibold text-amber-500">{selectedPlanData?.name}</span> plan ({billingCycle === 'monthly' ? `R${selectedPlanData?.priceMonthly}/month` : `R${selectedPlanData?.priceYearly}/year`})
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  name="tradingName"
                  value={formData.tradingName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-white"
                  placeholder="e.g., J-Bay Zebra Lodge"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-white"
                  placeholder="info@yourlodge.co.za"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-white"
                  placeholder="+27 XX XXX XXXX"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  Street Address *
                </label>
                <input
                  type="text"
                  name="street"
                  value={formData.street}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-white"
                  placeholder="123 Main Street"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  City / Town *
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-white"
                  placeholder="Cape Town"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  Province *
                </label>
                <select
                  name="province"
                  value={formData.province}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-white"
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
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-white"
                >
                  {COUNTRIES.map(c => (
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
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-white"
                  placeholder="8001"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  Number of Rooms *
                </label>
                <input
                  type="number"
                  name="totalRooms"
                  value={formData.totalRooms}
                  onChange={(e) => handleRoomsChange(parseInt(e.target.value) || 1)}
                  min="1"
                  max="50"
                  className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  Average Room Price (ZAR) *
                </label>
                <input
                  type="number"
                  name="avgPrice"
                  value={formData.avgPrice}
                  onChange={handleInputChange}
                  min="0"
                  step="100"
                  className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-white"
                  placeholder="At least 6 characters"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-white"
                  placeholder="Confirm your password"
                  required
                />
              </div>
            </div>
            
            {/* Business Owner Confirmation */}
            <div className="flex items-start gap-3 p-4 bg-stone-700/50 rounded-lg border border-stone-600">
              <input
                type="checkbox"
                id="isBusinessOwner"
                checked={isBusinessOwner}
                onChange={(e) => setIsBusinessOwner(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-stone-500 focus:ring-amber-500 bg-stone-700"
              />
              <label htmlFor="isBusinessOwner" className="text-sm text-stone-300 cursor-pointer">
                ☑ I run or manage an accommodation business
              </label>
            </div>
            
            {/* Trial Message */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <h4 className="font-semibold text-amber-400 mb-2">✨ Your 14-Day Free Trial Includes:</h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-stone-300">
                <li>• Full access to the {selectedPlanData?.name} plan features</li>
                <li>• Up to {selectedPlanData?.maxRooms} rooms</li>
                <li>• No credit card required</li>
                <li>• Cancel anytime during trial</li>
              </ul>
              <p className="text-xs text-amber-400/70 mt-3 text-center">
                Your 14-day trial starts immediately after signup. No payment required today.
              </p>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            
            <p className="text-center text-xs text-stone-500">
              By signing up, you agree to our Terms of Service and Privacy Policy.
              <br />
              No credit card required for the 14-day trial.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
