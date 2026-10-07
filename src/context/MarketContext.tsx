import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { isSouthAfrica, regionForCountry, type MarketRegion } from '../config/markets';

interface MarketDetection {
  countryCode: string | null;
  countryName: string | null;
  suggestedRegion: MarketRegion;
}

interface MarketContextValue {
  region: MarketRegion;
  detected: MarketDetection | null;
  chooserOpen: boolean;
  setChooserOpen: (open: boolean) => void;
  selectRegion: (region: MarketRegion) => void;
  resetMarket: () => void;
  isSouthAfricanMarket: boolean;
}

const STORAGE_KEY = 'fastcheckin.market.region';
const CONFIRMED_KEY = 'fastcheckin.market.confirmed';

const MarketContext = createContext<MarketContextValue | null>(null);

export function MarketProvider({ children }: { children: ReactNode }) {
  const [region, setRegion] = useState<MarketRegion>('africa');
  const [detected, setDetected] = useState<MarketDetection | null>(null);
  const [chooserOpen, setChooserOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as MarketRegion | null;
    const confirmed = localStorage.getItem(CONFIRMED_KEY) === 'true';
    if (saved) setRegion(saved);

    fetch('/.netlify/functions/market-context', { headers: { Accept: 'application/json' } })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!data?.countryCode) return;
        const suggestedRegion = regionForCountry(data.countryCode);
        setDetected({ countryCode: data.countryCode, countryName: data.countryName || null, suggestedRegion });
        if (!saved && !confirmed && !isSouthAfrica(data.countryCode)) setChooserOpen(true);
      })
      .catch(() => undefined);
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
    setChooserOpen(true);
  }, []);

  const value = useMemo(() => ({
    region,
    detected,
    chooserOpen,
    setChooserOpen,
    selectRegion,
    resetMarket,
    isSouthAfricanMarket: detected?.countryCode === 'ZA' && region === 'africa',
  }), [region, detected, chooserOpen, selectRegion, resetMarket]);

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

export function useMarket() {
  const value = useContext(MarketContext);
  if (!value) throw new Error('useMarket must be used within MarketProvider');
  return value;
}
