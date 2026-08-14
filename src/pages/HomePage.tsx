import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from '../i18n';

export default function HomePage() {
  const navigate = useNavigate();
  const [loginLoading, setLoginLoading] = useState(false);
  const { t } = useTranslation();

  const pricingPlans = [
    {
      nameKey: 'landing_plan_starter' as const,
      priceMonthly: 349,
      priceYearly: 3490,
      maxRooms: 5,
      featureKeys: [
        'landing_plan_starter_f1',
        'landing_plan_starter_f2',
        'landing_plan_starter_f3',
        'landing_plan_starter_f4'
      ] as const,
      isPopular: false,
      buttonVariant: 'outline' as const
    },
    {
      nameKey: 'landing_plan_growth' as const,
      priceMonthly: 649,
      priceYearly: 6490,
      maxRooms: 10,
      featureKeys: [
        'landing_plan_growth_f1',
        'landing_plan_growth_f2',
        'landing_plan_growth_f3',
        'landing_plan_growth_f4',
        'landing_plan_growth_f5'
      ] as const,
      isPopular: true,
      buttonVariant: 'primary' as const
    },
    {
      nameKey: 'landing_plan_pro' as const,
      priceMonthly: 949,
      priceYearly: 9490,
      maxRooms: 15,
      featureKeys: [
        'landing_plan_pro_f1',
        'landing_plan_pro_f2',
        'landing_plan_pro_f3',
        'landing_plan_pro_f4',
        'landing_plan_pro_f5'
      ] as const,
      isPopular: false,
      buttonVariant: 'outline' as const
    },
    {
      nameKey: 'landing_plan_business' as const,
      priceMonthly: 1290,
      priceYearly: 12900,
      maxRooms: 20,
      featureKeys: [
        'landing_plan_business_f1',
        'landing_plan_business_f2',
        'landing_plan_business_f3',
        'landing_plan_business_f4'
      ] as const,
      isPopular: false,
      buttonVariant: 'outline' as const
    }
  ];

  const handleBusinessLogin = async () => {
    setLoginLoading(true);
    setTimeout(() => {
      navigate('/business/login');
      setLoginLoading(false);
    }, 500);
  };

  const scrollToPricing = () => {
    const pricingSection = document.getElementById('pricing-section');
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

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
              alt={t('landing_logo_alt')}
              className="h-24 w-auto object-contain"
              style={{ imageRendering: 'auto' }}
            />
          </div>

          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
              {t('landing_hero_title_prefix')}{' '}
              <span className="text-amber-500">{t('landing_hero_title_highlight')}</span>
            </h1>

            <p className="text-2xl text-white mb-8 max-w-2xl mx-auto">
              {t('landing_hero_subtitle')}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white mb-8">
              <span className="flex items-center gap-2">
                <span className="text-amber-500">✓</span>
                <span>{t('landing_badge_popia')}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="text-amber-500">✓</span>
                <span>{t('landing_badge_indemnity')}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="text-amber-500">✓</span>
                <span>{t('landing_badge_id_capture')}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="text-amber-500">✓</span>
                <span>{t('landing_badge_registry')}</span>
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/register')}
                className="px-8 py-3 bg-amber-500 text-stone-900 rounded-lg font-semibold hover:bg-amber-400 transition-colors shadow-md"
              >
                {t('landing_cta_trial')}
              </button>
              <button
                onClick={handleBusinessLogin}
                disabled={loginLoading}
                className="px-8 py-3 bg-transparent text-amber-500 border-2 border-amber-500 rounded-lg font-semibold hover:bg-amber-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loginLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t('common_processing')}
                  </>
                ) : (
                  t('landing_cta_business_login')
                )}
              </button>
            </div>

            <p className="mt-4 text-sm text-white/80">
              {t('landing_trial_note')}
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold text-center text-white mb-12">
          {t('landing_features_heading')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="text-center p-6 bg-stone-800/50 rounded-xl">
            <div className="text-4xl mb-4">📱</div>
            <h3 className="text-xl font-semibold text-white mb-2">{t('landing_feature_digital_title')}</h3>
            <p className="text-stone-300">{t('landing_feature_digital_desc')}</p>
          </div>
          <div className="text-center p-6 bg-stone-800/50 rounded-xl">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold text-white mb-2">{t('landing_feature_popia_title')}</h3>
            <p className="text-stone-300">{t('landing_feature_popia_desc')}</p>
          </div>
          <div className="text-center p-6 bg-stone-800/50 rounded-xl">
            <div className="text-4xl mb-4">📸</div>
            <h3 className="text-xl font-semibold text-white mb-2">{t('landing_feature_id_title')}</h3>
            <p className="text-stone-300">{t('landing_feature_id_desc')}</p>
          </div>
          <div className="text-center p-6 bg-stone-800/50 rounded-xl">
            <div className="text-4xl mb-4">✍️</div>
            <h3 className="text-xl font-semibold text-white mb-2">{t('landing_feature_signature_title')}</h3>
            <p className="text-stone-300">{t('landing_feature_signature_desc')}</p>
          </div>
          <div className="text-center p-6 bg-stone-800/50 rounded-xl">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-white mb-2">{t('landing_feature_analytics_title')}</h3>
            <p className="text-stone-300">{t('landing_feature_analytics_desc')}</p>
          </div>
          <div className="text-center p-6 bg-stone-800/50 rounded-xl">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-white mb-2">{t('landing_feature_register_title')}</h3>
            <p className="text-stone-300">{t('landing_feature_register_desc')}</p>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div id="pricing-section" className="bg-stone-800/50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              {t('landing_pricing_heading')}
            </h2>
            <p className="text-stone-300">
              {t('landing_pricing_subheading')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricingPlans.map((plan) => (
              <div
                key={plan.nameKey}
                className={`relative bg-stone-800 rounded-2xl shadow-lg overflow-hidden transition-transform hover:scale-105 ${
                  plan.isPopular ? 'ring-2 ring-amber-500' : 'border border-stone-700'
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute top-0 right-0 bg-amber-500 text-stone-900 px-4 py-1 text-xs font-bold uppercase tracking-wider">
                    {t('landing_plan_most_popular')}
                  </div>
                )}

                <div className="p-6">
                  <h3 className="text-2xl font-bold text-white mb-2">{t(plan.nameKey)}</h3>
                  <p className="text-stone-400 text-sm mb-4">{t('landing_plan_up_to_rooms', { count: plan.maxRooms })}</p>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-amber-500">R{plan.priceMonthly}</span>
                      <span className="text-stone-400">{t('landing_plan_per_month')}</span>
                    </div>
                    <div className="text-sm text-stone-400">
                      {t('landing_plan_or_year')} <span className="text-white">R{plan.priceYearly}</span>{t('landing_plan_per_year')}
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.featureKeys.map((featureKey) => (
                      <li key={featureKey} className="flex items-start gap-2 text-stone-300 text-sm">
                        <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{t(featureKey)}</span>
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
                    {t('landing_plan_start_trial')}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12 animate-bounce">
            <button
              onClick={scrollToPricing}
              className="text-stone-500 text-sm flex items-center justify-center gap-2 hover:text-stone-400 transition-colors group"
            >
              <span>{t('landing_register_here')}</span>
              <svg className="w-4 h-4 group-hover:translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
          </div>

          {/* Enterprise Tier */}
          <div className="mt-12 bg-gradient-to-r from-stone-800 to-stone-800/50 rounded-2xl p-8 text-center border border-stone-700">
            <h3 className="text-2xl font-bold text-white mb-2">{t('landing_enterprise_title')}</h3>
            <p className="text-amber-500 font-semibold mb-4">{t('landing_enterprise_pricing')}</p>
            <ul className="flex flex-wrap justify-center gap-6 mb-6 text-stone-300 text-sm">
              <li>✓ {t('landing_enterprise_f1')}</li>
              <li>✓ {t('landing_enterprise_f2')}</li>
              <li>✓ {t('landing_enterprise_f3')}</li>
              <li>✓ {t('landing_enterprise_f4')}</li>
            </ul>
            <button
              onClick={() => window.location.href = 'mailto:sales@fastcheckin.co.za'}
              className="px-8 py-3 bg-transparent border-2 border-amber-500 text-amber-500 rounded-lg font-semibold hover:bg-amber-500/10 transition-colors"
            >
              {t('landing_contact_us')}
            </button>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-stone-900 mb-4">
            {t('landing_cta_heading')}
          </h2>
          <p className="text-stone-800 mb-8">
            {t('landing_cta_subheading')}
          </p>
          <button
            onClick={() => navigate('/register')}
            className="px-8 py-3 bg-stone-900 text-amber-500 rounded-lg font-semibold hover:bg-stone-800 transition-colors"
          >
            {t('landing_cta_get_started')}
          </button>
          <p className="text-stone-800 text-sm mt-4">
            {t('landing_cta_trial_note')}
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
                alt={t('landing_logo_alt')}
                className="h-12 w-auto object-contain mb-2"
                style={{ imageRendering: 'auto' }}
              />
              <p className="text-sm">{t('landing_footer_tagline')}</p>
            </div>
            <div className="flex gap-8 text-sm">
              <a href="#" className="hover:text-white transition-colors">{t('landing_footer_about')}</a>
              <a href="#" className="hover:text-white transition-colors">{t('landing_footer_privacy')}</a>
              <a href="#" className="hover:text-white transition-colors">{t('landing_footer_terms')}</a>
              <button
                onClick={() => navigate('/super-admin-login')}
                className="hover:text-white transition-colors"
              >
                {t('landing_footer_super_admin')}
              </button>
            </div>
          </div>
          <div className="text-center text-xs mt-8">
            {t('landing_footer_copyright', { year: new Date().getFullYear() })}
          </div>
        </div>
      </footer>
    </div>
  );
}
