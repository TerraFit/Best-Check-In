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
            <h3 className="text-xl font-semibold text-white mb-2">Digital Signatures
