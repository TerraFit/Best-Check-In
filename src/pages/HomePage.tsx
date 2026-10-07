import { useNavigate } from 'react-router-dom';
import { useState, type FormEvent } from 'react';
import { useTranslation } from '../i18n';
import HomepageLeadModal, { type HomepageDocument } from '../components/HomepageLeadModal';
import HomepageLegalModal from '../components/HomepageLegalModal';
import EnterpriseInquiryModal from '../components/EnterpriseInquiryModal';
import TurnstileWidget from '../components/TurnstileWidget';
import GlobalMarketSelector from '../components/GlobalMarketSelector';
import { useMarket } from '../context/MarketContext';
import { getRegionalPricing } from '../config/pricing';
import {
  BarChart3,
  BedDouble,
  Check,
  ClipboardCheck,
  FileCheck2,
  Globe2,
  Hotel,
  IdCard,
  LayoutDashboard,
  LineChart,
  PenLine,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench
} from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();
  const [loginLoading, setLoginLoading] = useState(false);
  const [downloadDocument, setDownloadDocument] = useState<HomepageDocument | null>(null);
  const [legalDocument, setLegalDocument] = useState<'privacy' | 'terms' | null>(null);
  const [enterpriseInquiryOpen, setEnterpriseInquiryOpen] = useState(false);
  const [inquiryBusy, setInquiryBusy] = useState(false);
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [inquiryTurnstileToken, setInquiryTurnstileToken] = useState('');
  const [inquiryTurnstileResetKey, setInquiryTurnstileResetKey] = useState(0);
  const { t } = useTranslation();
  const { setChooserOpen, region, isSouthAfricanMarket } = useMarket();
  const regionalPricing = getRegionalPricing(region, isSouthAfricanMarket);

  const pricingPlans = [
    {
      nameKey: 'landing_plan_starter' as const,
      priceMonthly: regionalPricing.prices[0].monthly,
      priceYearly: regionalPricing.prices[0].yearly,
      maxRooms: 5,
      featureKeys: ['landing_plan_starter_f1', 'landing_plan_starter_f2', 'landing_plan_starter_f3', 'landing_plan_starter_f4'] as const,
      isPopular: false
    },
    {
      nameKey: 'landing_plan_growth' as const,
      priceMonthly: regionalPricing.prices[1].monthly,
      priceYearly: regionalPricing.prices[1].yearly,
      maxRooms: 10,
      featureKeys: ['landing_plan_growth_f1', 'landing_plan_growth_f2', 'landing_plan_growth_f3', 'landing_plan_growth_f4', 'landing_plan_growth_f5'] as const,
      isPopular: true
    },
    {
      nameKey: 'landing_plan_pro' as const,
      priceMonthly: regionalPricing.prices[2].monthly,
      priceYearly: regionalPricing.prices[2].yearly,
      maxRooms: 15,
      featureKeys: ['landing_plan_pro_f1', 'landing_plan_pro_f2', 'landing_plan_pro_f3', 'landing_plan_pro_f4', 'landing_plan_pro_f5'] as const,
      isPopular: false
    },
    {
      nameKey: 'landing_plan_business' as const,
      priceMonthly: regionalPricing.prices[3].monthly,
      priceYearly: regionalPricing.prices[3].yearly,
      maxRooms: 20,
      featureKeys: ['landing_plan_business_f1', 'landing_plan_business_f2', 'landing_plan_business_f3', 'landing_plan_business_f4'] as const,
      isPopular: false
    }
  ];

  const platformFeatures = [
    { icon: ClipboardCheck, title: 'landing_feature_digital_title', desc: 'landing_feature_digital_desc' },
    { icon: Users, title: 'landing_platform_guest_title', desc: 'landing_platform_guest_desc' },
    { icon: Wrench, title: 'landing_platform_operations_title', desc: 'landing_platform_operations_desc' },
    { icon: BedDouble, title: 'landing_platform_housekeeping_title', desc: 'landing_platform_housekeeping_desc' },
    { icon: ShieldCheck, title: 'landing_feature_popia_title', desc: 'landing_feature_popia_desc' },
    { icon: BarChart3, title: 'landing_feature_analytics_title', desc: 'landing_feature_analytics_desc' }
  ];

  const handleBusinessLogin = async () => {
    setLoginLoading(true);
    setTimeout(() => {
      navigate('/business/login');
      setLoginLoading(false);
    }, 500);
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const submitInquiry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inquiryTurnstileToken) {
      setInquiryMessage(t('landing_form_security'));
      return;
    }
    setInquiryBusy(true);
    setInquiryMessage('');
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch('/.netlify/functions/homepage-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'inquiry',
          lead: {
            fullName: form.get('fullName'),
            companyName: form.get('companyName'),
            email: form.get('email'),
            telephone: form.get('telephone'),
            address: form.get('address'),
          },
          topic: form.get('topic'),
          comments: form.get('comments'),
          turnstileToken: inquiryTurnstileToken,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || t('landing_form_error'));
      formElement.reset();
      setInquiryTurnstileToken('');
      setInquiryTurnstileResetKey((value) => value + 1);
      setInquiryMessage(t('landing_form_success'));
    } catch (error) {
      setInquiryMessage(error instanceof Error ? error.message : t('landing_form_error'));
    } finally {
      setInquiryBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-white">
      {/* Hero */}
      <section className="relative min-h-[760px] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=85')" }}
        />
        <div className="absolute inset-0 bg-stone-950/35" />
        <div className="absolute inset-0 bg-gradient-to-b from-stone-950/10 via-stone-950/20 to-stone-950" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <img src="/fastcheckin-logo.png" alt={t('landing_logo_alt')} className="h-16 md:h-20 w-auto object-contain" />
            <div className="flex items-center gap-3">
              <button
                onClick={() => setChooserOpen(true)}
                className="hidden sm:inline-flex items-center rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur hover:bg-white/20 transition"
                aria-label="Change market"
              >
                {isSouthAfricanMarket ? 'South Africa' : region.replace('-', ' ')}
              </button>
              <button
                onClick={handleBusinessLogin}
                disabled={loginLoading}
                className="hidden sm:inline-flex items-center rounded-full border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur hover:bg-white/20 transition"
              >
                {loginLoading ? t('common_processing') : t('login_sign_in')}
              </button>
            </div>
          </div>

          <div className="max-w-5xl mx-auto text-center pt-28 md:pt-32 pb-28">
            <p className="text-amber-400 uppercase tracking-[0.28em] text-xs md:text-sm font-bold mb-6">
              {t('landing_redesign_eyebrow')}
            </p>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight">
              {t('landing_hero_title_prefix')}
              <span className="block text-amber-400 mt-3">{t('landing_hero_title_highlight')}</span>
            </h1>
            <p className="mt-8 text-lg md:text-2xl text-stone-200 max-w-3xl mx-auto leading-relaxed">
              {t('landing_redesign_hero_support')}
            </p>

            <div className="mt-10 flex flex-col items-center gap-4">
              <button
                onClick={() => navigate('/register')}
                className="rounded-full bg-amber-500 px-8 py-4 font-bold text-stone-950 shadow-xl shadow-amber-900/20 hover:bg-amber-400 transition"
              >
                {t('landing_cta_trial')}
              </button>
              <button
                onClick={handleBusinessLogin}
                disabled={loginLoading}
                className="rounded-full border border-white/40 bg-white/10 px-8 py-4 font-semibold text-white backdrop-blur hover:bg-white/20 transition disabled:opacity-60"
              >
                {loginLoading ? t('common_processing') : 'Login — Businesses & Employees'}
              </button>
              <button
                onClick={() => setDownloadDocument('brochure')}
                className="rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/20 transition"
              >
                {t('landing_download_brochure')}
              </button>
            </div>

            <div className="mt-10 flex flex-wrap justify-center gap-x-7 gap-y-3 text-sm text-stone-200">
              {[t('landing_badge_popia'), t('landing_badge_indemnity'), t('landing_badge_id_capture'), t('landing_badge_registry')].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-amber-400" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div
          className="pointer-events-none absolute bottom-7 left-1/2 z-10 -translate-x-1/2 flex flex-col items-center"
          aria-hidden="true"
        >
          <span className="fastcheckin-explore-label">Explore FastCheckIn</span>
          <div className="fastcheckin-chevron-cascade" aria-hidden="true">
            <span className="fastcheckin-chevron fastcheckin-chevron-1" />
            <span className="fastcheckin-chevron fastcheckin-chevron-2" />
            <span className="fastcheckin-chevron fastcheckin-chevron-3" />
          </div>
        </div>

      </section>

      {/* Story */}
      <section className="bg-white text-stone-900 py-24 md:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-14 items-center">
            <div>
              <p className="text-amber-600 uppercase tracking-[0.22em] text-sm font-bold">{t('landing_story_eyebrow')}</p>
              <h2 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight">{t('landing_story_title')}</h2>
              <p className="mt-6 text-lg text-stone-600 leading-relaxed">{t('landing_story_body')}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                [Globe2, 'landing_story_point1'],
                [IdCard, 'landing_story_point2'],
                [Wrench, 'landing_story_point3'],
                [Hotel, 'landing_story_point4']
              ].map(([Icon, key]) => {
                const IconComponent = Icon as typeof Globe2;
                return (
                  <div key={key as string} className="rounded-2xl border border-stone-200 bg-stone-50 p-6">
                    <IconComponent className="h-7 w-7 text-amber-600 mb-5" />
                    <p className="font-semibold text-stone-800">{t(key as keyof import('../i18n/types').TranslationKeys)}</p>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-10 text-center">
            <button onClick={() => setDownloadDocument('brochure')} className="rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-bold text-stone-900 hover:border-amber-500 hover:text-amber-700 transition">
              {t('landing_download_brochure')}
            </button>
          </div>
        </div>
      </section>

      {/* Outcomes */}
      <section className="bg-stone-100 text-stone-900 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="text-amber-600 uppercase tracking-[0.22em] text-sm font-bold">{t('landing_outcomes_eyebrow')}</p>
            <h2 className="mt-4 text-4xl md:text-5xl font-bold">{t('landing_outcomes_heading')}</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Sparkles, title: 'landing_outcome_serve_title', body: 'landing_outcome_serve_body', number: '01' },
              { icon: LineChart, title: 'landing_outcome_market_title', body: 'landing_outcome_market_body', number: '02' },
              { icon: LayoutDashboard, title: 'landing_outcome_grow_title', body: 'landing_outcome_grow_body', number: '03' }
            ].map(({ icon: Icon, title, body, number }) => (
              <div key={title} className="relative overflow-hidden rounded-3xl bg-white p-8 shadow-sm border border-stone-200">
                <span className="absolute right-6 top-5 text-6xl font-black text-stone-100">{number}</span>
                <Icon className="h-9 w-9 text-amber-600 relative" />
                <h3 className="mt-8 text-2xl font-bold relative">{t(title as keyof import('../i18n/types').TranslationKeys)}</h3>
                <p className="mt-4 text-stone-600 leading-relaxed relative">{t(body as keyof import('../i18n/types').TranslationKeys)}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <button onClick={() => setDownloadDocument('brochure')} className="rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-bold text-stone-900 hover:border-amber-500 hover:text-amber-700 transition">
              {t('landing_download_brochure')}
            </button>
          </div>
        </div>
      </section>

      {/* Platform */}
      <section id="platform-section" className="bg-stone-950 py-24 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-14">
            <p className="text-amber-400 uppercase tracking-[0.22em] text-sm font-bold">{t('landing_platform_eyebrow')}</p>
            <h2 className="mt-4 text-4xl md:text-5xl font-bold">{t('landing_platform_heading')}</h2>
            <p className="mt-5 text-lg text-stone-400 leading-relaxed">{t('landing_platform_subheading')}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {platformFeatures.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-stone-800 bg-stone-900/80 p-7 hover:border-amber-500/50 hover:-translate-y-1 transition-all">
                <Icon className="h-8 w-8 text-amber-400" />
                <h3 className="mt-5 text-xl font-bold">{t(title as keyof import('../i18n/types').TranslationKeys)}</h3>
                <p className="mt-3 text-stone-400 leading-relaxed">{t(desc as keyof import('../i18n/types').TranslationKeys)}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-5">
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-6 w-6 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{t('landing_compliance_title')}</p>
                <p className="text-sm text-stone-400 mt-1">{t('landing_compliance_body')}</p>
              </div>
            </div>
            <span className="text-xs uppercase tracking-widest text-amber-400 font-bold whitespace-nowrap">{t('landing_compliance_sa')}</span>
            </div>
            <button onClick={() => setDownloadDocument('brochure')} className="self-start rounded-full border border-stone-700 px-6 py-3 text-sm font-bold text-amber-400 hover:border-amber-400 transition">
              {t('landing_download_brochure')}
            </button>
          </div>
        </div>
      </section>

      {/* Intelligence */}
      <section className="bg-white text-stone-900 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <div>
              <p className="text-amber-600 uppercase tracking-[0.22em] text-sm font-bold">{t('landing_market_eyebrow')}</p>
              <h2 className="mt-4 text-4xl md:text-5xl font-bold">{t('landing_market_heading')}</h2>
              <p className="mt-6 text-lg text-stone-600 leading-relaxed">{t('landing_market_body')}</p>
            </div>

            <div className="rounded-3xl bg-stone-950 p-6 md:p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-7">
                <div>
                  <p className="text-white font-bold">{t('reports_visitor_origin_explorer')}</p>
                  <p className="text-xs text-stone-500 mt-1">{t('reports_guest_checkins_count', { count: 122 })}</p>
                </div>
                <Globe2 className="h-7 w-7 text-amber-400" />
              </div>
              <div className="space-y-5">
                {[
                  [t('analytics_region_euro_zone'), 68],
                  [t('analytics_region_africa_sub'), 47],
                  [t('analytics_region_amer_north'), 31],
                  [t('analytics_region_oceania'), 18]
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-stone-300">{label}</span>
                      <span className="text-amber-400 font-semibold">{value}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-stone-800 overflow-hidden">
                      <div className="h-full rounded-full bg-amber-500" style={{ width: `${value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-7 pt-6 border-t border-stone-800 flex items-center gap-3 text-sm text-stone-400">
                <BarChart3 className="h-5 w-5 text-amber-400" />
                {t('landing_market_visual_note')}
              </div>
              <button onClick={() => setDownloadDocument('visitor-origin')} className="mt-6 w-full rounded-xl border border-amber-500/50 px-5 py-3 text-sm font-bold text-amber-400 hover:bg-amber-500/10 transition">
                {t('landing_download_visitor_origin')}
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <div className="order-2 lg:order-1 rounded-3xl bg-stone-100 p-6 md:p-8 border border-stone-200">
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center gap-3 border-b border-stone-200 pb-5">
                  <FileCheck2 className="h-7 w-7 text-amber-600" />
                  <div>
                    <p className="font-bold">{t('landing_snapshot_card_title')}</p>
                    <p className="text-xs text-stone-500">{t('landing_snapshot_card_period')}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-6">
                  {[
                    [t('landing_snapshot_metric_checkins'), '57'],
                    [t('landing_snapshot_metric_guests'), '122'],
                    [t('landing_snapshot_metric_occupancy'), '13.2%'],
                    [t('landing_snapshot_metric_nights'), '71']
                  ].map(([label, value]) => (
                    <div key={label as string} className="rounded-xl bg-stone-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
                      <p className="text-2xl font-bold mt-1">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 h-24 rounded-xl bg-gradient-to-r from-stone-100 via-amber-50 to-stone-100 flex items-end gap-2 px-4 pb-4">
                  {[35, 52, 43, 68, 55, 77, 64, 86, 72, 91].map((height, index) => (
                    <div key={index} className="flex-1 rounded-t bg-amber-400/80" style={{ height: `${height}%` }} />
                  ))}
                </div>
                <button onClick={() => setDownloadDocument('business-snapshot')} className="mt-5 w-full rounded-xl bg-stone-950 px-5 py-3 text-sm font-bold text-amber-400 hover:bg-stone-800 transition">
                  {t('landing_download_business_snapshot')}
                </button>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <p className="text-amber-600 uppercase tracking-[0.22em] text-sm font-bold">{t('landing_snapshot_eyebrow')}</p>
              <h2 className="mt-4 text-4xl md:text-5xl font-bold">{t('landing_snapshot_heading')}</h2>
              <p className="mt-6 text-lg text-stone-600 leading-relaxed">{t('landing_snapshot_body')}</p>
            </div>
          </div>
          <div className="text-center">
            <button onClick={() => setDownloadDocument('brochure')} className="rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-bold text-stone-900 hover:border-amber-500 hover:text-amber-700 transition">
              {t('landing_download_brochure')}
            </button>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing-section" className="bg-stone-100 py-24 text-stone-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="text-amber-600 uppercase tracking-[0.22em] text-sm font-bold">{t('landing_pricing_eyebrow')}</p>
            <h2 className="mt-4 text-4xl md:text-5xl font-bold">{t('landing_pricing_heading')}</h2>
            <p className="mt-4 text-stone-600">{t('landing_pricing_subheading')}</p>
          </div>

          <p className="mt-2 max-w-3xl text-sm text-stone-500">
            {isSouthAfricanMarket
              ? 'South African pricing is shown in ZAR.'
              : <>Prices are fixed in {regionalPricing.currency} for your selected market. Payment is processed in South African rand (ZAR), so the ZAR amount may vary with exchange rates.</>}
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricingPlans.map((plan) => (
              <div key={plan.nameKey} className={`relative rounded-3xl bg-white p-7 shadow-sm border ${plan.isPopular ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-stone-200'}`}>
                {plan.isPopular && (
                  <span className="absolute -top-3 left-6 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-stone-950">{t('landing_plan_most_popular')}</span>
                )}
                <h3 className="text-2xl font-bold">{t(plan.nameKey)}</h3>
                <p className="text-sm text-stone-500 mt-1">{t('landing_plan_up_to_rooms', { count: plan.maxRooms })}</p>
                <div className="mt-6">
                  <span className="text-4xl font-black text-stone-900">{regionalPricing.currency === 'ZAR' ? 'R' : regionalPricing.currency === 'EUR' ? '€' : '$'}{plan.priceMonthly}</span>
                  <span className="text-stone-500"> {t('landing_plan_per_month')}</span>
                </div>
                <p className="text-sm text-stone-500 mt-1">{t('landing_plan_or_year')} <strong className="text-stone-800">{regionalPricing.currency === 'ZAR' ? 'R' : regionalPricing.currency === 'EUR' ? '€' : '$'}{plan.priceYearly}</strong>{t('landing_plan_per_year')}</p>
                <ul className="mt-7 space-y-3 min-h-[150px]">
                  {plan.featureKeys.map((featureKey) => (
                    <li key={featureKey} className="flex gap-2 text-sm text-stone-600">
                      <Check className="h-5 w-5 text-amber-600 flex-shrink-0" />
                      <span>{t(featureKey)}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate('/register')} className={`w-full rounded-xl py-3 font-bold transition ${plan.isPopular ? 'bg-amber-500 text-stone-950 hover:bg-amber-400' : 'bg-stone-900 text-white hover:bg-stone-800'}`}>
                  {t('landing_plan_start_trial')}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <button onClick={() => setDownloadDocument('brochure')} className="rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-bold text-stone-900 hover:border-amber-500 hover:text-amber-700 transition">
              {t('landing_download_brochure')}
            </button>
          </div>

          <div className="mt-8 rounded-3xl bg-stone-950 p-8 text-center text-white">
            <h3 className="text-2xl font-bold">{t('landing_enterprise_title')}</h3>
            <p className="text-amber-400 font-semibold mt-2">{t('landing_enterprise_pricing')}</p>
            <p className="text-stone-400 max-w-2xl mx-auto mt-3">{t('landing_enterprise_f1')}</p>
            <button onClick={() => setEnterpriseInquiryOpen(true)} className="mt-6 rounded-full border border-amber-500 px-7 py-3 text-amber-400 font-semibold hover:bg-amber-500/10 transition">
              {t('landing_contact_us')}
            </button>
          </div>
        </div>
      </section>

      {/* Enquiry */}
      <section className="bg-white py-24 text-stone-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-amber-600 uppercase tracking-[0.22em] text-sm font-bold">{t('landing_enquiry_eyebrow')}</p>
            <h2 className="mt-4 text-4xl md:text-5xl font-bold">{t('landing_enquiry_heading')}</h2>
            <p className="mt-5 text-lg text-stone-600">{t('landing_enquiry_body')}</p>
          </div>
          <form onSubmit={submitInquiry} className="rounded-3xl border border-stone-200 bg-stone-50 p-6 md:p-8">
            <div className="grid gap-5 md:grid-cols-2">
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_full_name')}</span><input name="fullName" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_company')}</span><input name="companyName" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_email')}</span><input name="email" type="email" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_telephone')}</span><input name="telephone" type="tel" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_address')}</span><input name="address" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_topic')}</span><select name="topic" required defaultValue="" className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3"><option value="" disabled>{t('landing_form_select_option')}</option><option value="General enquiry">{t('landing_form_topic_general')}</option><option value="Request a demonstration">{t('landing_form_topic_demo')}</option><option value="Pricing and plans">{t('landing_form_topic_pricing')}</option><option value="Digital check-in and guest experience">{t('landing_form_topic_digital')}</option><option value="Guest management and compliance">{t('landing_form_topic_guest')}</option><option value="Housekeeping and hotel operations">{t('landing_form_topic_housekeeping')}</option><option value="Analytics and Visitor Origin Explorer">{t('landing_form_topic_analytics')}</option><option value="Business Snapshot and reporting">{t('landing_form_topic_snapshot')}</option><option value="Multi-property / Enterprise">{t('landing_form_topic_multi')}</option><option value="Payments and card tokenization">{t('landing_form_topic_payments')}</option><option value="Partnership or integration">{t('landing_form_topic_partnership')}</option></select></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_comments')}</span><textarea name="comments" rows={5} required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" placeholder={t('landing_form_comments_placeholder')} /></label>
            </div>
            <TurnstileWidget action="homepage-enquiry" onToken={setInquiryTurnstileToken} resetKey={inquiryTurnstileResetKey} />
            {inquiryMessage && <p className="mt-5 rounded-xl bg-white px-4 py-3 text-sm text-stone-700 border border-stone-200">{inquiryMessage}</p>}
            <button disabled={inquiryBusy} type="submit" className="mt-6 rounded-xl bg-stone-950 px-7 py-3.5 font-bold text-amber-400 hover:bg-stone-800 disabled:opacity-60">{inquiryBusy ? t('landing_form_sending') : t('landing_form_send')}</button>
            <p className="mt-4 text-xs text-stone-500">{t('landing_form_privacy_note')}</p>
          </form>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-amber-500 py-24 text-stone-950">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_#fff_0,_transparent_45%)]" />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <p className="uppercase tracking-[0.22em] text-xs font-black">{t('landing_final_eyebrow')}</p>
          <h2 className="mt-4 text-4xl md:text-5xl font-black">{t('landing_final_heading')}</h2>
          <p className="mt-5 text-lg text-stone-800 max-w-2xl mx-auto">{t('landing_final_body')}</p>
          <button onClick={() => navigate('/register')} className="mt-8 rounded-full bg-stone-950 px-9 py-4 font-bold text-amber-400 hover:bg-stone-800 transition shadow-xl">
            {t('landing_cta_get_started')}
          </button>
          <p className="mt-4 text-sm text-stone-700">{t('landing_cta_trial_note')}</p>
          <button onClick={() => setDownloadDocument('brochure')} className="mt-7 rounded-full border border-stone-900/30 px-7 py-3 font-bold text-stone-950 hover:bg-white/20 transition">
            {t('landing_download_brochure')}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-950 text-stone-400 py-12 border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <img src="/fastcheckin-logo.png" alt={t('landing_logo_alt')} className="h-12 w-auto object-contain mb-3" />
              <p className="text-sm">{t('landing_footer_tagline')}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-x-7 gap-y-3 text-sm">
              <button onClick={() => scrollTo('platform-section')} className="hover:text-white transition">{t('landing_redesign_platform_link')}</button>
              <button onClick={() => scrollTo('pricing-section')} className="hover:text-white transition">{t('landing_redesign_pricing_link')}</button>
              <button onClick={() => setLegalDocument('privacy')} className="hover:text-white transition">{t('landing_footer_privacy_terms')}</button>
              <button onClick={() => navigate('/super-admin-login')} className="hover:text-white transition">{t('landing_footer_super_admin')}</button>
            </div>
          </div>
          <div className="text-center text-xs mt-8 pt-8 border-t border-stone-800">
            {t('landing_footer_copyright', { year: new Date().getFullYear() })}
          </div>
        </div>
      </footer>
      <GlobalMarketSelector />
      <HomepageLeadModal document={downloadDocument} onClose={() => setDownloadDocument(null)} onDownloaded={() => setDownloadDocument(null)} onOpenLegal={(document) => { setDownloadDocument(null); setLegalDocument(document); }} />
      <HomepageLegalModal document={legalDocument} onClose={() => setLegalDocument(null)} />
      <EnterpriseInquiryModal open={enterpriseInquiryOpen} onClose={() => setEnterpriseInquiryOpen(false)} />
    </div>
  );
}
}{plan.priceMonthly}</span>
                  <span className="text-stone-500"> {t('landing_plan_per_month')}</span>
                </div>
                <p className="text-sm text-stone-500 mt-1">{t('landing_plan_or_year')} <strong className="text-stone-800">R{plan.priceYearly}</strong>{t('landing_plan_per_year')}</p>
                <ul className="mt-7 space-y-3 min-h-[150px]">
                  {plan.featureKeys.map((featureKey) => (
                    <li key={featureKey} className="flex gap-2 text-sm text-stone-600">
                      <Check className="h-5 w-5 text-amber-600 flex-shrink-0" />
                      <span>{t(featureKey)}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate('/register')} className={`w-full rounded-xl py-3 font-bold transition ${plan.isPopular ? 'bg-amber-500 text-stone-950 hover:bg-amber-400' : 'bg-stone-900 text-white hover:bg-stone-800'}`}>
                  {t('landing_plan_start_trial')}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <button onClick={() => setDownloadDocument('brochure')} className="rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-bold text-stone-900 hover:border-amber-500 hover:text-amber-700 transition">
              {t('landing_download_brochure')}
            </button>
          </div>

          <div className="mt-8 rounded-3xl bg-stone-950 p-8 text-center text-white">
            <h3 className="text-2xl font-bold">{t('landing_enterprise_title')}</h3>
            <p className="text-amber-400 font-semibold mt-2">{t('landing_enterprise_pricing')}</p>
            <p className="text-stone-400 max-w-2xl mx-auto mt-3">{t('landing_enterprise_f1')}</p>
            <button onClick={() => setEnterpriseInquiryOpen(true)} className="mt-6 rounded-full border border-amber-500 px-7 py-3 text-amber-400 font-semibold hover:bg-amber-500/10 transition">
              {t('landing_contact_us')}
            </button>
          </div>
        </div>
      </section>

      {/* Enquiry */}
      <section className="bg-white py-24 text-stone-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-amber-600 uppercase tracking-[0.22em] text-sm font-bold">{t('landing_enquiry_eyebrow')}</p>
            <h2 className="mt-4 text-4xl md:text-5xl font-bold">{t('landing_enquiry_heading')}</h2>
            <p className="mt-5 text-lg text-stone-600">{t('landing_enquiry_body')}</p>
          </div>
          <form onSubmit={submitInquiry} className="rounded-3xl border border-stone-200 bg-stone-50 p-6 md:p-8">
            <div className="grid gap-5 md:grid-cols-2">
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_full_name')}</span><input name="fullName" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_company')}</span><input name="companyName" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_email')}</span><input name="email" type="email" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_telephone')}</span><input name="telephone" type="tel" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_address')}</span><input name="address" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_topic')}</span><select name="topic" required defaultValue="" className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3"><option value="" disabled>{t('landing_form_select_option')}</option><option value="General enquiry">{t('landing_form_topic_general')}</option><option value="Request a demonstration">{t('landing_form_topic_demo')}</option><option value="Pricing and plans">{t('landing_form_topic_pricing')}</option><option value="Digital check-in and guest experience">{t('landing_form_topic_digital')}</option><option value="Guest management and compliance">{t('landing_form_topic_guest')}</option><option value="Housekeeping and hotel operations">{t('landing_form_topic_housekeeping')}</option><option value="Analytics and Visitor Origin Explorer">{t('landing_form_topic_analytics')}</option><option value="Business Snapshot and reporting">{t('landing_form_topic_snapshot')}</option><option value="Multi-property / Enterprise">{t('landing_form_topic_multi')}</option><option value="Payments and card tokenization">{t('landing_form_topic_payments')}</option><option value="Partnership or integration">{t('landing_form_topic_partnership')}</option></select></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_comments')}</span><textarea name="comments" rows={5} required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" placeholder={t('landing_form_comments_placeholder')} /></label>
            </div>
            <TurnstileWidget action="homepage-enquiry" onToken={setInquiryTurnstileToken} resetKey={inquiryTurnstileResetKey} />
            {inquiryMessage && <p className="mt-5 rounded-xl bg-white px-4 py-3 text-sm text-stone-700 border border-stone-200">{inquiryMessage}</p>}
            <button disabled={inquiryBusy} type="submit" className="mt-6 rounded-xl bg-stone-950 px-7 py-3.5 font-bold text-amber-400 hover:bg-stone-800 disabled:opacity-60">{inquiryBusy ? t('landing_form_sending') : t('landing_form_send')}</button>
            <p className="mt-4 text-xs text-stone-500">{t('landing_form_privacy_note')}</p>
          </form>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-amber-500 py-24 text-stone-950">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_#fff_0,_transparent_45%)]" />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <p className="uppercase tracking-[0.22em] text-xs font-black">{t('landing_final_eyebrow')}</p>
          <h2 className="mt-4 text-4xl md:text-5xl font-black">{t('landing_final_heading')}</h2>
          <p className="mt-5 text-lg text-stone-800 max-w-2xl mx-auto">{t('landing_final_body')}</p>
          <button onClick={() => navigate('/register')} className="mt-8 rounded-full bg-stone-950 px-9 py-4 font-bold text-amber-400 hover:bg-stone-800 transition shadow-xl">
            {t('landing_cta_get_started')}
          </button>
          <p className="mt-4 text-sm text-stone-700">{t('landing_cta_trial_note')}</p>
          <button onClick={() => setDownloadDocument('brochure')} className="mt-7 rounded-full border border-stone-900/30 px-7 py-3 font-bold text-stone-950 hover:bg-white/20 transition">
            {t('landing_download_brochure')}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-950 text-stone-400 py-12 border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <img src="/fastcheckin-logo.png" alt={t('landing_logo_alt')} className="h-12 w-auto object-contain mb-3" />
              <p className="text-sm">{t('landing_footer_tagline')}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-x-7 gap-y-3 text-sm">
              <button onClick={() => scrollTo('platform-section')} className="hover:text-white transition">{t('landing_redesign_platform_link')}</button>
              <button onClick={() => scrollTo('pricing-section')} className="hover:text-white transition">{t('landing_redesign_pricing_link')}</button>
              <button onClick={() => setLegalDocument('privacy')} className="hover:text-white transition">{t('landing_footer_privacy_terms')}</button>
              <button onClick={() => navigate('/super-admin-login')} className="hover:text-white transition">{t('landing_footer_super_admin')}</button>
            </div>
          </div>
          <div className="text-center text-xs mt-8 pt-8 border-t border-stone-800">
            {t('landing_footer_copyright', { year: new Date().getFullYear() })}
          </div>
        </div>
      </footer>
      <GlobalMarketSelector />
      <HomepageLeadModal document={downloadDocument} onClose={() => setDownloadDocument(null)} onDownloaded={() => setDownloadDocument(null)} onOpenLegal={(document) => { setDownloadDocument(null); setLegalDocument(document); }} />
      <HomepageLegalModal document={legalDocument} onClose={() => setLegalDocument(null)} />
      <EnterpriseInquiryModal open={enterpriseInquiryOpen} onClose={() => setEnterpriseInquiryOpen(false)} />
    </div>
  );
}
}{plan.priceYearly}</strong>{t('landing_plan_per_year')}</p>
                <ul className="mt-7 space-y-3 min-h-[150px]">
                  {plan.featureKeys.map((featureKey) => (
                    <li key={featureKey} className="flex gap-2 text-sm text-stone-600">
                      <Check className="h-5 w-5 text-amber-600 flex-shrink-0" />
                      <span>{t(featureKey)}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate('/register')} className={`w-full rounded-xl py-3 font-bold transition ${plan.isPopular ? 'bg-amber-500 text-stone-950 hover:bg-amber-400' : 'bg-stone-900 text-white hover:bg-stone-800'}`}>
                  {t('landing_plan_start_trial')}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <button onClick={() => setDownloadDocument('brochure')} className="rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-bold text-stone-900 hover:border-amber-500 hover:text-amber-700 transition">
              {t('landing_download_brochure')}
            </button>
          </div>

          <div className="mt-8 rounded-3xl bg-stone-950 p-8 text-center text-white">
            <h3 className="text-2xl font-bold">{t('landing_enterprise_title')}</h3>
            <p className="text-amber-400 font-semibold mt-2">{t('landing_enterprise_pricing')}</p>
            <p className="text-stone-400 max-w-2xl mx-auto mt-3">{t('landing_enterprise_f1')}</p>
            <button onClick={() => setEnterpriseInquiryOpen(true)} className="mt-6 rounded-full border border-amber-500 px-7 py-3 text-amber-400 font-semibold hover:bg-amber-500/10 transition">
              {t('landing_contact_us')}
            </button>
          </div>
        </div>
      </section>

      {/* Enquiry */}
      <section className="bg-white py-24 text-stone-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-amber-600 uppercase tracking-[0.22em] text-sm font-bold">{t('landing_enquiry_eyebrow')}</p>
            <h2 className="mt-4 text-4xl md:text-5xl font-bold">{t('landing_enquiry_heading')}</h2>
            <p className="mt-5 text-lg text-stone-600">{t('landing_enquiry_body')}</p>
          </div>
          <form onSubmit={submitInquiry} className="rounded-3xl border border-stone-200 bg-stone-50 p-6 md:p-8">
            <div className="grid gap-5 md:grid-cols-2">
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_full_name')}</span><input name="fullName" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_company')}</span><input name="companyName" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_email')}</span><input name="email" type="email" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_telephone')}</span><input name="telephone" type="tel" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_address')}</span><input name="address" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_topic')}</span><select name="topic" required defaultValue="" className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3"><option value="" disabled>{t('landing_form_select_option')}</option><option value="General enquiry">{t('landing_form_topic_general')}</option><option value="Request a demonstration">{t('landing_form_topic_demo')}</option><option value="Pricing and plans">{t('landing_form_topic_pricing')}</option><option value="Digital check-in and guest experience">{t('landing_form_topic_digital')}</option><option value="Guest management and compliance">{t('landing_form_topic_guest')}</option><option value="Housekeeping and hotel operations">{t('landing_form_topic_housekeeping')}</option><option value="Analytics and Visitor Origin Explorer">{t('landing_form_topic_analytics')}</option><option value="Business Snapshot and reporting">{t('landing_form_topic_snapshot')}</option><option value="Multi-property / Enterprise">{t('landing_form_topic_multi')}</option><option value="Payments and card tokenization">{t('landing_form_topic_payments')}</option><option value="Partnership or integration">{t('landing_form_topic_partnership')}</option></select></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_comments')}</span><textarea name="comments" rows={5} required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" placeholder={t('landing_form_comments_placeholder')} /></label>
            </div>
            <TurnstileWidget action="homepage-enquiry" onToken={setInquiryTurnstileToken} resetKey={inquiryTurnstileResetKey} />
            {inquiryMessage && <p className="mt-5 rounded-xl bg-white px-4 py-3 text-sm text-stone-700 border border-stone-200">{inquiryMessage}</p>}
            <button disabled={inquiryBusy} type="submit" className="mt-6 rounded-xl bg-stone-950 px-7 py-3.5 font-bold text-amber-400 hover:bg-stone-800 disabled:opacity-60">{inquiryBusy ? t('landing_form_sending') : t('landing_form_send')}</button>
            <p className="mt-4 text-xs text-stone-500">{t('landing_form_privacy_note')}</p>
          </form>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-amber-500 py-24 text-stone-950">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_#fff_0,_transparent_45%)]" />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <p className="uppercase tracking-[0.22em] text-xs font-black">{t('landing_final_eyebrow')}</p>
          <h2 className="mt-4 text-4xl md:text-5xl font-black">{t('landing_final_heading')}</h2>
          <p className="mt-5 text-lg text-stone-800 max-w-2xl mx-auto">{t('landing_final_body')}</p>
          <button onClick={() => navigate('/register')} className="mt-8 rounded-full bg-stone-950 px-9 py-4 font-bold text-amber-400 hover:bg-stone-800 transition shadow-xl">
            {t('landing_cta_get_started')}
          </button>
          <p className="mt-4 text-sm text-stone-700">{t('landing_cta_trial_note')}</p>
          <button onClick={() => setDownloadDocument('brochure')} className="mt-7 rounded-full border border-stone-900/30 px-7 py-3 font-bold text-stone-950 hover:bg-white/20 transition">
            {t('landing_download_brochure')}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-950 text-stone-400 py-12 border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <img src="/fastcheckin-logo.png" alt={t('landing_logo_alt')} className="h-12 w-auto object-contain mb-3" />
              <p className="text-sm">{t('landing_footer_tagline')}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-x-7 gap-y-3 text-sm">
              <button onClick={() => scrollTo('platform-section')} className="hover:text-white transition">{t('landing_redesign_platform_link')}</button>
              <button onClick={() => scrollTo('pricing-section')} className="hover:text-white transition">{t('landing_redesign_pricing_link')}</button>
              <button onClick={() => setLegalDocument('privacy')} className="hover:text-white transition">{t('landing_footer_privacy_terms')}</button>
              <button onClick={() => navigate('/super-admin-login')} className="hover:text-white transition">{t('landing_footer_super_admin')}</button>
            </div>
          </div>
          <div className="text-center text-xs mt-8 pt-8 border-t border-stone-800">
            {t('landing_footer_copyright', { year: new Date().getFullYear() })}
          </div>
        </div>
      </footer>
      <GlobalMarketSelector />
      <HomepageLeadModal document={downloadDocument} onClose={() => setDownloadDocument(null)} onDownloaded={() => setDownloadDocument(null)} onOpenLegal={(document) => { setDownloadDocument(null); setLegalDocument(document); }} />
      <HomepageLegalModal document={legalDocument} onClose={() => setLegalDocument(null)} />
      <EnterpriseInquiryModal open={enterpriseInquiryOpen} onClose={() => setEnterpriseInquiryOpen(false)} />
    </div>
  );
}
}{plan.priceMonthly}</span>
                  <span className="text-stone-500"> {t('landing_plan_per_month')}</span>
                </div>
                <p className="text-sm text-stone-500 mt-1">{t('landing_plan_or_year')} <strong className="text-stone-800">R{plan.priceYearly}</strong>{t('landing_plan_per_year')}</p>
                <ul className="mt-7 space-y-3 min-h-[150px]">
                  {plan.featureKeys.map((featureKey) => (
                    <li key={featureKey} className="flex gap-2 text-sm text-stone-600">
                      <Check className="h-5 w-5 text-amber-600 flex-shrink-0" />
                      <span>{t(featureKey)}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate('/register')} className={`w-full rounded-xl py-3 font-bold transition ${plan.isPopular ? 'bg-amber-500 text-stone-950 hover:bg-amber-400' : 'bg-stone-900 text-white hover:bg-stone-800'}`}>
                  {t('landing_plan_start_trial')}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <button onClick={() => setDownloadDocument('brochure')} className="rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-bold text-stone-900 hover:border-amber-500 hover:text-amber-700 transition">
              {t('landing_download_brochure')}
            </button>
          </div>

          <div className="mt-8 rounded-3xl bg-stone-950 p-8 text-center text-white">
            <h3 className="text-2xl font-bold">{t('landing_enterprise_title')}</h3>
            <p className="text-amber-400 font-semibold mt-2">{t('landing_enterprise_pricing')}</p>
            <p className="text-stone-400 max-w-2xl mx-auto mt-3">{t('landing_enterprise_f1')}</p>
            <button onClick={() => setEnterpriseInquiryOpen(true)} className="mt-6 rounded-full border border-amber-500 px-7 py-3 text-amber-400 font-semibold hover:bg-amber-500/10 transition">
              {t('landing_contact_us')}
            </button>
          </div>
        </div>
      </section>

      {/* Enquiry */}
      <section className="bg-white py-24 text-stone-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-amber-600 uppercase tracking-[0.22em] text-sm font-bold">{t('landing_enquiry_eyebrow')}</p>
            <h2 className="mt-4 text-4xl md:text-5xl font-bold">{t('landing_enquiry_heading')}</h2>
            <p className="mt-5 text-lg text-stone-600">{t('landing_enquiry_body')}</p>
          </div>
          <form onSubmit={submitInquiry} className="rounded-3xl border border-stone-200 bg-stone-50 p-6 md:p-8">
            <div className="grid gap-5 md:grid-cols-2">
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_full_name')}</span><input name="fullName" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_company')}</span><input name="companyName" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_email')}</span><input name="email" type="email" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_telephone')}</span><input name="telephone" type="tel" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_address')}</span><input name="address" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_topic')}</span><select name="topic" required defaultValue="" className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3"><option value="" disabled>{t('landing_form_select_option')}</option><option value="General enquiry">{t('landing_form_topic_general')}</option><option value="Request a demonstration">{t('landing_form_topic_demo')}</option><option value="Pricing and plans">{t('landing_form_topic_pricing')}</option><option value="Digital check-in and guest experience">{t('landing_form_topic_digital')}</option><option value="Guest management and compliance">{t('landing_form_topic_guest')}</option><option value="Housekeeping and hotel operations">{t('landing_form_topic_housekeeping')}</option><option value="Analytics and Visitor Origin Explorer">{t('landing_form_topic_analytics')}</option><option value="Business Snapshot and reporting">{t('landing_form_topic_snapshot')}</option><option value="Multi-property / Enterprise">{t('landing_form_topic_multi')}</option><option value="Payments and card tokenization">{t('landing_form_topic_payments')}</option><option value="Partnership or integration">{t('landing_form_topic_partnership')}</option></select></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_comments')}</span><textarea name="comments" rows={5} required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" placeholder={t('landing_form_comments_placeholder')} /></label>
            </div>
            <TurnstileWidget action="homepage-enquiry" onToken={setInquiryTurnstileToken} resetKey={inquiryTurnstileResetKey} />
            {inquiryMessage && <p className="mt-5 rounded-xl bg-white px-4 py-3 text-sm text-stone-700 border border-stone-200">{inquiryMessage}</p>}
            <button disabled={inquiryBusy} type="submit" className="mt-6 rounded-xl bg-stone-950 px-7 py-3.5 font-bold text-amber-400 hover:bg-stone-800 disabled:opacity-60">{inquiryBusy ? t('landing_form_sending') : t('landing_form_send')}</button>
            <p className="mt-4 text-xs text-stone-500">{t('landing_form_privacy_note')}</p>
          </form>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-amber-500 py-24 text-stone-950">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_#fff_0,_transparent_45%)]" />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <p className="uppercase tracking-[0.22em] text-xs font-black">{t('landing_final_eyebrow')}</p>
          <h2 className="mt-4 text-4xl md:text-5xl font-black">{t('landing_final_heading')}</h2>
          <p className="mt-5 text-lg text-stone-800 max-w-2xl mx-auto">{t('landing_final_body')}</p>
          <button onClick={() => navigate('/register')} className="mt-8 rounded-full bg-stone-950 px-9 py-4 font-bold text-amber-400 hover:bg-stone-800 transition shadow-xl">
            {t('landing_cta_get_started')}
          </button>
          <p className="mt-4 text-sm text-stone-700">{t('landing_cta_trial_note')}</p>
          <button onClick={() => setDownloadDocument('brochure')} className="mt-7 rounded-full border border-stone-900/30 px-7 py-3 font-bold text-stone-950 hover:bg-white/20 transition">
            {t('landing_download_brochure')}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-950 text-stone-400 py-12 border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <img src="/fastcheckin-logo.png" alt={t('landing_logo_alt')} className="h-12 w-auto object-contain mb-3" />
              <p className="text-sm">{t('landing_footer_tagline')}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-x-7 gap-y-3 text-sm">
              <button onClick={() => scrollTo('platform-section')} className="hover:text-white transition">{t('landing_redesign_platform_link')}</button>
              <button onClick={() => scrollTo('pricing-section')} className="hover:text-white transition">{t('landing_redesign_pricing_link')}</button>
              <button onClick={() => setLegalDocument('privacy')} className="hover:text-white transition">{t('landing_footer_privacy_terms')}</button>
              <button onClick={() => navigate('/super-admin-login')} className="hover:text-white transition">{t('landing_footer_super_admin')}</button>
            </div>
          </div>
          <div className="text-center text-xs mt-8 pt-8 border-t border-stone-800">
            {t('landing_footer_copyright', { year: new Date().getFullYear() })}
          </div>
        </div>
      </footer>
      <GlobalMarketSelector />
      <HomepageLeadModal document={downloadDocument} onClose={() => setDownloadDocument(null)} onDownloaded={() => setDownloadDocument(null)} onOpenLegal={(document) => { setDownloadDocument(null); setLegalDocument(document); }} />
      <HomepageLegalModal document={legalDocument} onClose={() => setLegalDocument(null)} />
      <EnterpriseInquiryModal open={enterpriseInquiryOpen} onClose={() => setEnterpriseInquiryOpen(false)} />
    </div>
  );
}
}{plan.priceMonthly}</span>
                  <span className="text-stone-500"> {t('landing_plan_per_month')}</span>
                </div>
                <p className="text-sm text-stone-500 mt-1">{t('landing_plan_or_year')} <strong className="text-stone-800">{regionalPricing.currency === 'ZAR' ? 'R' : regionalPricing.currency === 'EUR' ? '€' : '
                <ul className="mt-7 space-y-3 min-h-[150px]">
                  {plan.featureKeys.map((featureKey) => (
                    <li key={featureKey} className="flex gap-2 text-sm text-stone-600">
                      <Check className="h-5 w-5 text-amber-600 flex-shrink-0" />
                      <span>{t(featureKey)}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate('/register')} className={`w-full rounded-xl py-3 font-bold transition ${plan.isPopular ? 'bg-amber-500 text-stone-950 hover:bg-amber-400' : 'bg-stone-900 text-white hover:bg-stone-800'}`}>
                  {t('landing_plan_start_trial')}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <button onClick={() => setDownloadDocument('brochure')} className="rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-bold text-stone-900 hover:border-amber-500 hover:text-amber-700 transition">
              {t('landing_download_brochure')}
            </button>
          </div>

          <div className="mt-8 rounded-3xl bg-stone-950 p-8 text-center text-white">
            <h3 className="text-2xl font-bold">{t('landing_enterprise_title')}</h3>
            <p className="text-amber-400 font-semibold mt-2">{t('landing_enterprise_pricing')}</p>
            <p className="text-stone-400 max-w-2xl mx-auto mt-3">{t('landing_enterprise_f1')}</p>
            <button onClick={() => setEnterpriseInquiryOpen(true)} className="mt-6 rounded-full border border-amber-500 px-7 py-3 text-amber-400 font-semibold hover:bg-amber-500/10 transition">
              {t('landing_contact_us')}
            </button>
          </div>
        </div>
      </section>

      {/* Enquiry */}
      <section className="bg-white py-24 text-stone-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-amber-600 uppercase tracking-[0.22em] text-sm font-bold">{t('landing_enquiry_eyebrow')}</p>
            <h2 className="mt-4 text-4xl md:text-5xl font-bold">{t('landing_enquiry_heading')}</h2>
            <p className="mt-5 text-lg text-stone-600">{t('landing_enquiry_body')}</p>
          </div>
          <form onSubmit={submitInquiry} className="rounded-3xl border border-stone-200 bg-stone-50 p-6 md:p-8">
            <div className="grid gap-5 md:grid-cols-2">
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_full_name')}</span><input name="fullName" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_company')}</span><input name="companyName" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_email')}</span><input name="email" type="email" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_telephone')}</span><input name="telephone" type="tel" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_address')}</span><input name="address" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_topic')}</span><select name="topic" required defaultValue="" className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3"><option value="" disabled>{t('landing_form_select_option')}</option><option value="General enquiry">{t('landing_form_topic_general')}</option><option value="Request a demonstration">{t('landing_form_topic_demo')}</option><option value="Pricing and plans">{t('landing_form_topic_pricing')}</option><option value="Digital check-in and guest experience">{t('landing_form_topic_digital')}</option><option value="Guest management and compliance">{t('landing_form_topic_guest')}</option><option value="Housekeeping and hotel operations">{t('landing_form_topic_housekeeping')}</option><option value="Analytics and Visitor Origin Explorer">{t('landing_form_topic_analytics')}</option><option value="Business Snapshot and reporting">{t('landing_form_topic_snapshot')}</option><option value="Multi-property / Enterprise">{t('landing_form_topic_multi')}</option><option value="Payments and card tokenization">{t('landing_form_topic_payments')}</option><option value="Partnership or integration">{t('landing_form_topic_partnership')}</option></select></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_comments')}</span><textarea name="comments" rows={5} required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" placeholder={t('landing_form_comments_placeholder')} /></label>
            </div>
            <TurnstileWidget action="homepage-enquiry" onToken={setInquiryTurnstileToken} resetKey={inquiryTurnstileResetKey} />
            {inquiryMessage && <p className="mt-5 rounded-xl bg-white px-4 py-3 text-sm text-stone-700 border border-stone-200">{inquiryMessage}</p>}
            <button disabled={inquiryBusy} type="submit" className="mt-6 rounded-xl bg-stone-950 px-7 py-3.5 font-bold text-amber-400 hover:bg-stone-800 disabled:opacity-60">{inquiryBusy ? t('landing_form_sending') : t('landing_form_send')}</button>
            <p className="mt-4 text-xs text-stone-500">{t('landing_form_privacy_note')}</p>
          </form>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-amber-500 py-24 text-stone-950">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_#fff_0,_transparent_45%)]" />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <p className="uppercase tracking-[0.22em] text-xs font-black">{t('landing_final_eyebrow')}</p>
          <h2 className="mt-4 text-4xl md:text-5xl font-black">{t('landing_final_heading')}</h2>
          <p className="mt-5 text-lg text-stone-800 max-w-2xl mx-auto">{t('landing_final_body')}</p>
          <button onClick={() => navigate('/register')} className="mt-8 rounded-full bg-stone-950 px-9 py-4 font-bold text-amber-400 hover:bg-stone-800 transition shadow-xl">
            {t('landing_cta_get_started')}
          </button>
          <p className="mt-4 text-sm text-stone-700">{t('landing_cta_trial_note')}</p>
          <button onClick={() => setDownloadDocument('brochure')} className="mt-7 rounded-full border border-stone-900/30 px-7 py-3 font-bold text-stone-950 hover:bg-white/20 transition">
            {t('landing_download_brochure')}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-950 text-stone-400 py-12 border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <img src="/fastcheckin-logo.png" alt={t('landing_logo_alt')} className="h-12 w-auto object-contain mb-3" />
              <p className="text-sm">{t('landing_footer_tagline')}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-x-7 gap-y-3 text-sm">
              <button onClick={() => scrollTo('platform-section')} className="hover:text-white transition">{t('landing_redesign_platform_link')}</button>
              <button onClick={() => scrollTo('pricing-section')} className="hover:text-white transition">{t('landing_redesign_pricing_link')}</button>
              <button onClick={() => setLegalDocument('privacy')} className="hover:text-white transition">{t('landing_footer_privacy_terms')}</button>
              <button onClick={() => navigate('/super-admin-login')} className="hover:text-white transition">{t('landing_footer_super_admin')}</button>
            </div>
          </div>
          <div className="text-center text-xs mt-8 pt-8 border-t border-stone-800">
            {t('landing_footer_copyright', { year: new Date().getFullYear() })}
          </div>
        </div>
      </footer>
      <GlobalMarketSelector />
      <HomepageLeadModal document={downloadDocument} onClose={() => setDownloadDocument(null)} onDownloaded={() => setDownloadDocument(null)} onOpenLegal={(document) => { setDownloadDocument(null); setLegalDocument(document); }} />
      <HomepageLegalModal document={legalDocument} onClose={() => setLegalDocument(null)} />
      <EnterpriseInquiryModal open={enterpriseInquiryOpen} onClose={() => setEnterpriseInquiryOpen(false)} />
    </div>
  );
}
}{plan.priceMonthly}</span>
                  <span className="text-stone-500"> {t('landing_plan_per_month')}</span>
                </div>
                <p className="text-sm text-stone-500 mt-1">{t('landing_plan_or_year')} <strong className="text-stone-800">R{plan.priceYearly}</strong>{t('landing_plan_per_year')}</p>
                <ul className="mt-7 space-y-3 min-h-[150px]">
                  {plan.featureKeys.map((featureKey) => (
                    <li key={featureKey} className="flex gap-2 text-sm text-stone-600">
                      <Check className="h-5 w-5 text-amber-600 flex-shrink-0" />
                      <span>{t(featureKey)}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate('/register')} className={`w-full rounded-xl py-3 font-bold transition ${plan.isPopular ? 'bg-amber-500 text-stone-950 hover:bg-amber-400' : 'bg-stone-900 text-white hover:bg-stone-800'}`}>
                  {t('landing_plan_start_trial')}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <button onClick={() => setDownloadDocument('brochure')} className="rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-bold text-stone-900 hover:border-amber-500 hover:text-amber-700 transition">
              {t('landing_download_brochure')}
            </button>
          </div>

          <div className="mt-8 rounded-3xl bg-stone-950 p-8 text-center text-white">
            <h3 className="text-2xl font-bold">{t('landing_enterprise_title')}</h3>
            <p className="text-amber-400 font-semibold mt-2">{t('landing_enterprise_pricing')}</p>
            <p className="text-stone-400 max-w-2xl mx-auto mt-3">{t('landing_enterprise_f1')}</p>
            <button onClick={() => setEnterpriseInquiryOpen(true)} className="mt-6 rounded-full border border-amber-500 px-7 py-3 text-amber-400 font-semibold hover:bg-amber-500/10 transition">
              {t('landing_contact_us')}
            </button>
          </div>
        </div>
      </section>

      {/* Enquiry */}
      <section className="bg-white py-24 text-stone-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-amber-600 uppercase tracking-[0.22em] text-sm font-bold">{t('landing_enquiry_eyebrow')}</p>
            <h2 className="mt-4 text-4xl md:text-5xl font-bold">{t('landing_enquiry_heading')}</h2>
            <p className="mt-5 text-lg text-stone-600">{t('landing_enquiry_body')}</p>
          </div>
          <form onSubmit={submitInquiry} className="rounded-3xl border border-stone-200 bg-stone-50 p-6 md:p-8">
            <div className="grid gap-5 md:grid-cols-2">
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_full_name')}</span><input name="fullName" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_company')}</span><input name="companyName" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_email')}</span><input name="email" type="email" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_telephone')}</span><input name="telephone" type="tel" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_address')}</span><input name="address" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_topic')}</span><select name="topic" required defaultValue="" className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3"><option value="" disabled>{t('landing_form_select_option')}</option><option value="General enquiry">{t('landing_form_topic_general')}</option><option value="Request a demonstration">{t('landing_form_topic_demo')}</option><option value="Pricing and plans">{t('landing_form_topic_pricing')}</option><option value="Digital check-in and guest experience">{t('landing_form_topic_digital')}</option><option value="Guest management and compliance">{t('landing_form_topic_guest')}</option><option value="Housekeeping and hotel operations">{t('landing_form_topic_housekeeping')}</option><option value="Analytics and Visitor Origin Explorer">{t('landing_form_topic_analytics')}</option><option value="Business Snapshot and reporting">{t('landing_form_topic_snapshot')}</option><option value="Multi-property / Enterprise">{t('landing_form_topic_multi')}</option><option value="Payments and card tokenization">{t('landing_form_topic_payments')}</option><option value="Partnership or integration">{t('landing_form_topic_partnership')}</option></select></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_comments')}</span><textarea name="comments" rows={5} required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" placeholder={t('landing_form_comments_placeholder')} /></label>
            </div>
            <TurnstileWidget action="homepage-enquiry" onToken={setInquiryTurnstileToken} resetKey={inquiryTurnstileResetKey} />
            {inquiryMessage && <p className="mt-5 rounded-xl bg-white px-4 py-3 text-sm text-stone-700 border border-stone-200">{inquiryMessage}</p>}
            <button disabled={inquiryBusy} type="submit" className="mt-6 rounded-xl bg-stone-950 px-7 py-3.5 font-bold text-amber-400 hover:bg-stone-800 disabled:opacity-60">{inquiryBusy ? t('landing_form_sending') : t('landing_form_send')}</button>
            <p className="mt-4 text-xs text-stone-500">{t('landing_form_privacy_note')}</p>
          </form>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-amber-500 py-24 text-stone-950">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_#fff_0,_transparent_45%)]" />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <p className="uppercase tracking-[0.22em] text-xs font-black">{t('landing_final_eyebrow')}</p>
          <h2 className="mt-4 text-4xl md:text-5xl font-black">{t('landing_final_heading')}</h2>
          <p className="mt-5 text-lg text-stone-800 max-w-2xl mx-auto">{t('landing_final_body')}</p>
          <button onClick={() => navigate('/register')} className="mt-8 rounded-full bg-stone-950 px-9 py-4 font-bold text-amber-400 hover:bg-stone-800 transition shadow-xl">
            {t('landing_cta_get_started')}
          </button>
          <p className="mt-4 text-sm text-stone-700">{t('landing_cta_trial_note')}</p>
          <button onClick={() => setDownloadDocument('brochure')} className="mt-7 rounded-full border border-stone-900/30 px-7 py-3 font-bold text-stone-950 hover:bg-white/20 transition">
            {t('landing_download_brochure')}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-950 text-stone-400 py-12 border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <img src="/fastcheckin-logo.png" alt={t('landing_logo_alt')} className="h-12 w-auto object-contain mb-3" />
              <p className="text-sm">{t('landing_footer_tagline')}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-x-7 gap-y-3 text-sm">
              <button onClick={() => scrollTo('platform-section')} className="hover:text-white transition">{t('landing_redesign_platform_link')}</button>
              <button onClick={() => scrollTo('pricing-section')} className="hover:text-white transition">{t('landing_redesign_pricing_link')}</button>
              <button onClick={() => setLegalDocument('privacy')} className="hover:text-white transition">{t('landing_footer_privacy_terms')}</button>
              <button onClick={() => navigate('/super-admin-login')} className="hover:text-white transition">{t('landing_footer_super_admin')}</button>
            </div>
          </div>
          <div className="text-center text-xs mt-8 pt-8 border-t border-stone-800">
            {t('landing_footer_copyright', { year: new Date().getFullYear() })}
          </div>
        </div>
      </footer>
      <GlobalMarketSelector />
      <HomepageLeadModal document={downloadDocument} onClose={() => setDownloadDocument(null)} onDownloaded={() => setDownloadDocument(null)} onOpenLegal={(document) => { setDownloadDocument(null); setLegalDocument(document); }} />
      <HomepageLegalModal document={legalDocument} onClose={() => setLegalDocument(null)} />
      <EnterpriseInquiryModal open={enterpriseInquiryOpen} onClose={() => setEnterpriseInquiryOpen(false)} />
    </div>
  );
}
}{plan.priceYearly}</strong>{t('landing_plan_per_year')}</p>
                <ul className="mt-7 space-y-3 min-h-[150px]">
                  {plan.featureKeys.map((featureKey) => (
                    <li key={featureKey} className="flex gap-2 text-sm text-stone-600">
                      <Check className="h-5 w-5 text-amber-600 flex-shrink-0" />
                      <span>{t(featureKey)}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate('/register')} className={`w-full rounded-xl py-3 font-bold transition ${plan.isPopular ? 'bg-amber-500 text-stone-950 hover:bg-amber-400' : 'bg-stone-900 text-white hover:bg-stone-800'}`}>
                  {t('landing_plan_start_trial')}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <button onClick={() => setDownloadDocument('brochure')} className="rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-bold text-stone-900 hover:border-amber-500 hover:text-amber-700 transition">
              {t('landing_download_brochure')}
            </button>
          </div>

          <div className="mt-8 rounded-3xl bg-stone-950 p-8 text-center text-white">
            <h3 className="text-2xl font-bold">{t('landing_enterprise_title')}</h3>
            <p className="text-amber-400 font-semibold mt-2">{t('landing_enterprise_pricing')}</p>
            <p className="text-stone-400 max-w-2xl mx-auto mt-3">{t('landing_enterprise_f1')}</p>
            <button onClick={() => setEnterpriseInquiryOpen(true)} className="mt-6 rounded-full border border-amber-500 px-7 py-3 text-amber-400 font-semibold hover:bg-amber-500/10 transition">
              {t('landing_contact_us')}
            </button>
          </div>
        </div>
      </section>

      {/* Enquiry */}
      <section className="bg-white py-24 text-stone-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-amber-600 uppercase tracking-[0.22em] text-sm font-bold">{t('landing_enquiry_eyebrow')}</p>
            <h2 className="mt-4 text-4xl md:text-5xl font-bold">{t('landing_enquiry_heading')}</h2>
            <p className="mt-5 text-lg text-stone-600">{t('landing_enquiry_body')}</p>
          </div>
          <form onSubmit={submitInquiry} className="rounded-3xl border border-stone-200 bg-stone-50 p-6 md:p-8">
            <div className="grid gap-5 md:grid-cols-2">
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_full_name')}</span><input name="fullName" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_company')}</span><input name="companyName" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_email')}</span><input name="email" type="email" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_telephone')}</span><input name="telephone" type="tel" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_address')}</span><input name="address" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_topic')}</span><select name="topic" required defaultValue="" className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3"><option value="" disabled>{t('landing_form_select_option')}</option><option value="General enquiry">{t('landing_form_topic_general')}</option><option value="Request a demonstration">{t('landing_form_topic_demo')}</option><option value="Pricing and plans">{t('landing_form_topic_pricing')}</option><option value="Digital check-in and guest experience">{t('landing_form_topic_digital')}</option><option value="Guest management and compliance">{t('landing_form_topic_guest')}</option><option value="Housekeeping and hotel operations">{t('landing_form_topic_housekeeping')}</option><option value="Analytics and Visitor Origin Explorer">{t('landing_form_topic_analytics')}</option><option value="Business Snapshot and reporting">{t('landing_form_topic_snapshot')}</option><option value="Multi-property / Enterprise">{t('landing_form_topic_multi')}</option><option value="Payments and card tokenization">{t('landing_form_topic_payments')}</option><option value="Partnership or integration">{t('landing_form_topic_partnership')}</option></select></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_comments')}</span><textarea name="comments" rows={5} required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" placeholder={t('landing_form_comments_placeholder')} /></label>
            </div>
            <TurnstileWidget action="homepage-enquiry" onToken={setInquiryTurnstileToken} resetKey={inquiryTurnstileResetKey} />
            {inquiryMessage && <p className="mt-5 rounded-xl bg-white px-4 py-3 text-sm text-stone-700 border border-stone-200">{inquiryMessage}</p>}
            <button disabled={inquiryBusy} type="submit" className="mt-6 rounded-xl bg-stone-950 px-7 py-3.5 font-bold text-amber-400 hover:bg-stone-800 disabled:opacity-60">{inquiryBusy ? t('landing_form_sending') : t('landing_form_send')}</button>
            <p className="mt-4 text-xs text-stone-500">{t('landing_form_privacy_note')}</p>
          </form>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-amber-500 py-24 text-stone-950">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_#fff_0,_transparent_45%)]" />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <p className="uppercase tracking-[0.22em] text-xs font-black">{t('landing_final_eyebrow')}</p>
          <h2 className="mt-4 text-4xl md:text-5xl font-black">{t('landing_final_heading')}</h2>
          <p className="mt-5 text-lg text-stone-800 max-w-2xl mx-auto">{t('landing_final_body')}</p>
          <button onClick={() => navigate('/register')} className="mt-8 rounded-full bg-stone-950 px-9 py-4 font-bold text-amber-400 hover:bg-stone-800 transition shadow-xl">
            {t('landing_cta_get_started')}
          </button>
          <p className="mt-4 text-sm text-stone-700">{t('landing_cta_trial_note')}</p>
          <button onClick={() => setDownloadDocument('brochure')} className="mt-7 rounded-full border border-stone-900/30 px-7 py-3 font-bold text-stone-950 hover:bg-white/20 transition">
            {t('landing_download_brochure')}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-950 text-stone-400 py-12 border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <img src="/fastcheckin-logo.png" alt={t('landing_logo_alt')} className="h-12 w-auto object-contain mb-3" />
              <p className="text-sm">{t('landing_footer_tagline')}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-x-7 gap-y-3 text-sm">
              <button onClick={() => scrollTo('platform-section')} className="hover:text-white transition">{t('landing_redesign_platform_link')}</button>
              <button onClick={() => scrollTo('pricing-section')} className="hover:text-white transition">{t('landing_redesign_pricing_link')}</button>
              <button onClick={() => setLegalDocument('privacy')} className="hover:text-white transition">{t('landing_footer_privacy_terms')}</button>
              <button onClick={() => navigate('/super-admin-login')} className="hover:text-white transition">{t('landing_footer_super_admin')}</button>
            </div>
          </div>
          <div className="text-center text-xs mt-8 pt-8 border-t border-stone-800">
            {t('landing_footer_copyright', { year: new Date().getFullYear() })}
          </div>
        </div>
      </footer>
      <GlobalMarketSelector />
      <HomepageLeadModal document={downloadDocument} onClose={() => setDownloadDocument(null)} onDownloaded={() => setDownloadDocument(null)} onOpenLegal={(document) => { setDownloadDocument(null); setLegalDocument(document); }} />
      <HomepageLegalModal document={legalDocument} onClose={() => setLegalDocument(null)} />
      <EnterpriseInquiryModal open={enterpriseInquiryOpen} onClose={() => setEnterpriseInquiryOpen(false)} />
    </div>
  );
}
}{plan.priceMonthly}</span>
                  <span className="text-stone-500"> {t('landing_plan_per_month')}</span>
                </div>
                <p className="text-sm text-stone-500 mt-1">{t('landing_plan_or_year')} <strong className="text-stone-800">R{plan.priceYearly}</strong>{t('landing_plan_per_year')}</p>
                <ul className="mt-7 space-y-3 min-h-[150px]">
                  {plan.featureKeys.map((featureKey) => (
                    <li key={featureKey} className="flex gap-2 text-sm text-stone-600">
                      <Check className="h-5 w-5 text-amber-600 flex-shrink-0" />
                      <span>{t(featureKey)}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate('/register')} className={`w-full rounded-xl py-3 font-bold transition ${plan.isPopular ? 'bg-amber-500 text-stone-950 hover:bg-amber-400' : 'bg-stone-900 text-white hover:bg-stone-800'}`}>
                  {t('landing_plan_start_trial')}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <button onClick={() => setDownloadDocument('brochure')} className="rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-bold text-stone-900 hover:border-amber-500 hover:text-amber-700 transition">
              {t('landing_download_brochure')}
            </button>
          </div>

          <div className="mt-8 rounded-3xl bg-stone-950 p-8 text-center text-white">
            <h3 className="text-2xl font-bold">{t('landing_enterprise_title')}</h3>
            <p className="text-amber-400 font-semibold mt-2">{t('landing_enterprise_pricing')}</p>
            <p className="text-stone-400 max-w-2xl mx-auto mt-3">{t('landing_enterprise_f1')}</p>
            <button onClick={() => setEnterpriseInquiryOpen(true)} className="mt-6 rounded-full border border-amber-500 px-7 py-3 text-amber-400 font-semibold hover:bg-amber-500/10 transition">
              {t('landing_contact_us')}
            </button>
          </div>
        </div>
      </section>

      {/* Enquiry */}
      <section className="bg-white py-24 text-stone-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-amber-600 uppercase tracking-[0.22em] text-sm font-bold">{t('landing_enquiry_eyebrow')}</p>
            <h2 className="mt-4 text-4xl md:text-5xl font-bold">{t('landing_enquiry_heading')}</h2>
            <p className="mt-5 text-lg text-stone-600">{t('landing_enquiry_body')}</p>
          </div>
          <form onSubmit={submitInquiry} className="rounded-3xl border border-stone-200 bg-stone-50 p-6 md:p-8">
            <div className="grid gap-5 md:grid-cols-2">
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_full_name')}</span><input name="fullName" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_company')}</span><input name="companyName" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_email')}</span><input name="email" type="email" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_telephone')}</span><input name="telephone" type="tel" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_address')}</span><input name="address" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_topic')}</span><select name="topic" required defaultValue="" className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3"><option value="" disabled>{t('landing_form_select_option')}</option><option value="General enquiry">{t('landing_form_topic_general')}</option><option value="Request a demonstration">{t('landing_form_topic_demo')}</option><option value="Pricing and plans">{t('landing_form_topic_pricing')}</option><option value="Digital check-in and guest experience">{t('landing_form_topic_digital')}</option><option value="Guest management and compliance">{t('landing_form_topic_guest')}</option><option value="Housekeeping and hotel operations">{t('landing_form_topic_housekeeping')}</option><option value="Analytics and Visitor Origin Explorer">{t('landing_form_topic_analytics')}</option><option value="Business Snapshot and reporting">{t('landing_form_topic_snapshot')}</option><option value="Multi-property / Enterprise">{t('landing_form_topic_multi')}</option><option value="Payments and card tokenization">{t('landing_form_topic_payments')}</option><option value="Partnership or integration">{t('landing_form_topic_partnership')}</option></select></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_comments')}</span><textarea name="comments" rows={5} required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" placeholder={t('landing_form_comments_placeholder')} /></label>
            </div>
            <TurnstileWidget action="homepage-enquiry" onToken={setInquiryTurnstileToken} resetKey={inquiryTurnstileResetKey} />
            {inquiryMessage && <p className="mt-5 rounded-xl bg-white px-4 py-3 text-sm text-stone-700 border border-stone-200">{inquiryMessage}</p>}
            <button disabled={inquiryBusy} type="submit" className="mt-6 rounded-xl bg-stone-950 px-7 py-3.5 font-bold text-amber-400 hover:bg-stone-800 disabled:opacity-60">{inquiryBusy ? t('landing_form_sending') : t('landing_form_send')}</button>
            <p className="mt-4 text-xs text-stone-500">{t('landing_form_privacy_note')}</p>
          </form>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-amber-500 py-24 text-stone-950">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_#fff_0,_transparent_45%)]" />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <p className="uppercase tracking-[0.22em] text-xs font-black">{t('landing_final_eyebrow')}</p>
          <h2 className="mt-4 text-4xl md:text-5xl font-black">{t('landing_final_heading')}</h2>
          <p className="mt-5 text-lg text-stone-800 max-w-2xl mx-auto">{t('landing_final_body')}</p>
          <button onClick={() => navigate('/register')} className="mt-8 rounded-full bg-stone-950 px-9 py-4 font-bold text-amber-400 hover:bg-stone-800 transition shadow-xl">
            {t('landing_cta_get_started')}
          </button>
          <p className="mt-4 text-sm text-stone-700">{t('landing_cta_trial_note')}</p>
          <button onClick={() => setDownloadDocument('brochure')} className="mt-7 rounded-full border border-stone-900/30 px-7 py-3 font-bold text-stone-950 hover:bg-white/20 transition">
            {t('landing_download_brochure')}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-950 text-stone-400 py-12 border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <img src="/fastcheckin-logo.png" alt={t('landing_logo_alt')} className="h-12 w-auto object-contain mb-3" />
              <p className="text-sm">{t('landing_footer_tagline')}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-x-7 gap-y-3 text-sm">
              <button onClick={() => scrollTo('platform-section')} className="hover:text-white transition">{t('landing_redesign_platform_link')}</button>
              <button onClick={() => scrollTo('pricing-section')} className="hover:text-white transition">{t('landing_redesign_pricing_link')}</button>
              <button onClick={() => setLegalDocument('privacy')} className="hover:text-white transition">{t('landing_footer_privacy_terms')}</button>
              <button onClick={() => navigate('/super-admin-login')} className="hover:text-white transition">{t('landing_footer_super_admin')}</button>
            </div>
          </div>
          <div className="text-center text-xs mt-8 pt-8 border-t border-stone-800">
            {t('landing_footer_copyright', { year: new Date().getFullYear() })}
          </div>
        </div>
      </footer>
      <GlobalMarketSelector />
      <HomepageLeadModal document={downloadDocument} onClose={() => setDownloadDocument(null)} onDownloaded={() => setDownloadDocument(null)} onOpenLegal={(document) => { setDownloadDocument(null); setLegalDocument(document); }} />
      <HomepageLegalModal document={legalDocument} onClose={() => setLegalDocument(null)} />
      <EnterpriseInquiryModal open={enterpriseInquiryOpen} onClose={() => setEnterpriseInquiryOpen(false)} />
    </div>
  );
}
}{plan.priceYearly}</strong>{t('landing_plan_per_year')}</p>
                <ul className="mt-7 space-y-3 min-h-[150px]">
                  {plan.featureKeys.map((featureKey) => (
                    <li key={featureKey} className="flex gap-2 text-sm text-stone-600">
                      <Check className="h-5 w-5 text-amber-600 flex-shrink-0" />
                      <span>{t(featureKey)}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate('/register')} className={`w-full rounded-xl py-3 font-bold transition ${plan.isPopular ? 'bg-amber-500 text-stone-950 hover:bg-amber-400' : 'bg-stone-900 text-white hover:bg-stone-800'}`}>
                  {t('landing_plan_start_trial')}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <button onClick={() => setDownloadDocument('brochure')} className="rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-bold text-stone-900 hover:border-amber-500 hover:text-amber-700 transition">
              {t('landing_download_brochure')}
            </button>
          </div>

          <div className="mt-8 rounded-3xl bg-stone-950 p-8 text-center text-white">
            <h3 className="text-2xl font-bold">{t('landing_enterprise_title')}</h3>
            <p className="text-amber-400 font-semibold mt-2">{t('landing_enterprise_pricing')}</p>
            <p className="text-stone-400 max-w-2xl mx-auto mt-3">{t('landing_enterprise_f1')}</p>
            <button onClick={() => setEnterpriseInquiryOpen(true)} className="mt-6 rounded-full border border-amber-500 px-7 py-3 text-amber-400 font-semibold hover:bg-amber-500/10 transition">
              {t('landing_contact_us')}
            </button>
          </div>
        </div>
      </section>

      {/* Enquiry */}
      <section className="bg-white py-24 text-stone-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-amber-600 uppercase tracking-[0.22em] text-sm font-bold">{t('landing_enquiry_eyebrow')}</p>
            <h2 className="mt-4 text-4xl md:text-5xl font-bold">{t('landing_enquiry_heading')}</h2>
            <p className="mt-5 text-lg text-stone-600">{t('landing_enquiry_body')}</p>
          </div>
          <form onSubmit={submitInquiry} className="rounded-3xl border border-stone-200 bg-stone-50 p-6 md:p-8">
            <div className="grid gap-5 md:grid-cols-2">
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_full_name')}</span><input name="fullName" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_company')}</span><input name="companyName" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_email')}</span><input name="email" type="email" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_telephone')}</span><input name="telephone" type="tel" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_address')}</span><input name="address" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_topic')}</span><select name="topic" required defaultValue="" className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3"><option value="" disabled>{t('landing_form_select_option')}</option><option value="General enquiry">{t('landing_form_topic_general')}</option><option value="Request a demonstration">{t('landing_form_topic_demo')}</option><option value="Pricing and plans">{t('landing_form_topic_pricing')}</option><option value="Digital check-in and guest experience">{t('landing_form_topic_digital')}</option><option value="Guest management and compliance">{t('landing_form_topic_guest')}</option><option value="Housekeeping and hotel operations">{t('landing_form_topic_housekeeping')}</option><option value="Analytics and Visitor Origin Explorer">{t('landing_form_topic_analytics')}</option><option value="Business Snapshot and reporting">{t('landing_form_topic_snapshot')}</option><option value="Multi-property / Enterprise">{t('landing_form_topic_multi')}</option><option value="Payments and card tokenization">{t('landing_form_topic_payments')}</option><option value="Partnership or integration">{t('landing_form_topic_partnership')}</option></select></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_comments')}</span><textarea name="comments" rows={5} required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" placeholder={t('landing_form_comments_placeholder')} /></label>
            </div>
            <TurnstileWidget action="homepage-enquiry" onToken={setInquiryTurnstileToken} resetKey={inquiryTurnstileResetKey} />
            {inquiryMessage && <p className="mt-5 rounded-xl bg-white px-4 py-3 text-sm text-stone-700 border border-stone-200">{inquiryMessage}</p>}
            <button disabled={inquiryBusy} type="submit" className="mt-6 rounded-xl bg-stone-950 px-7 py-3.5 font-bold text-amber-400 hover:bg-stone-800 disabled:opacity-60">{inquiryBusy ? t('landing_form_sending') : t('landing_form_send')}</button>
            <p className="mt-4 text-xs text-stone-500">{t('landing_form_privacy_note')}</p>
          </form>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-amber-500 py-24 text-stone-950">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_#fff_0,_transparent_45%)]" />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <p className="uppercase tracking-[0.22em] text-xs font-black">{t('landing_final_eyebrow')}</p>
          <h2 className="mt-4 text-4xl md:text-5xl font-black">{t('landing_final_heading')}</h2>
          <p className="mt-5 text-lg text-stone-800 max-w-2xl mx-auto">{t('landing_final_body')}</p>
          <button onClick={() => navigate('/register')} className="mt-8 rounded-full bg-stone-950 px-9 py-4 font-bold text-amber-400 hover:bg-stone-800 transition shadow-xl">
            {t('landing_cta_get_started')}
          </button>
          <p className="mt-4 text-sm text-stone-700">{t('landing_cta_trial_note')}</p>
          <button onClick={() => setDownloadDocument('brochure')} className="mt-7 rounded-full border border-stone-900/30 px-7 py-3 font-bold text-stone-950 hover:bg-white/20 transition">
            {t('landing_download_brochure')}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-950 text-stone-400 py-12 border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <img src="/fastcheckin-logo.png" alt={t('landing_logo_alt')} className="h-12 w-auto object-contain mb-3" />
              <p className="text-sm">{t('landing_footer_tagline')}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-x-7 gap-y-3 text-sm">
              <button onClick={() => scrollTo('platform-section')} className="hover:text-white transition">{t('landing_redesign_platform_link')}</button>
              <button onClick={() => scrollTo('pricing-section')} className="hover:text-white transition">{t('landing_redesign_pricing_link')}</button>
              <button onClick={() => setLegalDocument('privacy')} className="hover:text-white transition">{t('landing_footer_privacy_terms')}</button>
              <button onClick={() => navigate('/super-admin-login')} className="hover:text-white transition">{t('landing_footer_super_admin')}</button>
            </div>
          </div>
          <div className="text-center text-xs mt-8 pt-8 border-t border-stone-800">
            {t('landing_footer_copyright', { year: new Date().getFullYear() })}
          </div>
        </div>
      </footer>
      <GlobalMarketSelector />
      <HomepageLeadModal document={downloadDocument} onClose={() => setDownloadDocument(null)} onDownloaded={() => setDownloadDocument(null)} onOpenLegal={(document) => { setDownloadDocument(null); setLegalDocument(document); }} />
      <HomepageLegalModal document={legalDocument} onClose={() => setLegalDocument(null)} />
      <EnterpriseInquiryModal open={enterpriseInquiryOpen} onClose={() => setEnterpriseInquiryOpen(false)} />
    </div>
  );
}
}{plan.priceMonthly}</span>
                  <span className="text-stone-500"> {t('landing_plan_per_month')}</span>
                </div>
                <p className="text-sm text-stone-500 mt-1">{t('landing_plan_or_year')} <strong className="text-stone-800">R{plan.priceYearly}</strong>{t('landing_plan_per_year')}</p>
                <ul className="mt-7 space-y-3 min-h-[150px]">
                  {plan.featureKeys.map((featureKey) => (
                    <li key={featureKey} className="flex gap-2 text-sm text-stone-600">
                      <Check className="h-5 w-5 text-amber-600 flex-shrink-0" />
                      <span>{t(featureKey)}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate('/register')} className={`w-full rounded-xl py-3 font-bold transition ${plan.isPopular ? 'bg-amber-500 text-stone-950 hover:bg-amber-400' : 'bg-stone-900 text-white hover:bg-stone-800'}`}>
                  {t('landing_plan_start_trial')}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <button onClick={() => setDownloadDocument('brochure')} className="rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-bold text-stone-900 hover:border-amber-500 hover:text-amber-700 transition">
              {t('landing_download_brochure')}
            </button>
          </div>

          <div className="mt-8 rounded-3xl bg-stone-950 p-8 text-center text-white">
            <h3 className="text-2xl font-bold">{t('landing_enterprise_title')}</h3>
            <p className="text-amber-400 font-semibold mt-2">{t('landing_enterprise_pricing')}</p>
            <p className="text-stone-400 max-w-2xl mx-auto mt-3">{t('landing_enterprise_f1')}</p>
            <button onClick={() => setEnterpriseInquiryOpen(true)} className="mt-6 rounded-full border border-amber-500 px-7 py-3 text-amber-400 font-semibold hover:bg-amber-500/10 transition">
              {t('landing_contact_us')}
            </button>
          </div>
        </div>
      </section>

      {/* Enquiry */}
      <section className="bg-white py-24 text-stone-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-amber-600 uppercase tracking-[0.22em] text-sm font-bold">{t('landing_enquiry_eyebrow')}</p>
            <h2 className="mt-4 text-4xl md:text-5xl font-bold">{t('landing_enquiry_heading')}</h2>
            <p className="mt-5 text-lg text-stone-600">{t('landing_enquiry_body')}</p>
          </div>
          <form onSubmit={submitInquiry} className="rounded-3xl border border-stone-200 bg-stone-50 p-6 md:p-8">
            <div className="grid gap-5 md:grid-cols-2">
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_full_name')}</span><input name="fullName" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_company')}</span><input name="companyName" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_email')}</span><input name="email" type="email" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_telephone')}</span><input name="telephone" type="tel" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_address')}</span><input name="address" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_topic')}</span><select name="topic" required defaultValue="" className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3"><option value="" disabled>{t('landing_form_select_option')}</option><option value="General enquiry">{t('landing_form_topic_general')}</option><option value="Request a demonstration">{t('landing_form_topic_demo')}</option><option value="Pricing and plans">{t('landing_form_topic_pricing')}</option><option value="Digital check-in and guest experience">{t('landing_form_topic_digital')}</option><option value="Guest management and compliance">{t('landing_form_topic_guest')}</option><option value="Housekeeping and hotel operations">{t('landing_form_topic_housekeeping')}</option><option value="Analytics and Visitor Origin Explorer">{t('landing_form_topic_analytics')}</option><option value="Business Snapshot and reporting">{t('landing_form_topic_snapshot')}</option><option value="Multi-property / Enterprise">{t('landing_form_topic_multi')}</option><option value="Payments and card tokenization">{t('landing_form_topic_payments')}</option><option value="Partnership or integration">{t('landing_form_topic_partnership')}</option></select></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_comments')}</span><textarea name="comments" rows={5} required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" placeholder={t('landing_form_comments_placeholder')} /></label>
            </div>
            <TurnstileWidget action="homepage-enquiry" onToken={setInquiryTurnstileToken} resetKey={inquiryTurnstileResetKey} />
            {inquiryMessage && <p className="mt-5 rounded-xl bg-white px-4 py-3 text-sm text-stone-700 border border-stone-200">{inquiryMessage}</p>}
            <button disabled={inquiryBusy} type="submit" className="mt-6 rounded-xl bg-stone-950 px-7 py-3.5 font-bold text-amber-400 hover:bg-stone-800 disabled:opacity-60">{inquiryBusy ? t('landing_form_sending') : t('landing_form_send')}</button>
            <p className="mt-4 text-xs text-stone-500">{t('landing_form_privacy_note')}</p>
          </form>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-amber-500 py-24 text-stone-950">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_#fff_0,_transparent_45%)]" />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <p className="uppercase tracking-[0.22em] text-xs font-black">{t('landing_final_eyebrow')}</p>
          <h2 className="mt-4 text-4xl md:text-5xl font-black">{t('landing_final_heading')}</h2>
          <p className="mt-5 text-lg text-stone-800 max-w-2xl mx-auto">{t('landing_final_body')}</p>
          <button onClick={() => navigate('/register')} className="mt-8 rounded-full bg-stone-950 px-9 py-4 font-bold text-amber-400 hover:bg-stone-800 transition shadow-xl">
            {t('landing_cta_get_started')}
          </button>
          <p className="mt-4 text-sm text-stone-700">{t('landing_cta_trial_note')}</p>
          <button onClick={() => setDownloadDocument('brochure')} className="mt-7 rounded-full border border-stone-900/30 px-7 py-3 font-bold text-stone-950 hover:bg-white/20 transition">
            {t('landing_download_brochure')}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-950 text-stone-400 py-12 border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <img src="/fastcheckin-logo.png" alt={t('landing_logo_alt')} className="h-12 w-auto object-contain mb-3" />
              <p className="text-sm">{t('landing_footer_tagline')}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-x-7 gap-y-3 text-sm">
              <button onClick={() => scrollTo('platform-section')} className="hover:text-white transition">{t('landing_redesign_platform_link')}</button>
              <button onClick={() => scrollTo('pricing-section')} className="hover:text-white transition">{t('landing_redesign_pricing_link')}</button>
              <button onClick={() => setLegalDocument('privacy')} className="hover:text-white transition">{t('landing_footer_privacy_terms')}</button>
              <button onClick={() => navigate('/super-admin-login')} className="hover:text-white transition">{t('landing_footer_super_admin')}</button>
            </div>
          </div>
          <div className="text-center text-xs mt-8 pt-8 border-t border-stone-800">
            {t('landing_footer_copyright', { year: new Date().getFullYear() })}
          </div>
        </div>
      </footer>
      <GlobalMarketSelector />
      <HomepageLeadModal document={downloadDocument} onClose={() => setDownloadDocument(null)} onDownloaded={() => setDownloadDocument(null)} onOpenLegal={(document) => { setDownloadDocument(null); setLegalDocument(document); }} />
      <HomepageLegalModal document={legalDocument} onClose={() => setLegalDocument(null)} />
      <EnterpriseInquiryModal open={enterpriseInquiryOpen} onClose={() => setEnterpriseInquiryOpen(false)} />
    </div>
  );
}
}{plan.priceYearly}</strong>{t('landing_plan_per_year')}</p>
                <ul className="mt-7 space-y-3 min-h-[150px]">
                  {plan.featureKeys.map((featureKey) => (
                    <li key={featureKey} className="flex gap-2 text-sm text-stone-600">
                      <Check className="h-5 w-5 text-amber-600 flex-shrink-0" />
                      <span>{t(featureKey)}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate('/register')} className={`w-full rounded-xl py-3 font-bold transition ${plan.isPopular ? 'bg-amber-500 text-stone-950 hover:bg-amber-400' : 'bg-stone-900 text-white hover:bg-stone-800'}`}>
                  {t('landing_plan_start_trial')}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <button onClick={() => setDownloadDocument('brochure')} className="rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-bold text-stone-900 hover:border-amber-500 hover:text-amber-700 transition">
              {t('landing_download_brochure')}
            </button>
          </div>

          <div className="mt-8 rounded-3xl bg-stone-950 p-8 text-center text-white">
            <h3 className="text-2xl font-bold">{t('landing_enterprise_title')}</h3>
            <p className="text-amber-400 font-semibold mt-2">{t('landing_enterprise_pricing')}</p>
            <p className="text-stone-400 max-w-2xl mx-auto mt-3">{t('landing_enterprise_f1')}</p>
            <button onClick={() => setEnterpriseInquiryOpen(true)} className="mt-6 rounded-full border border-amber-500 px-7 py-3 text-amber-400 font-semibold hover:bg-amber-500/10 transition">
              {t('landing_contact_us')}
            </button>
          </div>
        </div>
      </section>

      {/* Enquiry */}
      <section className="bg-white py-24 text-stone-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-amber-600 uppercase tracking-[0.22em] text-sm font-bold">{t('landing_enquiry_eyebrow')}</p>
            <h2 className="mt-4 text-4xl md:text-5xl font-bold">{t('landing_enquiry_heading')}</h2>
            <p className="mt-5 text-lg text-stone-600">{t('landing_enquiry_body')}</p>
          </div>
          <form onSubmit={submitInquiry} className="rounded-3xl border border-stone-200 bg-stone-50 p-6 md:p-8">
            <div className="grid gap-5 md:grid-cols-2">
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_full_name')}</span><input name="fullName" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_company')}</span><input name="companyName" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_email')}</span><input name="email" type="email" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_telephone')}</span><input name="telephone" type="tel" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_address')}</span><input name="address" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_topic')}</span><select name="topic" required defaultValue="" className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3"><option value="" disabled>{t('landing_form_select_option')}</option><option value="General enquiry">{t('landing_form_topic_general')}</option><option value="Request a demonstration">{t('landing_form_topic_demo')}</option><option value="Pricing and plans">{t('landing_form_topic_pricing')}</option><option value="Digital check-in and guest experience">{t('landing_form_topic_digital')}</option><option value="Guest management and compliance">{t('landing_form_topic_guest')}</option><option value="Housekeeping and hotel operations">{t('landing_form_topic_housekeeping')}</option><option value="Analytics and Visitor Origin Explorer">{t('landing_form_topic_analytics')}</option><option value="Business Snapshot and reporting">{t('landing_form_topic_snapshot')}</option><option value="Multi-property / Enterprise">{t('landing_form_topic_multi')}</option><option value="Payments and card tokenization">{t('landing_form_topic_payments')}</option><option value="Partnership or integration">{t('landing_form_topic_partnership')}</option></select></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_comments')}</span><textarea name="comments" rows={5} required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" placeholder={t('landing_form_comments_placeholder')} /></label>
            </div>
            <TurnstileWidget action="homepage-enquiry" onToken={setInquiryTurnstileToken} resetKey={inquiryTurnstileResetKey} />
            {inquiryMessage && <p className="mt-5 rounded-xl bg-white px-4 py-3 text-sm text-stone-700 border border-stone-200">{inquiryMessage}</p>}
            <button disabled={inquiryBusy} type="submit" className="mt-6 rounded-xl bg-stone-950 px-7 py-3.5 font-bold text-amber-400 hover:bg-stone-800 disabled:opacity-60">{inquiryBusy ? t('landing_form_sending') : t('landing_form_send')}</button>
            <p className="mt-4 text-xs text-stone-500">{t('landing_form_privacy_note')}</p>
          </form>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-amber-500 py-24 text-stone-950">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_#fff_0,_transparent_45%)]" />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <p className="uppercase tracking-[0.22em] text-xs font-black">{t('landing_final_eyebrow')}</p>
          <h2 className="mt-4 text-4xl md:text-5xl font-black">{t('landing_final_heading')}</h2>
          <p className="mt-5 text-lg text-stone-800 max-w-2xl mx-auto">{t('landing_final_body')}</p>
          <button onClick={() => navigate('/register')} className="mt-8 rounded-full bg-stone-950 px-9 py-4 font-bold text-amber-400 hover:bg-stone-800 transition shadow-xl">
            {t('landing_cta_get_started')}
          </button>
          <p className="mt-4 text-sm text-stone-700">{t('landing_cta_trial_note')}</p>
          <button onClick={() => setDownloadDocument('brochure')} className="mt-7 rounded-full border border-stone-900/30 px-7 py-3 font-bold text-stone-950 hover:bg-white/20 transition">
            {t('landing_download_brochure')}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-950 text-stone-400 py-12 border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <img src="/fastcheckin-logo.png" alt={t('landing_logo_alt')} className="h-12 w-auto object-contain mb-3" />
              <p className="text-sm">{t('landing_footer_tagline')}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-x-7 gap-y-3 text-sm">
              <button onClick={() => scrollTo('platform-section')} className="hover:text-white transition">{t('landing_redesign_platform_link')}</button>
              <button onClick={() => scrollTo('pricing-section')} className="hover:text-white transition">{t('landing_redesign_pricing_link')}</button>
              <button onClick={() => setLegalDocument('privacy')} className="hover:text-white transition">{t('landing_footer_privacy_terms')}</button>
              <button onClick={() => navigate('/super-admin-login')} className="hover:text-white transition">{t('landing_footer_super_admin')}</button>
            </div>
          </div>
          <div className="text-center text-xs mt-8 pt-8 border-t border-stone-800">
            {t('landing_footer_copyright', { year: new Date().getFullYear() })}
          </div>
        </div>
      </footer>
      <GlobalMarketSelector />
      <HomepageLeadModal document={downloadDocument} onClose={() => setDownloadDocument(null)} onDownloaded={() => setDownloadDocument(null)} onOpenLegal={(document) => { setDownloadDocument(null); setLegalDocument(document); }} />
      <HomepageLegalModal document={legalDocument} onClose={() => setLegalDocument(null)} />
      <EnterpriseInquiryModal open={enterpriseInquiryOpen} onClose={() => setEnterpriseInquiryOpen(false)} />
    </div>
  );
}
}{plan.priceMonthly}</span>
                  <span className="text-stone-500"> {t('landing_plan_per_month')}</span>
                </div>
                <p className="text-sm text-stone-500 mt-1">{t('landing_plan_or_year')} <strong className="text-stone-800">R{plan.priceYearly}</strong>{t('landing_plan_per_year')}</p>
                <ul className="mt-7 space-y-3 min-h-[150px]">
                  {plan.featureKeys.map((featureKey) => (
                    <li key={featureKey} className="flex gap-2 text-sm text-stone-600">
                      <Check className="h-5 w-5 text-amber-600 flex-shrink-0" />
                      <span>{t(featureKey)}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate('/register')} className={`w-full rounded-xl py-3 font-bold transition ${plan.isPopular ? 'bg-amber-500 text-stone-950 hover:bg-amber-400' : 'bg-stone-900 text-white hover:bg-stone-800'}`}>
                  {t('landing_plan_start_trial')}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <button onClick={() => setDownloadDocument('brochure')} className="rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-bold text-stone-900 hover:border-amber-500 hover:text-amber-700 transition">
              {t('landing_download_brochure')}
            </button>
          </div>

          <div className="mt-8 rounded-3xl bg-stone-950 p-8 text-center text-white">
            <h3 className="text-2xl font-bold">{t('landing_enterprise_title')}</h3>
            <p className="text-amber-400 font-semibold mt-2">{t('landing_enterprise_pricing')}</p>
            <p className="text-stone-400 max-w-2xl mx-auto mt-3">{t('landing_enterprise_f1')}</p>
            <button onClick={() => setEnterpriseInquiryOpen(true)} className="mt-6 rounded-full border border-amber-500 px-7 py-3 text-amber-400 font-semibold hover:bg-amber-500/10 transition">
              {t('landing_contact_us')}
            </button>
          </div>
        </div>
      </section>

      {/* Enquiry */}
      <section className="bg-white py-24 text-stone-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-amber-600 uppercase tracking-[0.22em] text-sm font-bold">{t('landing_enquiry_eyebrow')}</p>
            <h2 className="mt-4 text-4xl md:text-5xl font-bold">{t('landing_enquiry_heading')}</h2>
            <p className="mt-5 text-lg text-stone-600">{t('landing_enquiry_body')}</p>
          </div>
          <form onSubmit={submitInquiry} className="rounded-3xl border border-stone-200 bg-stone-50 p-6 md:p-8">
            <div className="grid gap-5 md:grid-cols-2">
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_full_name')}</span><input name="fullName" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_company')}</span><input name="companyName" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_email')}</span><input name="email" type="email" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_telephone')}</span><input name="telephone" type="tel" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_address')}</span><input name="address" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" /></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_topic')}</span><select name="topic" required defaultValue="" className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3"><option value="" disabled>{t('landing_form_select_option')}</option><option value="General enquiry">{t('landing_form_topic_general')}</option><option value="Request a demonstration">{t('landing_form_topic_demo')}</option><option value="Pricing and plans">{t('landing_form_topic_pricing')}</option><option value="Digital check-in and guest experience">{t('landing_form_topic_digital')}</option><option value="Guest management and compliance">{t('landing_form_topic_guest')}</option><option value="Housekeeping and hotel operations">{t('landing_form_topic_housekeeping')}</option><option value="Analytics and Visitor Origin Explorer">{t('landing_form_topic_analytics')}</option><option value="Business Snapshot and reporting">{t('landing_form_topic_snapshot')}</option><option value="Multi-property / Enterprise">{t('landing_form_topic_multi')}</option><option value="Payments and card tokenization">{t('landing_form_topic_payments')}</option><option value="Partnership or integration">{t('landing_form_topic_partnership')}</option></select></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">{t('landing_form_comments')}</span><textarea name="comments" rows={5} required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" placeholder={t('landing_form_comments_placeholder')} /></label>
            </div>
            <TurnstileWidget action="homepage-enquiry" onToken={setInquiryTurnstileToken} resetKey={inquiryTurnstileResetKey} />
            {inquiryMessage && <p className="mt-5 rounded-xl bg-white px-4 py-3 text-sm text-stone-700 border border-stone-200">{inquiryMessage}</p>}
            <button disabled={inquiryBusy} type="submit" className="mt-6 rounded-xl bg-stone-950 px-7 py-3.5 font-bold text-amber-400 hover:bg-stone-800 disabled:opacity-60">{inquiryBusy ? t('landing_form_sending') : t('landing_form_send')}</button>
            <p className="mt-4 text-xs text-stone-500">{t('landing_form_privacy_note')}</p>
          </form>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-amber-500 py-24 text-stone-950">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_#fff_0,_transparent_45%)]" />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <p className="uppercase tracking-[0.22em] text-xs font-black">{t('landing_final_eyebrow')}</p>
          <h2 className="mt-4 text-4xl md:text-5xl font-black">{t('landing_final_heading')}</h2>
          <p className="mt-5 text-lg text-stone-800 max-w-2xl mx-auto">{t('landing_final_body')}</p>
          <button onClick={() => navigate('/register')} className="mt-8 rounded-full bg-stone-950 px-9 py-4 font-bold text-amber-400 hover:bg-stone-800 transition shadow-xl">
            {t('landing_cta_get_started')}
          </button>
          <p className="mt-4 text-sm text-stone-700">{t('landing_cta_trial_note')}</p>
          <button onClick={() => setDownloadDocument('brochure')} className="mt-7 rounded-full border border-stone-900/30 px-7 py-3 font-bold text-stone-950 hover:bg-white/20 transition">
            {t('landing_download_brochure')}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-950 text-stone-400 py-12 border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <img src="/fastcheckin-logo.png" alt={t('landing_logo_alt')} className="h-12 w-auto object-contain mb-3" />
              <p className="text-sm">{t('landing_footer_tagline')}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-x-7 gap-y-3 text-sm">
              <button onClick={() => scrollTo('platform-section')} className="hover:text-white transition">{t('landing_redesign_platform_link')}</button>
              <button onClick={() => scrollTo('pricing-section')} className="hover:text-white transition">{t('landing_redesign_pricing_link')}</button>
              <button onClick={() => setLegalDocument('privacy')} className="hover:text-white transition">{t('landing_footer_privacy_terms')}</button>
              <button onClick={() => navigate('/super-admin-login')} className="hover:text-white transition">{t('landing_footer_super_admin')}</button>
            </div>
          </div>
          <div className="text-center text-xs mt-8 pt-8 border-t border-stone-800">
            {t('landing_footer_copyright', { year: new Date().getFullYear() })}
          </div>
        </div>
      </footer>
      <GlobalMarketSelector />
      <HomepageLeadModal document={downloadDocument} onClose={() => setDownloadDocument(null)} onDownloaded={() => setDownloadDocument(null)} onOpenLegal={(document) => { setDownloadDocument(null); setLegalDocument(document); }} />
      <HomepageLegalModal document={legalDocument} onClose={() => setLegalDocument(null)} />
      <EnterpriseInquiryModal open={enterpriseInquiryOpen} onClose={() => setEnterpriseInquiryOpen(false)} />
    </div>
  );
}
