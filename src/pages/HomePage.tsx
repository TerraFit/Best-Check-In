import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { PLAN_ORDER, PACKAGES, getPackage } from '../config/packages';
import { featuresForPackageDisplay } from '../config/featureRegistry';

export default function HomePage() {
  const navigate = useNavigate();
  const [loginLoading, setLoginLoading] = useState(false);

  const pricingPlans = PLAN_ORDER.filter((id) => !PACKAGES[id].contactSales).map((id) => {
    const pkg = PACKAGES[id];
    const incremental = featuresForPackageDisplay(id)
      .filter((f) => f.minimumPackage === id)
      .map((f) => f.name);
    const features =
      id === 'starter'
        ? incremental.length
          ? incremental
          : ['Digital guest check-in forms', 'Booking dashboard', 'Guest data export (CSV)']
        : [
            `Everything in ${getPackage(PLAN_ORDER[PLAN_ORDER.indexOf(id) - 1]).name}`,
            ...incremental.slice(0, 4),
          ];
    return {
      name: pkg.name,
      priceMonthly: pkg.priceMonthly,
      priceYearly: pkg.priceYearly,
      maxRooms: pkg.maxRooms ?? 20,
      features,
      isPopular: pkg.popular,
      buttonText: 'Start Free Trial',
      buttonVariant: pkg.popular ? 'primary' : 'outline',
    };
  });

  const enterprise = PACKAGES.enterprise;

  const handleBusinessLogin = async () => {
    setLoginLoading(true);
    setTimeout(() => {
      navigate('/business/login');
      setLoginLoading(false);
    }, 500);
  };

  const scrollToPricing = () => {
    document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-stone-900">
      <div className="relative bg-stone-900 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')",
          }}
        />
        <div className="absolute inset-0 bg-stone-900/40" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="flex justify-start mb-8">
            <img
              src="/fastcheckin-logo.png"
              alt="FastCheckin"
              className="h-24 w-auto object-contain"
            />
          </div>

          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
              Transform Your <span className="text-amber-500">Check-In Experience</span>
            </h1>
            <p className="text-2xl text-white mb-8 max-w-2xl mx-auto">
              The all-in-one digital check-in solution for South African hotels and guest houses
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="px-8 py-3 bg-amber-500 text-stone-900 rounded-lg font-semibold hover:bg-amber-400"
              >
                Start Your 14-Day Free Trial
              </button>
              <button
                type="button"
                onClick={handleBusinessLogin}
                disabled={loginLoading}
                className="px-8 py-3 bg-transparent text-amber-500 border-2 border-amber-500 rounded-lg font-semibold hover:bg-amber-500/10 disabled:opacity-50"
              >
                {loginLoading ? 'Processing...' : 'Business Login'}
              </button>
            </div>
            <p className="mt-4 text-sm text-white/80">
              14-day free trial · No credit card required · Cancel anytime
            </p>
          </div>
        </div>
      </div>

      <div id="pricing-section" className="bg-stone-800/50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
            <p className="text-stone-300">Start with a 14-day free trial. No credit card required.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative bg-stone-800 rounded-2xl shadow-lg overflow-hidden ${
                  plan.isPopular ? 'ring-2 ring-amber-500' : 'border border-stone-700'
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute top-0 right-0 bg-amber-500 text-stone-900 px-4 py-1 text-xs font-bold uppercase">
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
                        <span className="text-green-500">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => navigate('/register')}
                    className={`w-full py-3 rounded-lg font-semibold ${
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

          <div className="mt-12 bg-stone-800 rounded-2xl p-8 text-center border border-stone-700">
            <h3 className="text-2xl font-bold text-white mb-2">{enterprise.name}</h3>
            <p className="text-amber-500 font-semibold mb-4">Custom Pricing (ZAR)</p>
            <p className="text-stone-300 mb-6">{enterprise.description}</p>
            <button
              type="button"
              onClick={() => {
                window.location.href = 'mailto:sales@fastcheckin.co.za';
              }}
              className="px-8 py-3 border-2 border-amber-500 text-amber-500 rounded-lg font-semibold hover:bg-amber-500/10"
            >
              Contact Us
            </button>
          </div>

          <div className="text-center mt-12">
            <button type="button" onClick={scrollToPricing} className="text-stone-500 text-sm">
              Pricing details above
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-amber-500 to-amber-600 py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-stone-900 mb-4">
            Ready to digitize your check-in process?
          </h2>
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="px-8 py-3 bg-stone-900 text-amber-500 rounded-lg font-semibold"
          >
            Get Started Today
          </button>
        </div>
      </div>

      <footer className="bg-stone-900 text-stone-400 py-12 border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs">
          © {new Date().getFullYear()} FastCheckin. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
