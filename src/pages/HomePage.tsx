import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-stone-900">
      {/* Hero Section */}
      <div className="relative bg-stone-900 overflow-hidden">
        {/* Background image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: "url('https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')"
          }}
        ></div>
        
        {/* Light overlay for text readability */}
        <div className="absolute inset-0 bg-stone-900/40"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          {/* Logo - Left aligned, twice as large */}
          <div className="flex justify-start mb-8">
            <img 
              src="/fastcheckin-logo.png" 
              alt="FastCheckin" 
              className="h-24 w-auto"
            />
          </div>
          
          {/* Text content - Centered as original */}
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
              Transform Your{' '}
              <span className="text-amber-500">Check-In Experience</span>
            </h1>
            
            {/* Subtitle - Slightly larger (text-2xl instead of text-xl) */}
            <p className="text-2xl text-white mb-8 max-w-2xl mx-auto">
              The all-in-one digital check-in solution for South African hotels and guest houses
            </p>
            
            {/* Feature badges */}
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
            
            {/* Buttons */}
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
            
            {/* Free trial notice */}
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

      {/* Pricing Section */}
      <div className="bg-stone-800/50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-white mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-center text-stone-300 mb-12">
            Start with a 14-day free trial. No credit card required.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-stone-800 p-8 rounded-2xl shadow-lg border border-stone-700">
              <h3 className="text-2xl font-bold text-white mb-2">Monthly</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold text-amber-500">R299</span>
                <span className="text-stone-400"> / month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-stone-300">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Unlimited check-ins
                </li>
                <li className="flex items-center gap-2 text-stone-300">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Full compliance suite
                </li>
                <li className="flex items-center gap-2 text-stone-300">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Analytics dashboard
                </li>
              </ul>
              <button
                onClick={() => navigate('/register')}
                className="w-full py-3 bg-amber-500 text-stone-900 rounded-lg font-semibold hover:bg-amber-400 transition-colors"
              >
                Start Free Trial
              </button>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-8 rounded-2xl shadow-lg text-stone-900">
              <h3 className="text-2xl font-bold mb-2">Annual</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold">R2,990</span>
                <span className="text-stone-800"> / year</span>
                <span className="ml-2 text-sm bg-stone-900/20 px-2 py-1 rounded">SAVE 17%</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-stone-800">
                  <svg className="w-5 h-5 text-stone-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Everything in Monthly
                </li>
                <li className="flex items-center gap-2 text-stone-800">
                  <svg className="w-5 h-5 text-stone-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Priority support
                </li>
                <li className="flex items-center gap-2 text-stone-800">
                  <svg className="w-5 h-5 text-stone-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Custom branding
                </li>
              </ul>
              <button
                onClick={() => navigate('/register')}
                className="w-full py-3 bg-stone-900 text-amber-500 rounded-lg font-semibold hover:bg-stone-800 transition-colors"
              >
                Start Free Trial
              </button>
            </div>
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
                className="h-12 w-auto mb-2"
              />
              <p className="text-sm">Streamlined Hotel Check-ins</p>
            </div>
            <div className="flex gap-8 text-sm">
              <a href="#" className="hover:text-white transition-colors">About</a>
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <button 
                onClick={() => navigate('/login')}
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
