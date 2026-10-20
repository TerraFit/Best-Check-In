import { useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import { getRegionalPricing, convertZarToRegionalPrice, MARKETING_DOWNLOAD_MONTHLY_PRICE, MARKETING_DOWNLOAD_VOUCHER_PRICE } from '../config/pricing';
import { PACKAGE_IDS } from '../config/pricing-engine';

type FastCheckInPackage = (typeof PACKAGE_IDS)[number];

interface FastCheckInBrochureProps {
  onClose: () => void;
}

function currencySymbol(currency: string) {
  return currency === 'ZAR' ? 'R' : currency === 'EUR' ? '€' : '$';
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

/**
 * Applies the shared pricing engine to the existing brochure HTML without
 * changing the brochure's visual design. The HTML remains the visual source;
 * pricing is injected from the same regional pricing system used by the site.
 */
function applyRegionalPricing(doc: Document, region: Parameters<typeof getRegionalPricing>[0], southAfrican: boolean, fxRates: Parameters<typeof getRegionalPricing>[2]) {
  const pricing = getRegionalPricing(region, southAfrican, fxRates);
  const symbol = currencySymbol(pricing.currency);
  const zarPricing = getRegionalPricing('africa', true);

  const planCards = Array.from(doc.querySelectorAll<HTMLElement>('.pricing .plan'));
  planCards.slice(0, PACKAGE_IDS.length).forEach((card, index) => {
    const monthly = pricing.prices[index]?.monthly;
    const yearly = pricing.prices[index]?.yearly;
    if (monthly == null || yearly == null) return;
    const price = card.querySelector<HTMLElement>('.price');
    const per = card.querySelector<HTMLElement>('.per');
    if (price) price.textContent = `${index === 4 ? 'From ' : ''}${symbol}${formatPrice(monthly)}`;
    if (per) per.textContent = `per month · ${symbol}${formatPrice(yearly)} yearly`;
  });

  const replacements: Array<[RegExp, string]> = [];
  (PACKAGE_IDS as FastCheckInPackage[]).forEach((_, index) => {
    const zarMonthly = zarPricing.prices[index]?.monthly;
    const zarYearly = zarPricing.prices[index]?.yearly;
    const regionalMonthly = pricing.prices[index]?.monthly;
    const regionalYearly = pricing.prices[index]?.yearly;
    if (zarMonthly != null && regionalMonthly != null) replacements.push([new RegExp(`R\\s*${zarMonthly.toLocaleString('en-US').replace(/,/g, ',?')}`, 'g'), `${symbol}${formatPrice(regionalMonthly)}`]);
    if (zarYearly != null && regionalYearly != null) replacements.push([new RegExp(`R\\s*${zarYearly.toLocaleString('en-US').replace(/,/g, ',?')}`, 'g'), `${symbol}${formatPrice(regionalYearly)}`]);
  });

  const marketingMonthly = convertZarToRegionalPrice(MARKETING_DOWNLOAD_MONTHLY_PRICE, region, southAfrican, fxRates);
  const marketingVoucher = convertZarToRegionalPrice(MARKETING_DOWNLOAD_VOUCHER_PRICE, region, southAfrican, fxRates);
  replacements.push([/R\s*39\s*\/\s*month/gi, `${symbol}${formatPrice(marketingMonthly)}/month`]);
  replacements.push([/R\s*149\s+voucher/gi, `${symbol}${formatPrice(marketingVoucher)} voucher`]);

  const pricingRoot = doc.querySelector('.pricing')?.parentElement || doc.body;
  const walker = doc.createTreeWalker(pricingRoot, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) nodes.push(node as Text);
  nodes.forEach((textNode) => {
    let value = textNode.nodeValue || '';
    for (const [pattern, replacement] of replacements) value = value.replace(pattern, replacement);
    textNode.nodeValue = value;
  });

  doc.querySelectorAll<HTMLElement>('.utility-actions .utility-btn').forEach((button, index) => {
    if (index > 0) button.style.display = 'none';
  });

  const utilityLabel = doc.querySelector<HTMLElement>('.utility-label');
  if (utilityLabel) {
    const regionName = region === 'north-america' ? 'North America' : region.charAt(0).toUpperCase() + region.slice(1).replace('-', ' ');
    utilityLabel.textContent = `FastCheckIn · Product Brochure · ${southAfrican ? 'South Africa' : regionName} · ${symbol}`;
  }
}

export default function FastCheckInBrochure({ onClose }: FastCheckInBrochureProps) {
  const { region, isSouthAfricanMarket, fxRates } = useMarket();
  const [html, setHtml] = useState('');
  const [error, setError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setHtml('');
    setError(false);
    fetch('/FastCheckIn_Brochure.html', { cache: 'no-cache' })
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load brochure');
        return response.text();
      })
      .then((value) => {
        if (!cancelled) {
          const withBase = value.includes('<head')
            ? value.replace(/<head([^>]*)>/i, `<head$1><base href="${window.location.origin}/">`)
            : value;
          setHtml(withBase);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => { cancelled = true; };
  }, []);

  const applyPricing = () => {
    try {
      if (iframeRef.current?.contentDocument) applyRegionalPricing(iframeRef.current.contentDocument, region, isSouthAfricanMarket, fxRates);
    } catch {
      setError(true);
    }
  };

  useEffect(() => {
    if (html) applyPricing();
  }, [html, region, isSouthAfricanMarket, fxRates]);

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-stone-950/80 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="FastCheckIn brochure"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="relative flex h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="absolute right-3 top-3 z-20">
          <button type="button" onClick={onClose} aria-label="Close brochure" className="rounded-full bg-stone-950/80 p-2 text-white shadow-lg transition hover:bg-stone-950">
            <X className="h-5 w-5" />
          </button>
        </div>
        {error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <h2 className="text-xl font-bold text-stone-900">The brochure could not be displayed</h2>
            <p className="max-w-lg text-sm leading-6 text-stone-600">Please close this window and try again. If the problem continues, contact the FastCheckIn team.</p>
            <button type="button" onClick={onClose} className="rounded-xl bg-stone-950 px-5 py-3 font-bold text-amber-400 transition hover:bg-stone-800">Close</button>
          </div>
        ) : html ? (
          <iframe ref={iframeRef} title="FastCheckIn brochure" srcDoc={html} onLoad={applyPricing} className="min-h-0 flex-1 w-full border-0 bg-stone-100" />
        ) : (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-stone-600">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading brochure…
          </div>
        )}
        <div className="flex shrink-0 justify-end border-t border-stone-200 bg-white px-4 py-3">
          <button type="button" onClick={onClose} className="rounded-xl bg-stone-950 px-5 py-3 font-bold text-white transition hover:bg-stone-800">Close</button>
        </div>
      </div>
    </div>
  );
}
