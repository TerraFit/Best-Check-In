import React from 'react';
import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Hero Section - Sales Focused */}
      <div className="relative bg-stone-900 text-white min-h-[90vh] flex items-center">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-black/60 z-10" />
          <img 
            src="https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" 
            alt="Luxury lodge pool at sunset"
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="relative z-20 max-w-7xl mx-auto px-6 py-32">
          <div className="max-w-3xl">
            {/* Trust Badge */}
            <div className="inline-block bg-amber-600/20 backdrop-blur-sm border border-amber-500/30 rounded-full px-4 py-2 mb-6">
              <span className="text-amber-400 text-sm font-bold tracking-wider">
                ⚡ Trusted by 100+ Hotels & Guest Houses
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl font-serif font-bold mb-6 leading-tight">
              Transform Your <span className="text-amber-400">Check-In</span> Experience
            </h1>
            
            <p className="text-xl md:text-2xl text-stone-200 mb-4">
              The all-in-one digital check-in solution for South African hotels and guest houses
            </p>
            
            {/* Value Props */}
            <div className="grid grid-cols-2 gap-4 my-8">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-stone-300">POPIA Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-stone-300">Digital Indemnity Forms</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-stone-300">ID Capture</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-stone-300">Guest Registry</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/register"
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-5 px-10 rounded-xl transition-all transform hover:scale-105 shadow-2xl text-center text-lg"
              >
                Get Started Now
              </Link>
              <Link
                to="/business/login"
                className="bg-white/10 backdrop-blur-sm border-2 border-white/30 hover:bg-white/20 text-white font-bold py-5 px-10 rounded-xl transition-all transform hover:scale-105 text-center text-lg"
              >
                Business Login
              </Link>
            </div>

            {/* Social Proof */}
            <p className="text-sm text-stone-400 mt-8">
              ✦ 14-day free trial ✦ No credit card required ✦ Cancel anytime
            </p>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-serif font-bold text-stone-900 mb-4">
            Everything you need to run your front desk
          </h2>
          <p className="text-xl text-stone-500 max-w-3xl mx-auto">
            From digital check-ins to statutory compliance, we've got you covered
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon="📱"
            title="Digital Check-In"
            description="Guests check in using their own device. No more paper forms."
          />
          <FeatureCard
            icon="🔒"
            title="POPIA Compliant"
            description="Fully compliant with South African data protection laws."
          />
          <FeatureCard
            icon="📸"
            title="ID Capture"
            description="Take photos of IDs directly through the web app."
          />
          <FeatureCard
            icon="✍️"
            title="Digital Signatures"
            description="Guests sign indemnity forms electronically."
          />
          <FeatureCard
            icon="📊"
            title="Analytics Dashboard"
            description="Track occupancy, revenue, and guest origins."
          />
          <FeatureCard
            icon="📋"
            title="Statutory Register"
            description="Automated guest registry for Immigration Act compliance."
          />
        </div>
      </div>

      {/* Pricing Section */}
      <div className="bg-stone-100 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-serif font-bold text-stone-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-stone-500">Start with a 14-day free trial. No credit card required.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Monthly Plan */}
            <div className="bg-white rounded-3xl shadow-xl p-8 border-2 border-stone-200 hover:border-amber-600 transition-all">
              <h3 className="text-2xl font-bold text-stone-900 mb-2">Monthly</h3>
              <p className="text-5xl font-serif font-bold text-amber-600 mb-4">R299</p>
              <p className="text-stone-500 mb-6">per month</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Unlimited check-ins</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Full compliance suite</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Analytics dashboard</span>
                </li>
              </ul>
              <Link
                to="/register"
                className="block w-full bg-stone-900 text-white text-center py-4 rounded-xl font-bold hover:bg-stone-800 transition-colors"
              >
                Start Free Trial
              </Link>
            </div>

            {/* Annual Plan */}
            <div className="bg-white rounded-3xl shadow-xl p-8 border-2 border-amber-600 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-amber-600 text-white px-4 py-1 text-sm font-bold">
                SAVE 17%
              </div>
              <h3 className="text-2xl font-bold text-stone-900 mb-2">Annual</h3>
              <p className="text-5xl font-serif font-bold text-amber-600 mb-4">R2,990</p>
              <p className="text-stone-500 mb-6">R249/month</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Everything in Monthly</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Priority support</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Custom branding</span>
                </li>
              </ul>
              <Link
                to="/register"
                className="block w-full bg-amber-600 text-white text-center py-4 rounded-xl font-bold hover:bg-amber-700 transition-colors"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-stone-900 text-white py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-serif font-bold mb-6">
            Ready to digitize your check-in process?
          </h2>
          <p className="text-xl text-stone-300 mb-10">
            Join hundreds of hotels already using FastCheckin
          </p>
          <Link
            to="/register"
            className="inline-block bg-amber-600 hover:bg-amber-700 text-white font-bold py-5 px-12 rounded-xl text-lg transition-all transform hover:scale-105 shadow-2xl"
          >
            Get Started Today
          </Link>
          <p className="text-sm text-stone-400 mt-6">
            14-day free trial • No credit card required • Cancel anytime
          </p>
        </div>
      </div>

      {/* Footer with Super Admin Link */}
      <footer className="bg-stone-900 text-stone-500 py-12 px-6 border-t border-stone-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <h4 className="text-white font-bold text-2xl mb-2 tracking-tighter">
                FAST<span className="text-amber-600">CHECKIN</span>
              </h4>
              <p className="text-sm italic text-stone-400">Streamlined Hotel Check-ins</p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-8 text-xs uppercase tracking-widest">
              <Link to="/about" className="hover:text-amber-500 transition-colors">About</Link>
              <Link to="/privacy" className="hover:text-amber-500 transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-amber-500 transition-colors">Terms</Link>
              <Link to="/contact" className="hover:text-amber-500 transition-colors">Contact</Link>
              <Link 
                to="/login" 
                className="text-amber-600 hover:text-amber-500 transition-colors font-bold"
              >
                Super Admin
              </Link>
            </div>
          </div>
          
          <div className="text-center mt-8 pt-8 border-t border-stone-800">
            <p className="text-xs">© 2026 FastCheckin. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Helper component for feature cards
function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-stone-900 mb-2">{title}</h3>
      <p className="text-stone-500">{description}</p>
    </div>
  );
}
