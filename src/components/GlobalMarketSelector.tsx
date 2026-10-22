import { Globe2, MapPin, X } from 'lucide-react';
import { MARKET_CONFIG, type MarketRegion } from '../config/markets';
import { useMarket } from '../context/MarketContext';

const regions: MarketRegion[] = ['africa', 'europe', 'north-america', 'south-america', 'middle-east', 'asia', 'oceania'];

const regionIcons: Record<MarketRegion, string> = {
  'south-africa': '🇿🇦',
  africa: '🌍',
  europe: '🇪🇺',
  'north-america': '🌎',
  'south-america': '🌎',
  'middle-east': '🌍',
  asia: '🌏',
  oceania: '🌊',
};

export default function GlobalMarketSelector() {
  const { chooserOpen, detected, region, confirmationRegion, selectRegion, confirmRegion, declineRegion, cancelRegionSelection } = useMarket();
  if (!chooserOpen) return null;

  const confirmationName = confirmationRegion ? MARKET_CONFIG[confirmationRegion].name : null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-950/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="global-market-title">
      <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl bg-white text-stone-900 shadow-2xl">
        <button onClick={cancelRegionSelection} className="absolute right-4 top-4 z-10 rounded-full p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900" aria-label="Close market selector"><X className="h-5 w-5" /></button>
        <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
          <div className="relative overflow-hidden bg-stone-950 p-8 md:p-10 text-white">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border border-amber-500/20" />
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full border border-amber-500/20" />
            <div className="relative flex h-full flex-col justify-between">
              <div>
                <Globe2 className="h-10 w-10 text-amber-400" />
                <p className="mt-7 text-xs font-bold uppercase tracking-[0.25em] text-amber-400">FastCheckIn Global</p>
                <h2 id="global-market-title" className="mt-3 text-3xl font-black md:text-4xl">Choose your market</h2>
                <p className="mt-4 max-w-md leading-relaxed text-stone-300">FastCheckIn serves hospitality businesses worldwide. Choose the market that best represents where your property operates.</p>
              </div>
              <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-5">
                <MapPin className="h-5 w-5 text-amber-400" />
                <p className="mt-3 text-sm text-stone-300">{detected?.countryName ? 'We detected you in ' + detected.countryName + '.' : 'We could not determine your location.'}</p>
                <p className="mt-1 text-xs text-stone-500">You can change this at any time.</p>
              </div>
            </div>
          </div>
          <div className="p-6 md:p-10">
            <p className="text-sm font-semibold text-stone-500">Select a region</p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {regions.map((item) => {
                const config = MARKET_CONFIG[item];
                const selected = region === item;
                return (
                  <button key={item} onClick={() => selectRegion(item)} className={'group rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-amber-500 hover:shadow-md ' + (selected ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-500/20' : 'border-stone-200 bg-white')}>
                    <span className="text-2xl" aria-hidden="true">{regionIcons[item]}</span>
                    <span className="mt-3 block font-bold">{config.name}</span>
                    <span className="mt-1 block text-xs text-stone-500">{config.currency} · regional pricing</span>
                  </button>
                );
              })}
            </div>

            {confirmationRegion && (
              <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <p className="font-bold text-stone-900">Do you want to make {confirmationName} your region?</p>
                <p className="mt-1 text-sm text-stone-600">Choose Yes to remember this region for future visits, or No to use your detected region again on your next visit.</p>
                <div className="mt-4 flex gap-3">
                  <button onClick={confirmRegion} className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-stone-700">Yes</button>
                  <button onClick={declineRegion} className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-50">No</button>
                </div>
              </div>
            )}

            {!confirmationRegion && (
              <button onClick={cancelRegionSelection} className="mt-5 text-sm font-semibold text-stone-500 underline underline-offset-4 hover:text-stone-900">Close</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
