import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-orange-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center">
            {/* Small logo at top - subtle */}
            <div className="flex justify-center mb-6">
              <img 
                src="/fastcheckin-logo.png" 
                alt="FastCheckin" 
                className="h-12 w-auto"
              />
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Transform Your{' '}
              <span className="text-orange-500">Check-In Experience</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              The all-in-one digital check-in solution for South African hotels and guest houses
            </p>
            
            {/* Changed from "100+ Hotels" to authentic message */}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-8">
              <span>✓</span>
              <span>Trusted by hoteliers across South Africa</span>
              <span>✓</span>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/register')}
                className="px-8 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
              >
                Start Your 14-Day Free Trial
              </button>
              <button
                onClick={() => navigate('/business/login')}
                className="px-8 py-3 bg-white text-orange-500 border-2 border-orange-500 rounded-lg font-semibold hover:bg-orange-50 transition-colors"
              >
                Business Login
              </button>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              ✦ No credit card required ✦ Cancel anytime ✦ South African owned
            </p>
          </div>
        </div>
      </div>

      {/* Features Grid - Keep exactly as it was */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Everything you need to run your front desk
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="text-4xl mb-4">📱</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Digital Check-In</h3>
            <p className="text-gray-600">Guests check in using their own device. No more paper forms.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">POPIA Compliant</h3>
            <p className="text-gray-600">Fully compliant with South African data protection laws.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="text-4xl mb-4">📸</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">ID Capture</h3>
            <p className="text-gray-600">Take photos of IDs directly through the web app.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="text-4xl mb-4">✍️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Digital Signatures</h3>
            <p className="text-gray-600">Guests sign indemnity forms electronically.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Analytics Dashboard</h3>
            <p className="text-gray-600">Track occupancy, revenue, and guest origins.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Statutory Register</h3>
            <p className="text-gray-600">Automated guest registry for Immigration Act compliance.</p>
          </div>
        </div>
      </div>

      {/* Pricing Section - Keep exactly as it was */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-center text-gray-600 mb-12">
            Start with a 14-day free trial. No credit card required.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Monthly</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold text-orange-500">R299</span>
                <span className="text-gray-500"> / month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Unlimited check-ins
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Full compliance suite
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Analytics dashboard
                </li>
              </ul>
              <button
                onClick={() => navigate('/register')}
                className="w-full py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
              >
                Start Free Trial
              </button>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-8 rounded-xl shadow-lg text-white">
              <h3 className="text-2xl font-bold mb-2">Annual</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold">R2,990</span>
                <span className="text-white/80"> / year</span>
                <span className="ml-2 text-sm bg-white/20 px-2 py-1 rounded">Save 17%</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Everything in Monthly
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Priority support
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Custom branding
                </li>
              </ul>
              <button
                onClick={() => navigate('/register')}
                className="w-full py-3 bg-white text-orange-500 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Start Free Trial
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section - Keep exactly as it was */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to digitize your check-in process?
          </h2>
          <p className="text-white/90 mb-8">
            Join hoteliers across South Africa using FastCheckin
          </p>
          <button
            onClick={() => navigate('/register')}
            className="px-8 py-3 bg-white text-orange-500 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Get Started Today
          </button>
          <p className="text-white/80 text-sm mt-4">
            14-day free trial • No credit card required • Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}
