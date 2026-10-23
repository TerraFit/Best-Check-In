import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { regionForCountry, type MarketRegion } from '../config/markets';
import type { PricingFxRate } from '../config/pricing';

interface MarketDetection { countryCode: string | null; countryName: string | null; suggestedRegion: MarketRegion | null; }
type DetectionStatus = 'pending' | 'resolved' | 'failed';
interface MarketContextValue { region: MarketRegion; detected: MarketDetection | null; detectionStatus: DetectionStatus; chooserOpen: boolean; confirmationRegion: MarketRegion | null; setChooserOpen: (open: boolean) => void; selectRegion: (region: MarketRegion) => void; confirmRegion: () => void; declineRegion: () => void; cancelRegionSelection: () => void; resetMarket: () => void; isSouthAfricanMarket: boolean; fxRates: Partial<Record<'USD' | 'EUR', PricingFxRate>>; }

const STORAGE_KEY = 'fastcheckin.market.region';
const CONFIRMED_KEY = 'fastcheckin.market.confirmed';
const FX_RATES_KEY = 'fastcheckin.pricing.fxRates';
const DETECTED_VISITOR_KEY = 'fastcheckin.detected.visitor';
const MarketContext = createContext<MarketContextValue | null>(null);

function readDetectedVisitor(): MarketDetection | null {
  try {
    const raw = sessionStorage.getItem(DETECTED_VISITOR_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.countryCode) return null;
    return { countryCode: String(data.countryCode).toUpperCase(), countryName: data.countryName || null, suggestedRegion: regionForCountry(data.countryCode) };
  } catch { return null; }
}

export function MarketProvider({ children }: { children: ReactNode }) {
  const initialDetected = readDetectedVisitor();
  const initialSaved = (() => { try { return localStorage.getItem(STORAGE_KEY) as MarketRegion | null; } catch { return null; } })();
  const initialConfirmed = (() => { try { return localStorage.getItem(CONFIRMED_KEY) === 'true'; } catch { return false; } })();
  const initialRegion = initialConfirmed && initialSaved ? initialSaved : initialDetected?.suggestedRegion || 'africa';

  const [region, setRegion] = useState<MarketRegion>(initialRegion);
  const [detected, setDetected] = useState<MarketDetection | null>(initialDetected);
  const [detectionStatus, setDetectionStatus] = useState<DetectionStatus>(initialDetected || initialConfirmed ? 'resolved' : 'pending');
  const [chooserOpen, setChooserOpen] = useState(false);
  const [confirmationRegion, setConfirmationRegion] = useState<MarketRegion | null>(initialDetected?.suggestedRegion && initialDetected.suggestedRegion !== 'south-africa' && !initialConfirmed ? initialDetected.suggestedRegion : null);
  const [fxRates, setFxRates] = useState<Partial<Record<'USD' | 'EUR', PricingFxRate>>>(() => { try { return JSON.parse(localStorage.getItem(FX_RATES_KEY) || '{}'); } catch { return {}; } });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as MarketRegion | null;
    const confirmed = localStorage.getItem(CONFIRMED_KEY) === 'true';

    fetch('/.netlify/functions/pricing-fx', { headers: { Accept: 'application/json' } })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (!data?.rates) return; setFxRates(data.rates); localStorage.setItem(FX_RATES_KEY, JSON.stringify(data.rates)); })
      .catch(() => undefined);

    fetch('/.netlify/functions/market-context', { headers: { Accept: 'application/json' } })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!data?.countryCode) { setDetectionStatus('failed'); return; }
        const suggestedRegion = regionForCountry(data.countryCode);
        const nextDetected = { countryCode: String(data.countryCode).toUpperCase(), countryName: data.countryName || null, suggestedRegion };
        setDetected(nextDetected);
        setDetectionStatus('resolved');
        try { sessionStorage.setItem(DETECTED_VISITOR_KEY, JSON.stringify({ countryCode: nextDetected.countryCode, countryName: nextDetected.countryName })); } catch { /* storage is optional */ }

        if (confirmed && saved) {
          setRegion(saved);
          setConfirmationRegion(null);
          return;
        }

        if (suggestedRegion) {
          setRegion(suggestedRegion);
          setConfirmationRegion(suggestedRegion === 'south-africa' ? null : suggestedRegion);
          if (suggestedRegion !== 'south-africa') setChooserOpen(true);
        }
      })
      .catch(() => { setDetectionStatus('failed'); });
  }, []);

  const selectRegion = useCallback((nextRegion: MarketRegion) => {
    setRegion(nextRegion);
    setConfirmationRegion(nextRegion);
    setChooserOpen(true);
  }, []);

  const confirmRegion = useCallback(() => {
    if (!confirmationRegion) return;
    setRegion(confirmationRegion);
    localStorage.setItem(STORAGE_KEY, confirmationRegion);
    localStorage.setItem(CONFIRMED_KEY, 'true');
    setConfirmationRegion(null);
    setChooserOpen(false);
  }, [confirmationRegion]);

  const declineRegion = useCallback(() => {
    if (!confirmationRegion) return;
    // “No” means use this region for this visit only. Remove any previous
    // persisted choice so the next visit can return to the detected market.
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CONFIRMED_KEY);
    setRegion(confirmationRegion);
    setConfirmationRegion(null);
    setChooserOpen(false);
  }, [confirmationRegion]);

  const cancelRegionSelection = useCallback(() => {
    const detectedRegion = detected?.suggestedRegion;
    const saved = (() => { try { return localStorage.getItem(STORAGE_KEY) as MarketRegion | null; } catch { return null; } })();
    const confirmed = (() => { try { return localStorage.getItem(CONFIRMED_KEY) === 'true'; } catch { return false; } })();
    const fallback = detectedRegion || (confirmed ? saved : null) || 'africa';
    setRegion(fallback);
    setConfirmationRegion(null);
    setChooserOpen(false);
  }, [detected]);

  const resetMarket = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(CONFIRMED_KEY);
    try { sessionStorage.removeItem(DETECTED_VISITOR_KEY); } catch { /* storage is optional */ }
    setRegion('africa'); setDetected(null); setDetectionStatus('pending'); setConfirmationRegion(null); setChooserOpen(false); window.location.reload();
  }, []);

  const value = useMemo(() => ({ region, detected, detectionStatus, chooserOpen, confirmationRegion, setChooserOpen, selectRegion, confirmRegion, declineRegion, cancelRegionSelection, resetMarket, isSouthAfricanMarket: region === 'south-africa', fxRates }), [region, detected, detectionStatus, chooserOpen, confirmationRegion, selectRegion, confirmRegion, declineRegion, cancelRegionSelection, resetMarket, fxRates]);
  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

export function useMarket() { const value = useContext(MarketContext); if (!value) throw new Error('useMarket must be used within MarketProvider'); return value; }
