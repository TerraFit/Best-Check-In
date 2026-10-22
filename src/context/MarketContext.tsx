import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { regionForCountry, type MarketRegion } from '../config/markets';
import type { PricingFxRate } from '../config/pricing';

interface MarketDetection {
  countryCode: string | null;
  countryName: string | null;
  suggestedRegion: MarketRegion | null;
}

type DetectionStatus = 'pending' | 'resolved' | 'failed';

interface MarketContextValue {
  region: MarketRegion;
  detected: MarketDetection | null;
  detectionStatus: DetectionStatus;
  chooserOpen: boolean;
  setChooserOpen: (open: boolean) => void;
  selectRegion: (region: MarketRegion) => void;
  resetMarket: () => void;
  isSouthAfricanMarket: boolean;
  fxRates: Partial<Record<'USD' | 'EUR', PricingFxRate>>;
}

const STORAGE_KEY = 'fastcheckin.market.region';
const CONFIRMED_KEY = 'fastcheckin.market.confirmed';
const FX_RATES_KEY = 'fastcheckin.pricing.fxRates';

const MarketContext = createContext<MarketContextValue | null>(null);

export function MarketProvider({ children }: { children: ReactNode }) {
  const [region, setRegion] = useState<MarketRegion>('africa');
  const [detected, setDetected] = useState<MarketDetection | null>(null);
  const [detectionStatus, setDetectionStatus] = useState<DetectionStatus>('pending');
  const [chooserOpen, setChooserOpen] = useState(false);
  const [fxRates, setFxRates] = useState<Partial<Record<'USD' | 'EUR', PricingFxRate>>>(() => {
    try { return JSON.parse(localStorage.getItem(FX_RATES_KEY) || '{}'); } catch { return {}; }
  });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as MarketRegion | null;
    const confirmed = localStorage.getItem(CONFIRMED_KEY) === 'true';
    if (saved && confirmed) {
      setRegion(saved);
      setDetectionStatus('resolved');
    }

    fetch('/.netlify/functions/pricing-fx', { headers: { Accept: 'application/json' } })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!data?.rates) return;
        setFxRates(data.rates);
        localStorage.setItem(FX_RATES_KEY, JSON.stringify(data.rates));
      })
      .catch(() => undefined);

    fetch('/.netlify/functions/market-context', { headers: { Accept: 'application/json' } })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!data?.countryCode) {
          setDetectionStatus('failed');
          if (!saved || !confirmed) setChooserOpen(true);
          return;
        }

        const suggestedRegion = regionForCountry(data.countryCode);
        setDetected({ countryCode: data.countryCode, countryName: data.countryName || null, suggestedRegion });
        setDetectionStatus('resolved');

        if (!saved || !confirmed) {
          if (suggestedRegion) {
            setRegion(suggestedRegion);
            // South Africa is the only market that is automatically accepted;
            // other countries retain the chooser so visitors can explicitly select.
            if (suggestedRegion !== 'south-africa') setChooserOpen(true);
          } else {
            setChooserOpen(true);
          }
        }
      })
      .catch(() => {
        setDetectionStatus('failed');
        if (!saved || !confirmed) setChooserOpen(true);
      });
  }, []);

  const selectRegion = useCallback((nextRegion: MarketRegion) => {
    setRegion(nextRegion);
    localStorage.setItem(STORAGE_KEY, nextRegion);
    localStorage.setItem(CONFIRMED_KEY, 'true');
    setChooserOpen(false);
  }, []);

  const resetMarket = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CONFIRMED_KEY);
    setRegion('africa');
    setDetected(null);
    setDetectionStatus('pending');
    setChooserOpen(false);
    window.location.reload();
  }, []);

  const value = useMemo(() => ({
    region,
    detected,
    detectionStatus,
    chooserOpen,
    setChooserOpen,
    selectRegion,
    resetMarket,
    isSouthAfricanMarket: region === 'south-africa',
    fxRates,
  }), [region, detected, detectionStatus, chooserOpen, selectRegion, resetMarket, fxRates]);

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

export function useMarket() {
  const value = useContext(MarketContext);
  if (!value) throw new Error('useMarket must be used within MarketProvider');
  return value;
}
