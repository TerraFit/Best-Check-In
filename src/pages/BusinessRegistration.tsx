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
  isPopular?: boolean;
  color: string;
  bgColor: string;
  borderColor: string;
  buttonColor: string;
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
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    buttonColor: 'bg-green-600 hover:bg-green-700'
  },
  {
    id: 'growth',
    name: 'Growth',
    minRooms: 6,
    maxRooms: 10,
    priceMonthly: 649,
    priceYearly: 6490,
    description: 'Best for growing guesthouses (6–10 rooms)',
    features: [
      'Everything in Starter',
      'Automated email confirmations',
      'Guest history tracking',
      'Regional data auto-fill',
      'Priority email support',
      '+ more features'
    ],
    isPopular: true,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    buttonColor: 'bg-amber-500 hover:bg-amber-600'
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
      'Export to integrations (Mailchimp-ready)',
      '+ more features'
    ],
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    buttonColor: 'bg-blue-600 hover:bg-blue-700'
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
      'Dedicated account manager',
      '+ more features'
    ],
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    buttonColor: 'bg-purple-600 hover:bg-purple-700'
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
  const [step, setStep] = useState(1);
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
    
    // Validation
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
            status: 'trial',  // Changed from 'pending' to 'trial'
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
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-amber-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-2xl">F</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-stone-900">Start Your 14-Day Free Trial</h1>
          <p className="text-stone-600 mt-2">No credit card required • Cancel anytime • Setup in under 2 minutes</p>
        </div>

        {/* Trust Banner - Specific */}
        <div className="text-center mb-8">
          <p className="text-sm text-stone-500">Used by guesthouses and lodges across South Africa</p>
        </div>

        {/* Pricing Section - VISIBLE FIRST */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-stone-900 text-center mb-2">Choose Your Plan</h2>
          <p className="text-stone-500 text-center mb-6">14-day free trial • No credit card required</p>
          
          {/* Billing Toggle */}
          <div className="flex justify-center mb-8">
            <div className="bg-stone-100 rounded-full p-1 inline-flex">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  billingCycle === 'yearly'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Yearly <span className="text-xs ml-1 text-green-600">Save 17%</span>
              </button>
            </div>
          </div>

          {/* Room Count Suggestion */}
          <div className="max-w-md mx-auto mb-8">
            <label className="block text-sm font-medium text-stone-700 mb-2 text-center">
              How many rooms does your property have?
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={roomsCount}
              onChange={(e) => handleRoomsChange(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-center"
            />
            <p className="text-xs text-stone-400 text-center mt-2">
              We'll recommend the right plan for you
            </p>
          </div>

          {/* Pricing Cards - Showing ALL features */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {pricingPlans.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              const isRecommended = roomsCount >= plan.minRooms && roomsCount <= plan.maxRooms;
              const annualSavings = getAnnualSavings(plan);
              
              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`
                    relative rounded-xl border-2 p-4 cursor-pointer transition-all
                    ${isSelected ? `${plan.borderColor} ${plan.bgColor} ring-2 ring-amber-500` : 'border-stone-200 hover:shadow-lg'}
                  `}
                >
                  {plan.isPopular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}
                  
                  {isRecommended && !plan.isPopular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        Recommended
                      </span>
                    </div>
                  )}
                  
                  <div className="text-center">
                    <h3 className={`text-xl font-bold ${plan.color}`}>{plan.name}</h3>
                    <p className="text-xs text-stone-400 mt-1">{plan.description}</p>
                    <div className="mt-3">
                      <span className="text-3xl font-bold text-stone-900">
                        {billingCycle === 'monthly' ? `R${plan.priceMonthly}` : `R${plan.priceYearly}`}
                      </span>
                      <span className="text-stone-500 text-sm">
                        /{billingCycle === 'monthly' ? 'month' : 'year'}
                      </span>
                      {annualSavings && billingCycle === 'yearly' && (
                        <p className="text-xs text-green-600 font-semibold mt-1">{annualSavings}</p>
                      )}
                    </div>
                    
                    <ul className="mt-4 text-left space-y-1">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="text-xs text-stone-600 flex items-start gap-1">
                          <svg className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className={feature === '+ more features' ? 'text-stone-400 italic' : ''}>
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                    
                    {isSelected && (
                      <div className="mt-3 text-xs font-semibold text-amber-600">✓ Selected</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-stone-900 mb-2">Create Your Account</h2>
          <p className="text-stone-500 mb-6">
            You are starting with the <span className="font-semibold text-amber-600">{selectedPlanData?.name}</span> plan ({billingCycle === 'monthly' ? `R${selectedPlanData?.priceMonthly}/month` : `R${selectedPlanData?.priceYearly}/year`})
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Business Name *
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
              
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Number of Rooms *
                </label>
                <input
                  type="number"
                  name="totalRooms"
                  value={formData.totalRooms}
                  onChange={(e) => handleRoomsChange(parseInt(e.target.value) || 1)}
                  min="1"
                  max="50"
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Average Room Price (ZAR) *
                </label>
                <input
                  type="number"
                  name="avgPrice"
                  value={formData.avgPrice}
                  onChange={handleInputChange}
                  min="0"
                  step="100"
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                />
              </div>
              
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
            </div>
            
            {/* Business Owner Confirmation - Quality Filter */}
            <div className="flex items-start gap-3 p-4 bg-stone-50 rounded-lg">
              <input
                type="checkbox"
                id="isBusinessOwner"
                checked={isBusinessOwner}
                onChange={(e) => setIsBusinessOwner(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-stone-300 focus:ring-amber-500"
              />
              <label htmlFor="isBusinessOwner" className="text-sm text-stone-700 cursor-pointer">
                ☑ I run or manage an accommodation business
              </label>
            </div>
            
            {/* Urgency Message */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-semibold text-amber-800 mb-2">✨ Your 14-Day Free Trial Includes:</h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-amber-700">
                <li>• Full access to the {selectedPlanData?.name} plan features</li>
                <li>• Up to {selectedPlanData?.maxRooms} rooms</li>
                <li>• No credit card required</li>
                <li>• Cancel anytime during trial</li>
              </ul>
              <p className="text-xs text-amber-600 mt-3 text-center">
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
            
            <p className="text-center text-xs text-stone-400">
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
