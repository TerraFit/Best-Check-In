import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const navigate = useNavigate();

  const pricingPlans = [
    {
      name: 'Starter',
      priceMonthly: 349,
      priceYearly: 3490,
      maxRooms: 5,
      features: [
        'Digital guest check-in forms',
        'Booking dashboard',
        'Guest data export (CSV)',
        'Basic branding'
      ],
      isPopular: false,
      buttonText: 'Start Free Trial',
      buttonVariant: 'outline'
    },
    {
      name: 'Growth',
      priceMonthly: 649,
      priceYearly: 6490,
      maxRooms: 10,
      features: [
        'Everything in Starter',
        'Automated email confirmations',
        'Guest history tracking',
        'Regional data auto-fill',
        'Priority email support'
      ],
      isPopular: true,
      buttonText: 'Start Free Trial',
      buttonVariant: 'primary'
    },
    {
      name: 'Pro',
      priceMonthly: 949,
      priceYearly: 9490,
      maxRooms: 15,
      features: [
        'Everything in Growth',
        'Custom branding (logo + colors)',
        'Analytics dashboard',
        'Multi-user access',
        'Export to integrations (Mailchimp-ready)'
      ],
      isPopular: false,
      buttonText: 'Start Free Trial',
      buttonVariant: 'outline'
    },
    {
      name: 'Business',
      priceMonthly: 1290,
      priceYearly: 12900,
      maxRooms: 20,
      features: [
        'Everything in Pro',
        'Advanced analytics',
        'Priority support (fast response)',
        'Early access to new features'
      ],
      isPopular: false,
      buttonText: 'Start Free Trial',
      buttonVariant: 'outline'
    }
  ];

  return (
    <div className="min-h-screen bg-stone-900">
      {/* Hero Section */}
      <div className="relative bg-stone-900 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: "url('https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')"
          }}
        ></div>
        <div className="absolute inset-0 bg-stone-900/40"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="flex justify-start mb-8">
            <img 
              src="/fastcheckin-logo.png" 
              alt="FastCheckin" 
              className="h-24 w-auto object-contain"
              style={{ imageRendering: 'auto' }}
            />
          </div>
          
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
              Transform Your{' '}
              <span className="text-amber-500">Check-In Experience</span>
            </h1>
            
            <p className="text-2xl text-white mb-8 max-w-2xl mx-auto">
              The all-in-one digital check-in solution for South African hotels and guest houses
            </p>
            
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white mb-8">
              <span className="flex items-center gap-2">
                <span className="text-amber-500">✓</span>
                <span>POPIA Compliant</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="text-amber-500">✓</span>
                <span>Digital Indemnity Forms</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="text-amber-500">✓</span>
                <span>ID Capture</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="text-amber-500">✓</span>
                <span>Guest Registry</span>
              </span>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/register')}
                className="px-8 py-3 bg-amber-500 text-stone-900 rounded-lg font-semibold hover:bg-amber-400 transition-colors shadow-md"
              >
                Start Your 14-Day Free Trial
              </button>
              <button
                onClick={() => navigate('/business/login')}
                className="px-8 py-3 bg-transparent text-amber-500 border-2 border-amber-500 rounded-lg font-semibold hover:bg-amber-500/10 transition-colors"
              >
                Business Login
              </button>
            </div>
            
            <p className="mt-4 text-sm text-white/80">
              ✦ 14-day free trial ✦ No credit card required ✦ Cancel anytime
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold text-center text-white mb-12">
          Everything you need to run your front desk
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="text-center p-6 bg-stone-800/50 rounded-xl">
            <div className="text-4xl mb-4">📱</div>
            <h3 className="text-xl font-semibold text-white mb-2">Digital Check-In</h3>
            <p className="text-stone-300">Guests check in using their own device. No more paper forms.</p>
          </div>
          <div className="text-center p-6 bg-stone-800/50 rounded-xl">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold text-white mb-2">POPIA Compliant</h3>
            <p className="text-stone-300">Fully compliant with South African data protection laws.</p>
          </div>
          <div className="text-center p-6 bg-stone-800/50 rounded-xl">
            <div className="text-4xl mb-4">📸</div>
            <h3 className="text-xl font-semibold text-white mb-2">ID Capture</h3>
            <p className="text-stone-300">Take photos of IDs directly through the web app.</p>
          </div>
          <div className="text-center p-6 bg-stone-800/50 rounded-xl">
            <div className="text-4xl mb-4">✍️</div>
            <h3 className="text-xl font-semibold text-white mb-2">Digital Signatures</h3>
            <p className="text-stone-300">Guests sign indemnity forms electronically.</p>
          </div>
          <div className="text-center p-6 bg-stone-800/50 rounded-xl">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-white mb-2">Analytics Dashboard</h3>
            <p className="text-stone-300">Track occupancy, revenue, and guest origins.</p>
          </div>
          <div className="text-center p-6 bg-stone-800/50 rounded-xl">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-white mb-2">Statutory Register</h3>
            <p className="text-stone-300">Automated guest registry for Immigration Act compliance.</p>
          </div>
        </div>
      </div>

      {/* Pricing Section - New Cards */}
      <div className="bg-stone-800/50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-stone-300">
              Start with a 14-day free trial. No credit card required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative bg-stone-800 rounded-2xl shadow-lg overflow-hidden transition-transform hover:scale-105 ${
                  plan.isPopular ? 'ring-2 ring-amber-500' : 'border border-stone-700'
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute top-0 right-0 bg-amber-500 text-stone-900 px-4 py-1 text-xs font-bold uppercase tracking-wider">
                    Most Popular
                  </div>
                )}
                
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <p className="text-stone-400 text-sm mb-4">Up to {plan.maxRooms} rooms</p>
                  
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-amber-500">R{plan.priceMonthly}</span>
                      <span className="text-stone-400">/month</span>
                    </div>
                    <div className="text-sm text-stone-400">
                      or <span className="text-white">R{plan.priceYearly}</span>/year
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-stone-300 text-sm">
                        <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => navigate('/register')}
                    className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                      plan.buttonVariant === 'primary'
                        ? 'bg-amber-500 text-stone-900 hover:bg-amber-400'
                        : 'bg-stone-700 text-white hover:bg-stone-600'
                    }`}
                  >
                    {plan.buttonText}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Enterprise Tier */}
          <div className="mt-12 bg-gradient-to-r from-stone-800 to-stone-800/50 rounded-2xl p-8 text-center border border-stone-700">
            <h3 className="text-2xl font-bold text-white mb-2">Enterprise</h3>
            <p className="text-amber-500 font-semibold mb-4">Custom Pricing</p>
            <ul className="flex flex-wrap justify-center gap-6 mb-6 text-stone-300 text-sm">
              <li>✓ 20+ rooms</li>
              <li>✓ Multi-property support</li>
              <li>✓ Dedicated onboarding</li>
              <li>✓ API access (coming soon)</li>
            </ul>
            <button
              onClick={() => window.location.href = 'mailto:sales@fastcheckin.co.za'}
              className="px-8 py-3 bg-transparent border-2 border-amber-500 text-amber-500 rounded-lg font-semibold hover:bg-amber-500/10 transition-colors"
            >
              Contact Us
            </button>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-stone-900 mb-4">
            Ready to digitize your check-in process?
          </h2>
          <p className="text-stone-800 mb-8">
            Join hoteliers across South Africa using FastCheckin
          </p>
          <button
            onClick={() => navigate('/register')}
            className="px-8 py-3 bg-stone-900 text-amber-500 rounded-lg font-semibold hover:bg-stone-800 transition-colors"
          >
            Get Started Today
          </button>
          <p className="text-stone-800 text-sm mt-4">
            14-day free trial • No credit card required • Cancel anytime
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-stone-900 text-stone-400 py-12 border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <img 
                src="/fastcheckin-logo.png" 
                alt="FastCheckin" 
                className="h-12 w-auto object-contain mb-2"
                style={{ imageRendering: 'auto' }}
              />
              <p className="text-sm">Streamlined Hotel Check-ins</p>
            </div>
            <div className="flex gap-8 text-sm">
              <a href="#" className="hover:text-white transition-colors">About</a>
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <button 
                onClick={() => navigate('/super-admin-login')}
                className="hover:text-white transition-colors"
              >
                Super Admin
              </button>
            </div>
          </div>
          <div className="text-center text-xs mt-8">
            &copy; {new Date().getFullYear()} FastCheckin. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
